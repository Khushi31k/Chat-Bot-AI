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
import { openai } from "@workspace/integrations-openai-ai-server";

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

router.post("/journal/:id/summary", async (req, res): Promise<void> => {
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

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            "You are ELLA, a compassionate AI companion. Summarize the following journal entry in 1-2 warm, empathetic sentences that capture the essence and emotional core of what the person shared. Be specific to their words, not generic.",
        },
        {
          role: "user",
          content: `Journal entry (${entry.date}${entry.mood ? `, mood: ${entry.mood}` : ""}):\n${entry.content}`,
        },
      ],
    });
    const summary = completion.choices[0]?.message?.content ?? "";
    res.json({ summary });
  } catch (err) {
    req.log.error({ err }, "Journal summary error");
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
