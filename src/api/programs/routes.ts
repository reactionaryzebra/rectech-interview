import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { programs, sections } from "../db/schema.js";

export const programsRouter = Router();

async function sectionsFor(programId: number, includeAll: boolean) {
  return includeAll
    ? db.select().from(sections).where(eq(sections.programId, programId))
    : db
        .select()
        .from(sections)
        .where(and(eq(sections.programId, programId), eq(sections.visible, true)));
}

programsRouter.get("/programs", async (req, res) => {
  const includeAll = req.query.all === "true";

  const programRows = includeAll
    ? await db.select().from(programs)
    : await db.select().from(programs).where(eq(programs.visible, true));

  const result = await Promise.all(
    programRows.map(async (program) => ({
      ...program,
      sections: await sectionsFor(program.id, includeAll),
    }))
  );

  res.json(result);
});

programsRouter.get("/programs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const includeAll = req.query.all === "true";

  const [program] = await db.select().from(programs).where(eq(programs.id, id));
  if (!program || (!includeAll && !program.visible)) {
    return res.status(404).json({ error: "program not found" });
  }

  res.json({ ...program, sections: await sectionsFor(id, includeAll) });
});

programsRouter.post("/programs", async (req, res) => {
  const { name, description } = req.body ?? {};
  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }

  const [program] = await db
    .insert(programs)
    .values({ name, description: description ?? null, createdAt: new Date().toISOString() })
    .returning();
  res.status(201).json(program);
});

programsRouter.patch("/programs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(programs).where(eq(programs.id, id));
  if (!existing) return res.status(404).json({ error: "program not found" });

  const { name, description, visible } = req.body ?? {};
  const updates: Partial<typeof programs.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (visible !== undefined) updates.visible = visible;

  const [program] = await db.update(programs).set(updates).where(eq(programs.id, id)).returning();
  res.json(program);
});
