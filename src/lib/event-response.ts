import {
  parseScheduleConfig,
  resolveEventDates,
  type ScheduleMode,
} from "@/lib/schedule";
import type { EventResponse, MyParticipantResponse } from "@/lib/types";

type DbEvent = {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  scheduleMode: string;
  dates: string;
  scheduleConfig: string | null;
  dayStartMinutes: number;
  dayEndMinutes: number;
  timezone: string;
  slotMinutes: number;
  passwordHash: string | null;
};

export function buildEventResponse(
  event: DbEvent,
  participants: EventResponse["participants"],
  myParticipant: MyParticipantResponse | null,
): EventResponse {
  const dates = resolveEventDates(event);
  const scheduleConfig = parseScheduleConfig(event.scheduleConfig);

  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    scheduleMode: event.scheduleMode as ScheduleMode,
    dates,
    scheduleConfig,
    dayStartMinutes: event.dayStartMinutes,
    dayEndMinutes: event.dayEndMinutes,
    timezone: event.timezone,
    slotMinutes: event.slotMinutes,
    locked: Boolean(event.passwordHash),
    participants,
    myParticipant,
  };
}

export function resolvedDatesForDbEvent(event: DbEvent): string[] {
  return resolveEventDates(event);
}
