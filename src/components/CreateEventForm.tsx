"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const SLOT_OPTIONS = [15, 30, 60] as const;

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

export default function CreateEventForm() {
  const router = useRouter();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startDefault = todayString();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(startDefault);
  const [endDate, setEndDate] = useState(addDays(startDefault, 6));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState<(typeof SLOT_OPTIONS)[number]>(15);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewRange = useMemo(() => {
    return `${startDate} → ${endDate} · ${startTime}–${endTime}`;
  }, [startDate, endDate, startTime, endTime]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          dayStartMinutes: timeToMinutes(startTime),
          dayEndMinutes: timeToMinutes(endTime),
          timezone,
          slotMinutes,
          password: password.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { slug?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not create event.");
      }

      router.push(`/e/${data.slug}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create event.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700" htmlFor="name">
          Event name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Team sync, dinner plans, study group..."
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base outline-none ring-emerald-500 transition focus:bg-white focus:ring-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700" htmlFor="startDate">
            Start date
          </label>
          <input
            id="startDate"
            type="date"
            required
            value={startDate}
            onChange={(event) => {
              const value = event.target.value;
              setStartDate(value);
              if (value > endDate) setEndDate(value);
            }}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none ring-emerald-500 transition focus:bg-white focus:ring-2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700" htmlFor="endDate">
            End date
          </label>
          <input
            id="endDate"
            type="date"
            required
            min={startDate}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none ring-emerald-500 transition focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700" htmlFor="startTime">
            Daily start
          </label>
          <input
            id="startTime"
            type="time"
            required
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none ring-emerald-500 transition focus:bg-white focus:ring-2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700" htmlFor="endTime">
            Daily end
          </label>
          <input
            id="endTime"
            type="time"
            required
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none ring-emerald-500 transition focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-zinc-700">Time slot size</span>
        <div className="grid grid-cols-3 gap-2">
          {SLOT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSlotMinutes(option)}
              className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                slotMinutes === option
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {option} min
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700" htmlFor="password">
          Password (optional)
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Keep the event private"
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none ring-emerald-500 transition focus:bg-white focus:ring-2"
        />
      </div>

      <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        <div className="font-medium text-zinc-800">Preview</div>
        <div>{previewRange}</div>
        <div>Timezone: {timezone}</div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create event"}
      </button>
    </form>
  );
}
