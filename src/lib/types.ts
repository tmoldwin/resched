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
  dayStartMinutes: number;
  dayEndMinutes: number;
  timezone: string;
  slotMinutes: number;
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
