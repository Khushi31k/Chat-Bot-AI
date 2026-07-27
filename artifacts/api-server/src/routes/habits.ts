import { Router, type IRouter } from "express";
import { db, habitsTable, habitLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListHabitsQueryParams,
  CreateHabitBody,
  DeleteHabitParams,
  LogHabitParams,
  LogHabitBody,
  UnlogHabitParams,
  ListHabitLogsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Must be before /habits/:id routes
router.get("/habits/logs", async (req, res): Promise<void> => {
  const params = ListHabitLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const logs = await db
    .select()
    .from(habitLogsTable)
    .where(eq(habitLogsTable.userId, params.data.userId));
  res.json(logs);
});

router.get("/habits", async (req, res): Promise<void> => {
  const params = ListHabitsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const habits = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.userId, params.data.userId));
  res.json(habits);
});

router.post("/habits", async (req, res): Promise<void> => {
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [habit] = await db.insert(habitsTable).values(parsed.data).returning();
  res.status(201).json(habit);
});

router.delete("/habits/:id", async (req, res): Promise<void> => {
  const params = DeleteHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(habitLogsTable).where(eq(habitLogsTable.habitId, params.data.id));
  const [habit] = await db
    .delete(habitsTable)
    .where(eq(habitsTable.id, params.data.id))
    .returning();
  if (!habit) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/habits/:id/log", async (req, res): Promise<void> => {
  const params = LogHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = LogHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.habitId, params.data.id), eq(habitLogsTable.date, parsed.data.date)));
  if (existing) {
    res.status(409).json({ error: "Already logged for this date" });
    return;
  }

  const [log] = await db
    .insert(habitLogsTable)
    .values({ habitId: params.data.id, userId: parsed.data.userId, date: parsed.data.date })
    .returning();
  res.status(201).json(log);
});

router.delete("/habits/:id/log/:date", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawDate = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(habitLogsTable)
    .where(and(eq(habitLogsTable.habitId, id), eq(habitLogsTable.date, rawDate)));
  res.sendStatus(204);
});

export default router;
