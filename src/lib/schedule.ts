import { addDays } from "@/lib/dates";

export type ScheduleMode = "range" | "weekdays" | "monthdays";

export type WeekdayScheduleConfig = {
  weekdays: number[];
};

export type MonthDaysScheduleConfig = {
  monthDays: number[];
};

export type ScheduleConfig = WeekdayScheduleConfig | MonthDaysScheduleConfig;

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function enumerateDateStrings(startDate: string, endDate: string): string[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const dates: string[] = [];

  for (
    let current = new Date(start);
    current <= end;
    current.setDate(current.getDate() + 1)
  ) {
    dates.push(formatDate(current));
  }

  return dates;
}

export function parseScheduleConfig(
  raw: string | null | undefined,
): ScheduleConfig | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      weekdays?: unknown;
      monthDays?: unknown;
    };
    if (Array.isArray(parsed.weekdays)) {
      return {
        weekdays: parsed.weekdays.filter(
          (day): day is number => Number.isInteger(day),
        ),
      };
    }
    if (Array.isArray(parsed.monthDays)) {
      return {
        monthDays: parsed.monthDays.filter(
          (day): day is number =>
            Number.isInteger(day) && day >= 1 && day <= 31,
        ),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function parseStoredDates(raw: string | null | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function generateEventDates(
  mode: ScheduleMode,
  startDate: string,
  endDate: string,
  config?: ScheduleConfig | null,
): string[] {
  if (!startDate || !endDate || startDate > endDate) return [];

  if (mode === "range") {
    return enumerateDateStrings(startDate, endDate);
  }

  if (mode === "weekdays") {
    const weekdays =
      config && "weekdays" in config
        ? new Set(config.weekdays)
        : new Set<number>();
    if (weekdays.size === 0) return [];

    return enumerateDateStrings(startDate, endDate).filter((date) =>
      weekdays.has(parseDate(date).getDay()),
    );
  }

  const monthDays =
    config && "monthDays" in config ? new Set(config.monthDays) : new Set<number>();
  if (monthDays.size === 0) return [];

  return enumerateDateStrings(startDate, endDate).filter((date) =>
    monthDays.has(parseDate(date).getDate()),
  );
}

export function resolveEventDates(event: {
  startDate: string;
  endDate: string;
  scheduleMode: string;
  dates: string;
  scheduleConfig: string | null;
}): string[] {
  const stored = parseStoredDates(event.dates);
  if (stored.length > 0) return stored;

  return generateEventDates(
    event.scheduleMode as ScheduleMode,
    event.startDate,
    event.endDate,
    parseScheduleConfig(event.scheduleConfig),
  );
}

export function serializeScheduleConfig(
  mode: ScheduleMode,
  config?: ScheduleConfig | null,
): string | null {
  if (mode === "range" || !config) return null;
  return JSON.stringify(config);
}

export function serializeEventDates(dates: string[]): string {
  return JSON.stringify(dates);
}

function weekdayLabels(weekdays: number[]): string {
  const labels = new Map<number, string>(
    WEEKDAY_OPTIONS.map((option) => [option.value, option.label]),
  );
  return weekdays
    .slice()
    .sort((a, b) => {
      const order = (day: number) => (day === 0 ? 7 : day);
      return order(a) - order(b);
    })
    .map((day) => labels.get(day) ?? "")
    .filter(Boolean)
    .join(", ");
}

function monthDayLabels(monthDays: number[]): string {
  return monthDays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => {
      const mod100 = day % 100;
      const mod10 = day % 10;
      if (mod10 === 1 && mod100 !== 11) return `${day}st`;
      if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
      if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
      return `${day}th`;
    })
    .join(", ");
}

export function formatScheduleSummary(options: {
  mode: ScheduleMode;
  startDate: string;
  endDate: string;
  dates: string[];
  config?: ScheduleConfig | null;
}): string {
  const count = options.dates.length;
  const countLabel = `${count} day${count === 1 ? "" : "s"}`;
  const windowLabel = `${options.startDate} to ${options.endDate}`;

  if (options.mode === "weekdays" && options.config && "weekdays" in options.config) {
    return `${weekdayLabels(options.config.weekdays)} · ${windowLabel} · ${countLabel}`;
  }

  if (options.mode === "monthdays" && options.config && "monthDays" in options.config) {
    return `${monthDayLabels(options.config.monthDays)} · ${windowLabel} · ${countLabel}`;
  }

  if (options.mode === "range") {
    return `${windowLabel} · ${countLabel}`;
  }

  return `${windowLabel} · ${countLabel}`;
}

export function defaultMonthWindow(startDate: string) {
  return addDays(startDate, 90);
}
