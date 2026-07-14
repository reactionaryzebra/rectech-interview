import express from "express";
import { accountsRouter } from "./accounts/routes.js";
import { programsRouter } from "./programs/routes.js";
import { sectionsRouter } from "./sections/routes.js";
import { eligibilityRulesRouter } from "./eligibility-rules/routes.js";
import { discountsRouter } from "./discounts/routes.js";
import { enrollmentsRouter } from "./enrollments/routes.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(accountsRouter);
app.use(programsRouter);
app.use(sectionsRouter);
app.use(eligibilityRulesRouter);
app.use(discountsRouter);
app.use(enrollmentsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});
