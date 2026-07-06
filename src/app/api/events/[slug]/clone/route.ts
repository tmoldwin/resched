import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getSessionUserId } from "@/lib/auth";
import { addDays, daySpan, todayString } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `${base || "event"}-${nanoid(8)}`;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { slug } = await context.params;

    const [source] = await getDb()
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    if (!source) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const span = daySpan(source.startDate, source.endDate);
    const startDate = todayString();
    const endDate = addDays(startDate, span);

    const id = nanoid(12);
    const newSlug = slugify(source.name);

    await getDb().insert(events).values({
      id,
      slug: newSlug,
      name: source.name,
      startDate,
      endDate,
      dayStartMinutes: source.dayStartMinutes,
      dayEndMinutes: source.dayEndMinutes,
      timezone: source.timezone,
      slotMinutes: source.slotMinutes,
      passwordHash: source.passwordHash,
      creatorId: userId,
    });

    return NextResponse.json({ slug: newSlug });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not clone event." }, { status: 500 });
  }
}
