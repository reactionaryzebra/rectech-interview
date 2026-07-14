import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { programs, sections } from "../db/schema.js";
import { countByStatus } from "../enrollments/queries.js";
import { promoteWaitlistForSection } from "../enrollments/promote.js";

export const sectionsRouter = Router();

function validateSectionInput(body: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (typeof body.name !== "string" || body.name.trim() === "") errors.push("name is required");
  if (typeof body.capacity !== "number") errors.push("capacity must be a number");
  if (typeof body.waitlist_capacity !== "number") errors.push("waitlist_capacity must be a number");
  if (typeof body.price !== "number") errors.push("price must be a number");
  if (typeof body.enrollment_open_at !== "string") errors.push("enrollment_open_at is required");
  if (typeof body.run_start_date !== "string") errors.push("run_start_date is required");
  if (typeof body.run_end_date !== "string") errors.push("run_end_date is required");
  if (!Array.isArray(body.days_of_week)) errors.push("days_of_week must be an array");
  if (typeof body.start_time !== "string") errors.push("start_time is required");
  if (typeof body.end_time !== "string") errors.push("end_time is required");
  return errors;
}

sectionsRouter.post("/programs/:programId/sections", async (req, res) => {
  const programId = Number(req.params.programId);
  const [program] = await db.select().from(programs).where(eq(programs.id, programId));
  if (!program) return res.status(404).json({ error: "program not found" });

  const body = req.body ?? {};
  const errors = validateSectionInput(body);
  if (errors.length > 0) return res.status(400).json({ error: errors.join(", ") });

  if (body.visible === true && !program.visible) {
    return res
      .status(409)
      .json({ error: "cannot set visible=true while parent program is not visible" });
  }

  const [section] = await db
    .insert(sections)
    .values({
      programId,
      name: body.name,
      capacity: body.capacity,
      waitlistCapacity: body.waitlist_capacity,
      price: body.price,
      visible: body.visible ?? false,
      enrollmentOpenAt: body.enrollment_open_at,
      runStartDate: body.run_start_date,
      runEndDate: body.run_end_date,
      daysOfWeek: body.days_of_week,
      startTime: body.start_time,
      endTime: body.end_time,
    })
    .returning();
  res.status(201).json(section);
});

sectionsRouter.get("/sections/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [section] = await db.select().from(sections).where(eq(sections.id, id));
  if (!section) return res.status(404).json({ error: "section not found" });

  const enrolledCount = await countByStatus(id, "enrolled");
  const waitlistedCount = await countByStatus(id, "waitlisted");

  res.json({
    ...section,
    enrolled_count: enrolledCount,
    waitlisted_count: waitlistedCount,
    spots_remaining: Math.max(section.capacity - enrolledCount, 0),
  });
});

sectionsRouter.patch("/sections/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(sections).where(eq(sections.id, id));
  if (!existing) return res.status(404).json({ error: "section not found" });

  const body = req.body ?? {};

  if (body.visible === true) {
    const [program] = await db.select().from(programs).where(eq(programs.id, existing.programId));
    if (!program?.visible) {
      return res
        .status(409)
        .json({ error: "cannot set visible=true while parent program is not visible" });
    }
  }

  const updates: Partial<typeof sections.$inferInsert> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.capacity !== undefined) updates.capacity = body.capacity;
  if (body.waitlist_capacity !== undefined) updates.waitlistCapacity = body.waitlist_capacity;
  if (body.price !== undefined) updates.price = body.price;
  if (body.visible !== undefined) updates.visible = body.visible;
  if (body.enrollment_open_at !== undefined) updates.enrollmentOpenAt = body.enrollment_open_at;
  if (body.run_start_date !== undefined) updates.runStartDate = body.run_start_date;
  if (body.run_end_date !== undefined) updates.runEndDate = body.run_end_date;
  if (body.days_of_week !== undefined) updates.daysOfWeek = body.days_of_week;
  if (body.start_time !== undefined) updates.startTime = body.start_time;
  if (body.end_time !== undefined) updates.endTime = body.end_time;

  const capacityIncreased = typeof body.capacity === "number" && body.capacity > existing.capacity;

  const [section] = await db.update(sections).set(updates).where(eq(sections.id, id)).returning();

  if (capacityIncreased) {
    await promoteWaitlistForSection(id);
  }

  res.json(section);
});
