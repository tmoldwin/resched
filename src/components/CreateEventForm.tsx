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
    return `${startDate} to ${endDate}, ${startTime}–${endTime}`;
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
      className="max-w-lg space-y-5 rounded-lg border border-zinc-200 p-5 sm:p-6"
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-800" htmlFor="name">
          Event name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Team sync"
          className="w-full rounded-md border border-zinc-200 px-3 py-2.5 outline-none ring-zinc-900/10 focus:border-zinc-400 focus:ring-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-800" htmlFor="startDate">
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
            className="w-full rounded-md border border-zinc-200 px-3 py-2.5 outline-none ring-zinc-900/10 focus:border-zinc-400 focus:ring-2"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-800" htmlFor="endDate">
            End date
          </label>
          <input
            id="endDate"
            type="date"
            required
            min={startDate}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2.5 outline-none ring-zinc-900/10 focus:border-zinc-400 focus:ring-2"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-800" htmlFor="startTime">
            Daily start
          </label>
          <input
            id="startTime"
            type="time"
            required
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2.5 outline-none ring-zinc-900/10 focus:border-zinc-400 focus:ring-2"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-800" htmlFor="endTime">
            Daily end
          </label>
          <input
            id="endTime"
            type="time"
            required
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2.5 outline-none ring-zinc-900/10 focus:border-zinc-400 focus:ring-2"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-zinc-800">Slot size</span>
        <div className="grid grid-cols-3 gap-2">
          {SLOT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSlotMinutes(option)}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                slotMinutes === option
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {option} min
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-800" htmlFor="password">
          Password <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-zinc-200 px-3 py-2.5 outline-none ring-zinc-900/10 focus:border-zinc-400 focus:ring-2"
        />
      </div>

      <p className="text-sm text-zinc-500">
        {previewRange} · {timezone}
      </p>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create event"}
      </button>
    </form>
  );
}
