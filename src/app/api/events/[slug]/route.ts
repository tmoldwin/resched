import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { events, participants } from "@/lib/db/schema";
import { parseSlots } from "@/lib/slots";
import { buildEventResponse } from "@/lib/event-response";
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

    const payload: EventResponse = buildEventResponse(
      event,
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        slots: parseSlots(row.slots),
        updatedAt: row.updatedAt.toISOString(),
      })),
      myParticipant,
    );

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
    if (!slug?.trim()) {
      return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    }

    const [event] = await getDb()
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (!event.id) {
      return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    }

    if (event.creatorId === userId) {
      const deleted = await getDb()
        .delete(events)
        .where(
          and(
            eq(events.id, event.id),
            eq(events.slug, slug),
            eq(events.creatorId, userId),
          ),
        )
        .returning({ id: events.id });

      if (deleted.length !== 1) {
        return NextResponse.json({ error: "Could not delete event." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, deleted: "event" });
    }

    const removed = await getDb()
      .delete(participants)
      .where(
        and(
          eq(participants.eventId, event.id),
          eq(participants.userId, userId),
        ),
      )
      .returning({ id: participants.id });

    if (removed.length !== 1) {
      return NextResponse.json(
        { error: "You do not have a saved response for this event." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, deleted: "response" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not delete event." }, { status: 500 });
  }
}
