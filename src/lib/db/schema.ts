import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  dayStartMinutes: integer("day_start_minutes").notNull(),
  dayEndMinutes: integer("day_end_minutes").notNull(),
  timezone: text("timezone").notNull(),
  slotMinutes: integer("slot_minutes").notNull().default(15),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  editToken: text("edit_token").notNull().unique(),
  slots: text("slots").notNull().default("[]"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
