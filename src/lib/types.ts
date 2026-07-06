export type ScheduleMode = "range" | "weekdays" | "monthdays";

export type ScheduleConfig =
  | { weekdays: number[] }
  | { monthDays: number[] };

export type ParticipantResponse = {
  id: string;
  name: string;
  slots: boolean[];
  updatedAt: string;
};

export type MyParticipantResponse = ParticipantResponse & {
  editToken: string;
};

export type EventResponse = {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  scheduleMode: ScheduleMode;
  dates: string[];
  scheduleConfig?: ScheduleConfig | null;
  dayStartMinutes: number;
  dayEndMinutes: number;
  timezone: string;
  slotMinutes: number;
  locked: boolean;
  participants: ParticipantResponse[];
  myParticipant?: MyParticipantResponse | null;
};

export type CreateEventPayload = {
  name: string;
  startDate: string;
  endDate: string;
  scheduleMode?: ScheduleMode;
  weekdays?: number[];
  monthDays?: number[];
  dayStartMinutes: number;
  dayEndMinutes: number;
  timezone: string;
  password?: string;
  cloneFromSlug?: string;
};

export type UserEventSummary = {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  role: "creator" | "attendee";
  participantCount: number;
  updatedAt: string;
};

export type UserEventsResponse = {
  created: UserEventSummary[];
  attending: UserEventSummary[];
};
