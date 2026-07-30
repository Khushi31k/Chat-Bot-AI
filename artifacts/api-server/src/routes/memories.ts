import { Router, type IRouter } from "express";
import { db, memoriesTable } from "@workspace/db";
import { eq, and, like, or, desc } from "drizzle-orm";
import {
  ListMemoriesQueryParams,
  CreateMemoryBody,
  UpdateMemoryParams,
  UpdateMemoryBody,
  DeleteMemoryParams,
  DeleteMemoryQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/memories", async (req, res): Promise<void> => {
  const params = ListMemoriesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { userId, search } = params.data;

  let memories;
  if (search) {
    memories = await db
      .select()
      .from(memoriesTable)
      .where(
        and(
          eq(memoriesTable.userId, userId),
          or(
            like(memoriesTable.title, `%${search}%`),
            like(memoriesTable.content, `%${search}%`)
          )
        )
      )
      .orderBy(desc(memoriesTable.pinned), desc(memoriesTable.createdAt));
  } else {
    memories = await db
      .select()
      .from(memoriesTable)
      .where(eq(memoriesTable.userId, userId))
      .orderBy(desc(memoriesTable.pinned), desc(memoriesTable.createdAt));
  }

  res.json(memories);
});

router.post("/memories", async (req, res): Promise<void> => {
  const parsed = CreateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, title, content, pinned } = parsed.data;
  const [memory] = await db
    .insert(memoriesTable)
    .values({ userId, title, content, pinned: pinned ?? false })
    .returning();
  res.status(201).json(memory);
});

router.patch("/memories/:id", async (req, res): Promise<void> => {
  const params = UpdateMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, title, content, pinned } = parsed.data;

  // Reject if no actual fields to update
  if (title === undefined && content === undefined && pinned === undefined) {
    res.status(400).json({ error: "At least one field (title, content, pinned) must be provided" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (pinned !== undefined) updates.pinned = pinned;

  // Scope by both id AND userId to enforce ownership
  const [memory] = await db
    .update(memoriesTable)
    .set(updates)
    .where(and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, userId)))
    .returning();

  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }
  res.json(memory);
});

router.delete("/memories/:id", async (req, res): Promise<void> => {
  const params = DeleteMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = DeleteMemoryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  // Scope by both id AND userId to prevent cross-user deletion
  const [memory] = await db
    .delete(memoriesTable)
    .where(and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, query.data.userId)))
    .returning();

  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
