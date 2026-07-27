import { Router, type IRouter } from "express";
import { db, journalEntriesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListJournalEntriesQueryParams,
  CreateJournalEntryBody,
  UpdateJournalEntryBody,
  GetJournalEntryParams,
  UpdateJournalEntryParams,
  DeleteJournalEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/journal", async (req, res): Promise<void> => {
  const params = ListJournalEntriesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const entries = await db
    .select()
    .from(journalEntriesTable)
    .where(eq(journalEntriesTable.userId, params.data.userId))
    .orderBy(desc(journalEntriesTable.date));
  res.json(entries);
});

router.post("/journal", async (req, res): Promise<void> => {
  const parsed = CreateJournalEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.insert(journalEntriesTable).values(parsed.data).returning();
  res.status(201).json(entry);
});

router.get("/journal/:id", async (req, res): Promise<void> => {
  const params = GetJournalEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db
    .select()
    .from(journalEntriesTable)
    .where(eq(journalEntriesTable.id, params.data.id));
  if (!entry) {
    res.status(404).json({ error: "Journal entry not found" });
    return;
  }
  res.json(entry);
});

router.patch("/journal/:id", async (req, res): Promise<void> => {
  const params = UpdateJournalEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateJournalEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .update(journalEntriesTable)
    .set(parsed.data)
    .where(eq(journalEntriesTable.id, params.data.id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Journal entry not found" });
    return;
  }
  res.json(entry);
});

router.delete("/journal/:id", async (req, res): Promise<void> => {
  const params = DeleteJournalEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db
    .delete(journalEntriesTable)
    .where(eq(journalEntriesTable.id, params.data.id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Journal entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
