import { Router, type IRouter } from "express";
import { db, moodLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { ListMoodLogsQueryParams, CreateMoodLogBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/mood", async (req, res): Promise<void> => {
  const params = ListMoodLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const logs = await db
    .select()
    .from(moodLogsTable)
    .where(eq(moodLogsTable.userId, params.data.userId))
    .orderBy(desc(moodLogsTable.date));
  res.json(logs);
});

router.post("/mood", async (req, res): Promise<void> => {
  const parsed = CreateMoodLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [log] = await db.insert(moodLogsTable).values(parsed.data).returning();
  res.status(201).json(log);
});

export default router;
