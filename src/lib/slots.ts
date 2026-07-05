export type DayColumn = {
  date: string;
  label: string;
  shortLabel: string;
};

export type SlotGridMeta = {
  days: DayColumn[];
  slotsPerDay: number;
  totalSlots: number;
  timeLabels: string[];
};

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

export function formatMinutes24(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours24).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function slotStartMinutes(
  dayStartMinutes: number,
  slotInDay: number,
  slotMinutes: number,
): number {
  return dayStartMinutes + slotInDay * slotMinutes;
}

export function isHourBoundary(minutes: number): boolean {
  return minutes % 60 === 0;
}

export function isHalfHourBoundary(minutes: number): boolean {
  return minutes % 30 === 0 && minutes % 60 !== 0;
}

export function rowBorderColor(minutes: number): string {
  if (isHourBoundary(minutes)) return "#a1a1aa";
  if (isHalfHourBoundary(minutes)) return "#d4d4d8";
  return "#e4e4e7";
}

export function enumerateDays(startDate: string, endDate: string): DayColumn[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const days: DayColumn[] = [];

  for (
    let current = new Date(start);
    current <= end;
    current.setDate(current.getDate() + 1)
  ) {
    const date = formatDate(current);
    days.push({
      date,
      label: current.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      shortLabel: current.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
      }),
    });
  }

  return days;
}

export function buildSlotGrid(
  startDate: string,
  endDate: string,
  dayStartMinutes: number,
  dayEndMinutes: number,
  slotMinutes: number,
): SlotGridMeta {
  const days = enumerateDays(startDate, endDate);
  const slotsPerDay = (dayEndMinutes - dayStartMinutes) / slotMinutes;
  const timeLabels = Array.from({ length: slotsPerDay }, (_, index) => {
    const start = slotStartMinutes(dayStartMinutes, index, slotMinutes);
    return isHourBoundary(start) ? formatMinutes24(start) : "";
  });

  return {
    days,
    slotsPerDay,
    totalSlots: days.length * slotsPerDay,
    timeLabels,
  };
}

export function slotIndex(
  dayIndex: number,
  slotInDay: number,
  slotsPerDay: number,
): number {
  return dayIndex * slotsPerDay + slotInDay;
}

export function parseSlots(raw: string): boolean[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Boolean);
  } catch {
    return [];
  }
}

export function serializeSlots(slots: boolean[]): string {
  return JSON.stringify(slots);
}

export function normalizeSlots(slots: boolean[], totalSlots: number): boolean[] {
  const next = slots.slice(0, totalSlots);
  while (next.length < totalSlots) next.push(false);
  return next;
}

export function countAvailable(slots: boolean[]): number {
  return slots.filter(Boolean).length;
}
