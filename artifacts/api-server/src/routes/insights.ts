import { Router, type IRouter } from "express";
import { db, journalEntriesTable, moodLogsTable, habitsTable, habitLogsTable, goalsTable, memoriesTable } from "@workspace/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/insights", async (req, res): Promise<void> => {
  const userId = Number(req.query.userId);
  if (!userId || isNaN(userId)) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  // Compute 30-day cutoff date string
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const [journals, moods, habits, habitLogs, goals, memories] = await Promise.all([
    db
      .select()
      .from(journalEntriesTable)
      .where(and(eq(journalEntriesTable.userId, userId), gte(journalEntriesTable.date, thirtyDaysAgoStr)))
      .orderBy(desc(journalEntriesTable.date))
      .limit(10),
    db
      .select()
      .from(moodLogsTable)
      .where(and(eq(moodLogsTable.userId, userId), gte(moodLogsTable.date, thirtyDaysAgoStr)))
      .orderBy(desc(moodLogsTable.date))
      .limit(30),
    db
      .select()
      .from(habitsTable)
      .where(eq(habitsTable.userId, userId)),
    db
      .select()
      .from(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, userId), gte(habitLogsTable.date, thirtyDaysAgoStr)))
      .orderBy(desc(habitLogsTable.date))
      .limit(90),
    db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.userId, userId))
      .limit(10),
    db
      .select()
      .from(memoriesTable)
      .where(eq(memoriesTable.userId, userId))
      .orderBy(desc(memoriesTable.pinned), desc(memoriesTable.createdAt))
      .limit(10),
  ]);

  // Build context for LLM
  const journalContext = journals.length > 0
    ? `Recent journal entries:\n${journals.map(j => `[${j.date}${j.mood ? `, mood: ${j.mood}` : ""}]: ${j.content.slice(0, 300)}`).join("\n")}`
    : "No recent journal entries.";

  const moodContext = moods.length > 0
    ? `Recent moods (last 30 days): ${moods.map(m => `${m.date}: ${m.mood}`).join(", ")}`
    : "No recent mood logs.";

  const habitContext = habits.length > 0
    ? `Habits tracked: ${habits.map(h => {
        const completions = habitLogs.filter(l => l.habitId === h.id).length;
        return `${h.name} (${completions} completions in last 90 days)`;
      }).join(", ")}`
    : "No habits tracked.";

  const goalContext = goals.length > 0
    ? `Goals: ${goals.map(g => `${g.title} (${g.category}, progress: ${g.progress}%${g.targetDate ? `, target: ${g.targetDate}` : ""})`).join("; ")}`
    : "No goals set.";

  const memoryContext = memories.length > 0
    ? `User memories: ${memories.map(m => `${m.title}: ${m.content}`).join("; ")}`
    : "No user memories.";

  const prompt = `You are ELLA, a compassionate AI personal companion. Based on the user's data below, generate 3-5 meaningful, personalized insights that help them understand themselves better and grow. Be specific, warm, and actionable — not generic. Return ONLY a JSON array of strings, no other text.

${journalContext}

${moodContext}

${habitContext}

${goalContext}

${memoryContext}

Return format: ["insight 1", "insight 2", "insight 3", ...]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    const insights: string[] = match ? JSON.parse(match[0]) : [];
    res.json({ insights });
  } catch (err) {
    req.log.error({ err }, "Insights generation error");
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

export default router;
