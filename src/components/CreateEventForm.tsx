"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, daySpan, todayString } from "@/lib/dates";
import { markLocallyCreated } from "@/lib/event-claims";
import {
  defaultMonthWindow,
  formatScheduleSummary,
  generateEventDates,
  WEEKDAY_OPTIONS,
  type ScheduleMode,
} from "@/lib/schedule";
import type { EventResponse } from "@/lib/types";

function timeToMinutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function toggleInList(values: number[], value: number) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

type CreateEventFormProps = {
  cloneSlug?: string;
};

export default function CreateEventForm({ cloneSlug }: CreateEventFormProps) {
  const router = useRouter();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startDefault = todayString();

  const [name, setName] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("range");
  const [startDate, setStartDate] = useState(startDefault);
  const [endDate, setEndDate] = useState(addDays(startDefault, 6));
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [monthDays, setMonthDays] = useState<number[]>([1, 15]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(Boolean(cloneSlug));
  const [error, setError] = useState("");
  const [clonedFrom, setClonedFrom] = useState<string | null>(null);
  const [cloneHasPassword, setCloneHasPassword] = useState(false);

  useEffect(() => {
    if (!cloneSlug) return;

    async function loadCloneSource() {
      setPrefillLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/events/${cloneSlug}`, { cache: "no-store" });
        const data = (await response.json()) as EventResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Could not load event to clone.");
        }

        const start = todayString();
        const mode = data.scheduleMode ?? "range";

        setName(data.name);
        setScheduleMode(mode);
        setStartDate(start);
        setEndDate(
          mode === "monthdays"
            ? defaultMonthWindow(start)
            : addDays(start, Math.max(daySpan(data.startDate, data.endDate), 6)),
        );
        setStartTime(minutesToTime(data.dayStartMinutes));
        setEndTime(minutesToTime(data.dayEndMinutes));
        setClonedFrom(data.name);
        setCloneHasPassword(data.locked);

        if (data.scheduleConfig && "weekdays" in data.scheduleConfig) {
          setWeekdays(data.scheduleConfig.weekdays);
        }

        if (data.scheduleConfig && "monthDays" in data.scheduleConfig) {
          setMonthDays(data.scheduleConfig.monthDays);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load event to clone.",
        );
      } finally {
        setPrefillLoading(false);
      }
    }

    void loadCloneSource();
  }, [cloneSlug]);

  const scheduleConfig = useMemo(() => {
    if (scheduleMode === "weekdays") {
      return { weekdays };
    }
    if (scheduleMode === "monthdays") {
      return { monthDays };
    }
    return null;
  }, [monthDays, scheduleMode, weekdays]);

  const resolvedDates = useMemo(
    () => generateEventDates(scheduleMode, startDate, endDate, scheduleConfig),
    [endDate, scheduleConfig, scheduleMode, startDate],
  );

  const previewRange = useMemo(() => {
    const schedule = formatScheduleSummary({
      mode: scheduleMode,
      startDate,
      endDate,
      dates: resolvedDates,
      config: scheduleConfig,
    });
    return `${schedule}, ${startTime}–${endTime}`;
  }, [
    endDate,
    endTime,
    resolvedDates,
    scheduleConfig,
    scheduleMode,
    startDate,
    startTime,
  ]);

  function handleModeChange(mode: ScheduleMode) {
    setScheduleMode(mode);
    if (mode === "monthdays" && endDate < addDays(startDate, 27)) {
      setEndDate(defaultMonthWindow(startDate));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (scheduleMode === "weekdays" && weekdays.length === 0) {
      setError("Select at least one day of the week.");
      setLoading(false);
      return;
    }

    if (scheduleMode === "monthdays" && monthDays.length === 0) {
      setError("Select at least one day of the month.");
      setLoading(false);
      return;
    }

    if (resolvedDates.length === 0) {
      setError("No dates match this schedule in the selected window.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          scheduleMode,
          weekdays: scheduleMode === "weekdays" ? weekdays : undefined,
          monthDays: scheduleMode === "monthdays" ? monthDays : undefined,
          dayStartMinutes: timeToMinutes(startTime),
          dayEndMinutes: timeToMinutes(endTime),
          timezone,
          password: password.trim() || undefined,
          cloneFromSlug: cloneSlug,
        }),
      });

      const data = (await response.json()) as { slug?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not create event.");
      }

      if (data.slug) {
        markLocallyCreated(data.slug);
      }

      router.push(`/e/${data.slug}/join`);
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

  if (prefillLoading) {
    return (
      <div className="card">
        <p className="text-sm text-zinc-500">Loading event settings…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {clonedFrom ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          Cloned from <span className="font-medium text-zinc-800">{clonedFrom}</span>.
          {cloneHasPassword
            ? " Password copied from the original."
            : " No password on the original."}
        </p>
      ) : null}

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
          className="field-input"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-800">Schedule type</p>
        <div className="segmented-3" role="tablist" aria-label="Schedule type">
          {(
            [
              ["range", "Date range"],
              ["weekdays", "Days of week"],
              ["monthdays", "Days of month"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={scheduleMode === mode}
              onClick={() => handleModeChange(mode)}
              className={`segmented-item ${
                scheduleMode === mode
                  ? "segmented-item-active"
                  : "segmented-item-inactive"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {scheduleMode === "range" ? (
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
              className="field-input"
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
              className="field-input"
            />
          </div>
        </div>
      ) : null}

      {scheduleMode === "weekdays" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-800">Repeat on</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((option) => {
                const active = weekdays.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setWeekdays((current) => toggleInList(current, option.value))
                    }
                    className={`chip-toggle min-w-12 ${active ? "chip-toggle-active" : ""}`}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-800" htmlFor="weekday-start">
                From
              </label>
              <input
                id="weekday-start"
                type="date"
                required
                value={startDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setStartDate(value);
                  if (value > endDate) setEndDate(value);
                }}
                className="field-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-800" htmlFor="weekday-end">
                Until
              </label>
              <input
                id="weekday-end"
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="field-input"
              />
            </div>
          </div>
        </div>
      ) : null}

      {scheduleMode === "monthdays" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-800">Repeat on day</p>
            <div className="chip-grid">
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                const active = monthDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setMonthDays((current) => toggleInList(current, day))
                    }
                    className={`chip-toggle px-0 ${active ? "chip-toggle-active" : ""}`}
                    aria-pressed={active}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-800" htmlFor="monthday-start">
                From
              </label>
              <input
                id="monthday-start"
                type="date"
                required
                value={startDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setStartDate(value);
                  if (value > endDate) setEndDate(defaultMonthWindow(value));
                }}
                className="field-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-800" htmlFor="monthday-end">
                Until
              </label>
              <input
                id="monthday-end"
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="field-input"
              />
            </div>
          </div>
        </div>
      ) : null}

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
            className="field-input"
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
            className="field-input"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-800" htmlFor="password">
          Password{" "}
          <span className="font-normal text-zinc-500">
            {cloneSlug && cloneHasPassword
              ? "(optional — overrides cloned password)"
              : "(optional)"}
          </span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field-input"
        />
      </div>

      <p className="text-sm text-zinc-500">
        {previewRange} · {timezone}
      </p>

      {error ? <p className="notice-error">{error}</p> : null}

      <div className="form-submit">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating…" : "Create event"}
        </button>
      </div>
    </form>
  );
}
