import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
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

    const slotMinutes = body.slotMinutes || 15;
    if (![15, 30, 60].includes(slotMinutes)) {
      return NextResponse.json({ error: "Slot size must be 15, 30, or 60 minutes." }, { status: 400 });
    }

    const id = nanoid(12);
    const slug = slugify(body.name.trim());
    const timezone =
      body.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC";

    await getDb().insert(events).values({
      id,
      slug,
      name: body.name.trim(),
      startDate: body.startDate,
      endDate: body.endDate,
      dayStartMinutes: body.dayStartMinutes,
      dayEndMinutes: body.dayEndMinutes,
      timezone,
      slotMinutes,
      passwordHash: body.password?.trim()
        ? hashPassword(body.password.trim())
        : null,
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
