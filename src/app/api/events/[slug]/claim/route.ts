import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
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
      .select({ id: events.id, creatorId: events.creatorId })
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.creatorId === userId) {
      return NextResponse.json({ ok: true, claimed: false });
    }

    if (event.creatorId && event.creatorId !== userId) {
      return NextResponse.json(
        { error: "This event already belongs to another account." },
        { status: 403 },
      );
    }

    const [claimed] = await getDb()
      .update(events)
      .set({ creatorId: userId })
      .where(and(eq(events.id, event.id), isNull(events.creatorId)))
      .returning({ id: events.id });

    if (!claimed) {
      return NextResponse.json(
        { error: "Could not claim this event." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, claimed: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not claim event." }, { status: 500 });
  }
}
