import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { enrollments, participants } from "../db/schema.js";

export async function countByStatus(
  sectionId: number,
  status: "enrolled" | "waitlisted"
): Promise<number> {
  const rows = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.sectionId, sectionId), eq(enrollments.status, status)));
  return rows.length;
}

// How many of this household's participants are already enrolled in this
// section — used to derive a participant's "nth" rank for tiered discounts.
export async function countHouseholdEnrolled(
  sectionId: number,
  accountId: number
): Promise<number> {
  const rows = await db
    .select()
    .from(enrollments)
    .innerJoin(participants, eq(enrollments.participantId, participants.id))
    .where(
      and(
        eq(enrollments.sectionId, sectionId),
        eq(enrollments.status, "enrolled"),
        eq(participants.accountId, accountId)
      )
    );
  return rows.length;
}
