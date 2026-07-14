import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { accounts, participants, enrollments, sections } from "../db/schema.js";

export const accountsRouter = Router();

accountsRouter.post("/accounts", async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== "string" || email.trim() === "") {
    return res.status(400).json({ error: "email is required" });
  }

  const [account] = await db
    .insert(accounts)
    .values({ email, createdAt: new Date().toISOString() })
    .returning();
  res.status(201).json(account);
});

accountsRouter.get("/accounts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
  if (!account) return res.status(404).json({ error: "account not found" });

  const roster = await db.select().from(participants).where(eq(participants.accountId, id));
  res.json({ ...account, participants: roster });
});

accountsRouter.post("/accounts/:id/participants", async (req, res) => {
  const accountId = Number(req.params.id);
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return res.status(404).json({ error: "account not found" });

  const { name, birth_date } = req.body ?? {};
  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }
  if (typeof birth_date !== "string" || birth_date.trim() === "") {
    return res.status(400).json({ error: "birth_date is required" });
  }

  const [participant] = await db
    .insert(participants)
    .values({ accountId, name, birthDate: birth_date })
    .returning();
  res.status(201).json(participant);
});

accountsRouter.get("/accounts/:id/enrollments", async (req, res) => {
  const accountId = Number(req.params.id);
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return res.status(404).json({ error: "account not found" });

  const rows = await db
    .select({ enrollment: enrollments, participant: participants, section: sections })
    .from(enrollments)
    .innerJoin(participants, eq(enrollments.participantId, participants.id))
    .innerJoin(sections, eq(enrollments.sectionId, sections.id))
    .where(eq(participants.accountId, accountId));

  res.json(
    rows.map((row) => ({ ...row.enrollment, participant: row.participant, section: row.section }))
  );
});
