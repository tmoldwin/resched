import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { events, participants } from "@/lib/db/schema";
import { parseSlots } from "@/lib/slots";
import type { EventResponse } from "@/lib/types";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const userId = await getSessionUserId();

    const [event] = await getDb()
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const rows = await getDb()
      .select()
      .from(participants)
      .where(eq(participants.eventId, event.id))
      .orderBy(participants.updatedAt);

    let myParticipant: EventResponse["myParticipant"] = null;
    if (userId) {
      const mine = rows.find((row) => row.userId === userId);
      if (mine) {
        myParticipant = {
          id: mine.id,
          name: mine.name,
          slots: parseSlots(mine.slots),
          editToken: mine.editToken,
          updatedAt: mine.updatedAt.toISOString(),
        };
      }
    }

    const payload: EventResponse = {
      id: event.id,
      slug: event.slug,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      dayStartMinutes: event.dayStartMinutes,
      dayEndMinutes: event.dayEndMinutes,
      timezone: event.timezone,
      slotMinutes: event.slotMinutes,
      locked: Boolean(event.passwordHash),
      participants: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slots: parseSlots(row.slots),
        updatedAt: row.updatedAt.toISOString(),
      })),
      myParticipant,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load event." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { slug } = await context.params;

    const [event] = await getDb()
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.creatorId !== userId) {
      return NextResponse.json({ error: "Only the creator can delete this event." }, { status: 403 });
    }

    await getDb().delete(events).where(eq(events.id, event.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not delete event." }, { status: 500 });
  }
}
