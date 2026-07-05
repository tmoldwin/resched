export type ParticipantResponse = {
  id: string;
  name: string;
  slots: boolean[];
  updatedAt: string;
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
};
