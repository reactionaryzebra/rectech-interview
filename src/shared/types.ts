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
