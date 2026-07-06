import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import type { CreateEventPayload } from "@/lib/types";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `${base || "event"}-${nanoid(8)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateEventPayload;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Event name is required." }, { status: 400 });
    }

    if (!body.startDate || !body.endDate || body.startDate > body.endDate) {
      return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
    }

    if (body.dayStartMinutes >= body.dayEndMinutes) {
      return NextResponse.json({ error: "Invalid time range." }, { status: 400 });
    }

    const id = nanoid(12);
    const slug = slugify(body.name.trim());
    const timezone =
      body.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC";

    const creatorId = await getSessionUserId();

    let passwordHash: string | null = null;
    if (body.password?.trim()) {
      passwordHash = hashPassword(body.password.trim());
    } else if (body.cloneFromSlug) {
      const [source] = await getDb()
        .select({ passwordHash: events.passwordHash })
        .from(events)
        .where(eq(events.slug, body.cloneFromSlug))
        .limit(1);
      passwordHash = source?.passwordHash ?? null;
    }

    await getDb().insert(events).values({
      id,
      slug,
      name: body.name.trim(),
      startDate: body.startDate,
      endDate: body.endDate,
      dayStartMinutes: body.dayStartMinutes,
      dayEndMinutes: body.dayEndMinutes,
      timezone,
      slotMinutes: 15,
      passwordHash,
      creatorId,
    });

    return NextResponse.json({ slug });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not create event. Check database configuration." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
