import { Router, type IRouter } from "express";
import { db, calendarEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListCalendarEventsQueryParams,
  CreateCalendarEventBody,
  DeleteCalendarEventParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/calendar", async (req, res): Promise<void> => {
  const params = ListCalendarEventsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const events = await db
    .select()
    .from(calendarEventsTable)
    .where(eq(calendarEventsTable.userId, params.data.userId))
    .orderBy(desc(calendarEventsTable.date));
  res.json(events);
});

router.post("/calendar", async (req, res): Promise<void> => {
  const parsed = CreateCalendarEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db.insert(calendarEventsTable).values(parsed.data).returning();
  res.status(201).json(event);
});

router.delete("/calendar/:id", async (req, res): Promise<void> => {
  const params = DeleteCalendarEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [event] = await db
    .delete(calendarEventsTable)
    .where(eq(calendarEventsTable.id, params.data.id))
    .returning();
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
