import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sections, discounts } from "../db/schema.js";

const SUPPORTED_TYPES = new Set(["household_multi_enrollment"]);

export const discountsRouter = Router();

discountsRouter.post("/sections/:id/discounts", async (req, res) => {
  const sectionId = Number(req.params.id);
  const [section] = await db.select().from(sections).where(eq(sections.id, sectionId));
  if (!section) return res.status(404).json({ error: "section not found" });

  const { type, config } = req.body ?? {};
  if (!SUPPORTED_TYPES.has(type)) {
    return res.status(400).json({ error: `unsupported discount type: ${type}` });
  }
  if (typeof config !== "object" || config === null) {
    return res.status(400).json({ error: "config is required" });
  }

  const [discount] = await db.insert(discounts).values({ sectionId, type, config }).returning();
  res.status(201).json(discount);
});

discountsRouter.patch("/discounts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(discounts).where(eq(discounts.id, id));
  if (!existing) return res.status(404).json({ error: "discount not found" });

  const { config, active } = req.body ?? {};
  const updates: Partial<typeof discounts.$inferInsert> = {};
  if (config !== undefined) updates.config = config;
  if (active !== undefined) updates.active = active;

  const [discount] = await db.update(discounts).set(updates).where(eq(discounts.id, id)).returning();
  res.json(discount);
});

discountsRouter.delete("/discounts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(discounts).where(eq(discounts.id, id));
  if (!existing) return res.status(404).json({ error: "discount not found" });

  await db.delete(discounts).where(eq(discounts.id, id));
  res.status(204).send();
});
