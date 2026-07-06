import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { events, participants, users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";
import {
  buildSlotGrid,
  normalizeSlots,
  parseSlots,
  serializeSlots,
} from "@/lib/slots";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type ParticipantPayload = {
  name?: string;
  slots?: boolean[];
  editToken?: string;
  password?: string;
};

async function getLinkedUserName(userId: string) {
  const [user] = await getDb()
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.name ?? null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = (await request.json()) as ParticipantPayload;
    const userId = await getSessionUserId();

    const [event] = await getDb()
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.passwordHash) {
      if (!body.password || !verifyPassword(body.password, event.passwordHash)) {
        return NextResponse.json({ error: "Invalid password." }, { status: 401 });
      }
    }

    const grid = buildSlotGrid(
      event.startDate,
      event.endDate,
      event.dayStartMinutes,
      event.dayEndMinutes,
      event.slotMinutes,
    );

    if (userId) {
      const [existingByUser] = await getDb()
        .select()
        .from(participants)
        .where(
          and(eq(participants.eventId, event.id), eq(participants.userId, userId)),
        )
        .limit(1);

      if (existingByUser) {
        const linkedName = (await getLinkedUserName(userId)) ?? existingByUser.name;
        const nextSlots = body.slots
          ? normalizeSlots(body.slots, grid.totalSlots)
          : parseSlots(existingByUser.slots);

        await getDb()
          .update(participants)
          .set({
            name: linkedName,
            slots: serializeSlots(nextSlots),
            updatedAt: new Date(),
          })
          .where(eq(participants.id, existingByUser.id));

        return NextResponse.json({
          id: existingByUser.id,
          name: linkedName,
          editToken: existingByUser.editToken,
          slots: nextSlots,
        });
      }
    }

    if (body.editToken) {
      const [existing] = await getDb()
        .select()
        .from(participants)
        .where(eq(participants.editToken, body.editToken))
        .limit(1);

      if (!existing || existing.eventId !== event.id) {
        return NextResponse.json({ error: "Invalid edit token." }, { status: 403 });
      }

      const linkedName = userId
        ? ((await getLinkedUserName(userId)) ?? existing.name)
        : body.name?.trim() || existing.name;
      const nextSlots = body.slots
        ? normalizeSlots(body.slots, grid.totalSlots)
        : parseSlots(existing.slots);

      await getDb()
        .update(participants)
        .set({
          name: linkedName,
          slots: serializeSlots(nextSlots),
          userId: userId ?? existing.userId,
          updatedAt: new Date(),
        })
        .where(eq(participants.id, existing.id));

      return NextResponse.json({
        id: existing.id,
        name: linkedName,
        editToken: existing.editToken,
        slots: nextSlots,
      });
    }

    const name = userId
      ? await getLinkedUserName(userId)
      : body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const id = nanoid(12);
    const editToken = nanoid(24);
    const slots = normalizeSlots(body.slots ?? [], grid.totalSlots);

    await getDb().insert(participants).values({
      id,
      eventId: event.id,
      userId,
      name,
      editToken,
      slots: serializeSlots(slots),
    });

    return NextResponse.json({
      id,
      name,
      editToken,
      slots,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not save availability." },
      { status: 500 },
    );
  }
}
