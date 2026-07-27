import { Router, type IRouter } from "express";
import { db, conversations, messages, journalEntriesTable, memoriesTable } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  ListOpenaiConversationsQueryParams,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageBody,
  SendOpenaiMessageParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/openai/conversations", async (req, res): Promise<void> => {
  const params = ListOpenaiConversationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, params.data.userId))
    .orderBy(desc(conversations.createdAt));
  res.json(convs);
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db
    .insert(conversations)
    .values({ title: parsed.data.title, userId: parsed.data.userId })
    .returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(messages).where(eq(messages.conversationId, params.data.id));
  const [conv] = await db
    .delete(conversations)
    .where(eq(conversations.id, params.data.id))
    .returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content, userId } = parsed.data;
  const conversationId = params.data.id;

  // Save user message
  await db.insert(messages).values({ conversationId, role: "user", content });

  // Get conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  // Fetch journal entries and memories for personalized context
  let journalContext = "";
  let memoriesContext = "";
  try {
    const [journals, memories] = await Promise.all([
      db
        .select()
        .from(journalEntriesTable)
        .where(eq(journalEntriesTable.userId, userId))
        .orderBy(desc(journalEntriesTable.date)),
      db
        .select()
        .from(memoriesTable)
        .where(eq(memoriesTable.userId, userId))
        .orderBy(desc(memoriesTable.pinned), desc(memoriesTable.createdAt)),
    ]);

    if (journals.length > 0) {
      journalContext = `\n\nUser's recent journal entries (use for context and personalization):\n${journals
        .slice(0, 10)
        .map((j) => `[${j.date}${j.mood ? `, mood: ${j.mood}` : ""}]: ${j.content.slice(0, 400)}`)
        .join("\n")}`;
    }

    // Inject pinned memories first, then up to 5 most recent
    const pinnedMems = memories.filter((m) => m.pinned);
    const regularMems = memories.filter((m) => !m.pinned).slice(0, 5);
    const relevantMems = [...pinnedMems, ...regularMems];
    if (relevantMems.length > 0) {
      memoriesContext = `\n\nThings the user has explicitly told you to remember:\n${relevantMems
        .map((m) => `- ${m.title}: ${m.content}`)
        .join("\n")}`;
    }
  } catch (_) {
    // ignore if userId not provided
  }

  const systemPrompt = `You are ELLA, an intelligent, warm, and deeply empathetic AI personal companion.
You know this person through their journal entries and conversations.
You provide thoughtful, personalized responses that feel genuine and caring.
You're not just an assistant — you're a companion who remembers, understands, and grows with the user.
Keep responses concise but meaningful. Be specific, not generic. Never use emojis.${memoriesContext}${journalContext}`;

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 1024,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "OpenAI stream error");
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

export default router;
