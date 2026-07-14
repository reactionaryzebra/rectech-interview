import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sections, enrollments, participants, discounts } from "../db/schema.js";
import { promote } from "../lib/waitlist.js";
import { computePrice, type DiscountInput } from "../lib/discounts.js";
import { countHouseholdEnrolled } from "./queries.js";

// Triggered by any capacity-affecting event: cancelling an enrolled row, or
// an admin raising a section's capacity (see api.md "Waitlist promotion").
export async function promoteWaitlistForSection(sectionId: number): Promise<void> {
  const [section] = await db.select().from(sections).where(eq(sections.id, sectionId));
  if (!section) return;

  const enrolledCount = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.sectionId, sectionId), eq(enrollments.status, "enrolled")))
    .then((rows) => rows.length);

  const availableSlots = section.capacity - enrolledCount;
  if (availableSlots <= 0) return;

  const waitlistedRows = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.sectionId, sectionId), eq(enrollments.status, "waitlisted")));
  if (waitlistedRows.length === 0) return;

  const { promoted, remaining } = promote(
    waitlistedRows.map((row) => ({ id: row.id, position: row.position ?? 0 })),
    availableSlots
  );

  const activeDiscounts = await db
    .select()
    .from(discounts)
    .where(and(eq(discounts.sectionId, sectionId), eq(discounts.active, true)));

  for (const entry of promoted) {
    const enrollment = waitlistedRows.find((row) => row.id === entry.id)!;
    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, enrollment.participantId));

    const householdCountBefore = await countHouseholdEnrolled(sectionId, participant.accountId);
    const { price_charged, discount_id } = computePrice(
      section.price,
      activeDiscounts as DiscountInput[],
      householdCountBefore
    );

    await db
      .update(enrollments)
      .set({
        status: "enrolled",
        position: null,
        priceCharged: price_charged,
        discountId: discount_id ?? null,
      })
      .where(eq(enrollments.id, entry.id));
  }

  for (const entry of remaining) {
    await db.update(enrollments).set({ position: entry.position }).where(eq(enrollments.id, entry.id));
  }
}
