import { NextResponse } from "next/server";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { events, participants } from "@/lib/db/schema";
import { todayString } from "@/lib/dates";
import type { UserEventsResponse } from "@/lib/types";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const db = getDb();

    const today = todayString();

    const createdRows = await db
      .select({
        id: events.id,
        slug: events.slug,
        name: events.name,
        startDate: events.startDate,
        endDate: events.endDate,
        updatedAt: events.createdAt,
      })
      .from(events)
      .where(eq(events.creatorId, userId))
      .orderBy(sql`${events.createdAt} desc`);

    const pastAttendingRows = await db
      .select({
        participantId: participants.id,
      })
      .from(participants)
      .innerJoin(events, eq(participants.eventId, events.id))
      .where(and(eq(participants.userId, userId), lt(events.endDate, today)));

    if (pastAttendingRows.length > 0) {
      await db
        .delete(participants)
        .where(
          inArray(
            participants.id,
            pastAttendingRows.map((row) => row.participantId),
          ),
        );
    }

    const attendingRows = await db
      .select({
        id: events.id,
        slug: events.slug,
        name: events.name,
        startDate: events.startDate,
        endDate: events.endDate,
        updatedAt: participants.updatedAt,
      })
      .from(participants)
      .innerJoin(events, eq(participants.eventId, events.id))
      .where(and(eq(participants.userId, userId), gte(events.endDate, today)))
      .orderBy(sql`${participants.updatedAt} desc`);

    const allEventIds = [
      ...new Set([
        ...createdRows.map((row) => row.id),
        ...attendingRows.map((row) => row.id),
      ]),
    ];

    const counts = new Map<string, number>();
    if (allEventIds.length > 0) {
      const countRows = await db
        .select({
          eventId: participants.eventId,
          count: sql<number>`count(*)::int`,
        })
        .from(participants)
        .where(inArray(participants.eventId, allEventIds))
        .groupBy(participants.eventId);

      for (const row of countRows) {
        counts.set(row.eventId, row.count);
      }
    }

    const payload: UserEventsResponse = {
      createdUpcoming: createdRows
        .filter((row) => row.endDate >= today)
        .map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          startDate: row.startDate,
          endDate: row.endDate,
          role: "creator" as const,
          participantCount: counts.get(row.id) ?? 0,
          updatedAt: row.updatedAt.toISOString(),
        })),
      createdArchived: createdRows
        .filter((row) => row.endDate < today)
        .map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          startDate: row.startDate,
          endDate: row.endDate,
          role: "creator" as const,
          participantCount: counts.get(row.id) ?? 0,
          updatedAt: row.updatedAt.toISOString(),
        })),
      attending: attendingRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
        role: "attendee" as const,
        participantCount: counts.get(row.id) ?? 0,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load events." }, { status: 500 });
  }
}
