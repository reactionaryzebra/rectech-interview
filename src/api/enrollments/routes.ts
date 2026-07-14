import { Router } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { sections, participants, enrollments, eligibilityRules, discounts } from "../db/schema.js";
import { evaluateEligibility, type EligibilityRuleInput } from "../lib/eligibility.js";
import { computePrice, type DiscountInput } from "../lib/discounts.js";
import { countByStatus, countHouseholdEnrolled } from "./queries.js";
import { promoteWaitlistForSection } from "./promote.js";

export const enrollmentsRouter = Router();

type EnrollResult =
  | { participant_id: number; result: "enrolled"; enrollment: { id: number; price_charged: number | null; discount_id: number | null } }
  | { participant_id: number; result: "waitlisted"; enrollment: { id: number; position: number | null } }
  | { participant_id: number; result: "ineligible"; reason?: string }
  | { participant_id: number; result: "already_enrolled" }
  | { participant_id: number; result: "waitlist_full" };

enrollmentsRouter.post("/sections/:id/enrollments", async (req, res) => {
  const sectionId = Number(req.params.id);
  const [section] = await db.select().from(sections).where(eq(sections.id, sectionId));
  if (!section) return res.status(404).json({ error: "section not found" });

  const participantIds: unknown = req.body?.participant_ids;
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    return res.status(400).json({ error: "participant_ids must be a non-empty array" });
  }

  const participantRows = await db
    .select()
    .from(participants)
    .where(inArray(participants.id, participantIds));
  const participantsById = new Map(participantRows.map((p) => [p.id, p]));
  const missing = participantIds.filter((id) => !participantsById.has(id));
  if (missing.length > 0) {
    return res.status(400).json({ error: `unknown participant_ids: ${missing.join(", ")}` });
  }

  const activeRules = await db
    .select()
    .from(eligibilityRules)
    .where(and(eq(eligibilityRules.sectionId, sectionId), eq(eligibilityRules.active, true)));

  const activeDiscounts = await db
    .select()
    .from(discounts)
    .where(and(eq(discounts.sectionId, sectionId), eq(discounts.active, true)));

  const results: EnrollResult[] = [];

  for (const participantId of participantIds as number[]) {
    const participant = participantsById.get(participantId)!;

    const alreadyActive = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.sectionId, sectionId),
          eq(enrollments.participantId, participantId),
          inArray(enrollments.status, ["enrolled", "waitlisted"])
        )
      );
    if (alreadyActive.length > 0) {
      results.push({ participant_id: participantId, result: "already_enrolled" });
      continue;
    }

    const eligibility = evaluateEligibility(
      activeRules as EligibilityRuleInput[],
      participant.birthDate,
      section.runStartDate
    );
    if (!eligibility.eligible) {
      results.push({ participant_id: participantId, result: "ineligible", reason: eligibility.reason });
      continue;
    }

    const enrolledCount = await countByStatus(sectionId, "enrolled");

    if (enrolledCount < section.capacity) {
      const householdCountBefore = await countHouseholdEnrolled(sectionId, participant.accountId);
      const { price_charged, discount_id } = computePrice(
        section.price,
        activeDiscounts as DiscountInput[],
        householdCountBefore
      );
      const [inserted] = await db
        .insert(enrollments)
        .values({
          sectionId,
          participantId,
          status: "enrolled",
          priceCharged: price_charged,
          discountId: discount_id ?? null,
          createdAt: new Date().toISOString(),
        })
        .returning();
      results.push({
        participant_id: participantId,
        result: "enrolled",
        enrollment: { id: inserted.id, price_charged: inserted.priceCharged, discount_id: inserted.discountId },
      });
      continue;
    }

    const waitlistedCount = await countByStatus(sectionId, "waitlisted");
    if (waitlistedCount < section.waitlistCapacity) {
      const [inserted] = await db
        .insert(enrollments)
        .values({
          sectionId,
          participantId,
          status: "waitlisted",
          position: waitlistedCount + 1,
          createdAt: new Date().toISOString(),
        })
        .returning();
      results.push({
        participant_id: participantId,
        result: "waitlisted",
        enrollment: { id: inserted.id, position: inserted.position },
      });
      continue;
    }

    results.push({ participant_id: participantId, result: "waitlist_full" });
  }

  res.json(results);
});

enrollmentsRouter.delete("/enrollments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(enrollments).where(eq(enrollments.id, id));
  if (!existing) return res.status(404).json({ error: "enrollment not found" });

  await db
    .update(enrollments)
    .set({ status: "cancelled", position: null })
    .where(eq(enrollments.id, id));

  if (existing.status === "enrolled") {
    await promoteWaitlistForSection(existing.sectionId);
  }

  res.status(204).send();
});
