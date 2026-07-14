import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const participants = sqliteTable("participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  name: text("name").notNull(),
  birthDate: text("birth_date").notNull(),
});

export const programs = sqliteTable("programs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  visible: integer("visible", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const sections = sqliteTable("sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  programId: integer("program_id")
    .notNull()
    .references(() => programs.id),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  waitlistCapacity: integer("waitlist_capacity").notNull(),
  price: integer("price").notNull(), // cents, base price per participant pre-discount
  visible: integer("visible", { mode: "boolean" }).notNull().default(false),
  enrollmentOpenAt: text("enrollment_open_at").notNull(),
  runStartDate: text("run_start_date").notNull(),
  runEndDate: text("run_end_date").notNull(),
  daysOfWeek: text("days_of_week", { mode: "json" }).$type<number[]>().notNull(),
  startTime: text("start_time").notNull(), // "HH:MM"
  endTime: text("end_time").notNull(), // "HH:MM"
});

export const eligibilityRules = sqliteTable("eligibility_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sectionId: integer("section_id")
    .notNull()
    .references(() => sections.id),
  type: text("type").notNull(), // only "age_range" implemented in v0
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const discounts = sqliteTable("discounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sectionId: integer("section_id")
    .notNull()
    .references(() => sections.id),
  type: text("type").notNull(), // e.g. "household_multi_enrollment"
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const enrollments = sqliteTable("enrollments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sectionId: integer("section_id")
    .notNull()
    .references(() => sections.id),
  participantId: integer("participant_id")
    .notNull()
    .references(() => participants.id),
  status: text("status", { enum: ["enrolled", "waitlisted", "cancelled"] }).notNull(),
  position: integer("position"), // waitlist order; null when enrolled/cancelled
  priceCharged: integer("price_charged"), // cents; null until charged
  discountId: integer("discount_id").references(() => discounts.id),
  createdAt: text("created_at").notNull(),
});
