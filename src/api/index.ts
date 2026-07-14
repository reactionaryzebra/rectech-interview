import express from "express";
import { db } from "./db/index.js";
import { programs } from "./db/schema.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/programs", async (_req, res) => {
  const rows = await db.select().from(programs);
  res.json(rows);
});

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});
