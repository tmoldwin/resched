import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { events, participants } from "@/lib/db/schema";
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = (await request.json()) as ParticipantPayload;

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

    if (body.editToken) {
      const [existing] = await getDb()
        .select()
        .from(participants)
        .where(eq(participants.editToken, body.editToken))
        .limit(1);

      if (!existing || existing.eventId !== event.id) {
        return NextResponse.json({ error: "Invalid edit token." }, { status: 403 });
      }

      const nextName = body.name?.trim() || existing.name;
      const nextSlots = body.slots
        ? normalizeSlots(body.slots, grid.totalSlots)
        : parseSlots(existing.slots);

      await getDb()
        .update(participants)
        .set({
          name: nextName,
          slots: serializeSlots(nextSlots),
          updatedAt: new Date(),
        })
        .where(eq(participants.id, existing.id));

      return NextResponse.json({
        id: existing.id,
        name: nextName,
        editToken: existing.editToken,
        slots: nextSlots,
      });
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const id = nanoid(12);
    const editToken = nanoid(24);
    const slots = normalizeSlots(body.slots ?? [], grid.totalSlots);

    await getDb().insert(participants).values({
      id,
      eventId: event.id,
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
