import type {
  accounts,
  participants,
  programs,
  sections,
  eligibilityRules,
  discounts,
  enrollments,
} from "../api/db/schema";

// Type-only re-exports (erased at build time) so src/web can share entity
// shapes with src/api without bundling drizzle-orm/better-sqlite3 runtime code.

export type Account = typeof accounts.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type EligibilityRule = typeof eligibilityRules.$inferSelect;
export type Discount = typeof discounts.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;

// Composite response shapes returned by specific endpoints (api.md), not
// direct table rows. Defined here so both src/api and src/web share one
// definition instead of duplicating them.

export type ProgramWithSections = Program & { sections: Section[] };
export type AccountWithParticipants = Account & { participants: Participant[] };
export type SectionWithCounts = Section & {
  enrolled_count: number;
  waitlisted_count: number;
  spots_remaining: number;
};

// Discriminated per-participant result from POST /sections/:id/enrollments
// (api.md). Shared so src/web can render it without duplicating the shape.
export type EnrollResult =
  | {
      participant_id: number;
      result: "enrolled";
      enrollment: { id: number; price_charged: number | null; discount_id: number | null };
    }
  | { participant_id: number; result: "waitlisted"; enrollment: { id: number; position: number | null } }
  | { participant_id: number; result: "ineligible"; reason?: string }
  | { participant_id: number; result: "already_enrolled" }
  | { participant_id: number; result: "waitlist_full" };
