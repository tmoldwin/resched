import { pgTable, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  scheduleMode: text("schedule_mode").notNull().default("range"),
  dates: text("dates").notNull().default("[]"),
  scheduleConfig: text("schedule_config"),
  dayStartMinutes: integer("day_start_minutes").notNull(),
  dayEndMinutes: integer("day_end_minutes").notNull(),
  timezone: text("timezone").notNull(),
  slotMinutes: integer("slot_minutes").notNull().default(15),
  passwordHash: text("password_hash"),
  creatorId: text("creator_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const participants = pgTable(
  "participants",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    editToken: text("edit_token").notNull().unique(),
    slots: text("slots").notNull().default("[]"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("participants_event_user_idx").on(table.eventId, table.userId),
  ],
);
