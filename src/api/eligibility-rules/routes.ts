import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sections, eligibilityRules } from "../db/schema.js";

const SUPPORTED_TYPES = new Set(["age_range"]);

export const eligibilityRulesRouter = Router();

eligibilityRulesRouter.post("/sections/:id/eligibility-rules", async (req, res) => {
  const sectionId = Number(req.params.id);
  const [section] = await db.select().from(sections).where(eq(sections.id, sectionId));
  if (!section) return res.status(404).json({ error: "section not found" });

  const { type, config } = req.body ?? {};
  if (!SUPPORTED_TYPES.has(type)) {
    return res.status(400).json({ error: `unsupported eligibility rule type: ${type}` });
  }
  if (typeof config !== "object" || config === null) {
    return res.status(400).json({ error: "config is required" });
  }

  const [rule] = await db.insert(eligibilityRules).values({ sectionId, type, config }).returning();
  res.status(201).json(rule);
});

eligibilityRulesRouter.patch("/eligibility-rules/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(eligibilityRules).where(eq(eligibilityRules.id, id));
  if (!existing) return res.status(404).json({ error: "eligibility rule not found" });

  const { config, active } = req.body ?? {};
  const updates: Partial<typeof eligibilityRules.$inferInsert> = {};
  if (config !== undefined) updates.config = config;
  if (active !== undefined) updates.active = active;

  const [rule] = await db
    .update(eligibilityRules)
    .set(updates)
    .where(eq(eligibilityRules.id, id))
    .returning();
  res.json(rule);
});

eligibilityRulesRouter.delete("/eligibility-rules/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(eligibilityRules).where(eq(eligibilityRules.id, id));
  if (!existing) return res.status(404).json({ error: "eligibility rule not found" });

  await db.delete(eligibilityRules).where(eq(eligibilityRules.id, id));
  res.status(204).send();
});
