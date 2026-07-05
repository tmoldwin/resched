import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load event." }, { status: 500 });
  }
}
