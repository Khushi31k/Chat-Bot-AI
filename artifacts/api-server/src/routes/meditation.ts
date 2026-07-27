import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GenerateMeditationBody } from "@workspace/api-zod";
import { Readable } from "stream";

const router: IRouter = Router();

const MEDITATION_PRESETS = [
  { id: "morning-calm", title: "Morning Calm", description: "Begin your day with clarity and intention", duration: 5, theme: "morning", icon: "Sun" },
  { id: "stress-relief", title: "Stress Relief", description: "Release tension and find your center", duration: 10, theme: "calm", icon: "Wind" },
  { id: "deep-focus", title: "Deep Focus", description: "Enter a state of effortless concentration", duration: 15, theme: "focus", icon: "Target" },
  { id: "sleep-journey", title: "Sleep Journey", description: "Drift into peaceful, restorative sleep", duration: 20, theme: "sleep", icon: "Moon" },
  { id: "body-scan", title: "Body Scan", description: "Connect with your body, release all tension", duration: 12, theme: "body", icon: "Heart" },
  { id: "gratitude", title: "Gratitude Practice", description: "Cultivate appreciation for what you have", duration: 8, theme: "gratitude", icon: "Sparkles" },
];

router.get("/meditation/presets", async (_req, res): Promise<void> => {
  res.json(MEDITATION_PRESETS);
});

router.post("/meditation/session", async (req, res): Promise<void> => {
  const parsed = GenerateMeditationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { theme, duration, mood } = parsed.data;

  const systemPrompt = `You are ELLA, a calm and compassionate AI meditation guide. 
Speak in second person, present tense, with a slow, peaceful, warm tone.
Write a complete ${duration}-minute guided meditation script.
Structure: opening breath work, body relaxation, visualization/mindfulness practice, gentle closing.
Format as flowing paragraphs of narration only — no headers or bullet points.
Use natural pacing cues like "...take a deep breath..." and "...allow yourself to settle...".`;

  const userPrompt = `Create a ${duration}-minute guided meditation with theme: "${theme}".${mood ? ` The person is currently feeling: ${mood}.` : ""} Write the complete narration script to be read aloud at a calm pace.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "Failed to generate meditation" })}\n\n`);
    res.end();
  }
});

router.post("/meditation/audio", async (req, res): Promise<void> => {
  const parsed = GenerateMeditationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { theme, duration, mood } = parsed.data;

  const systemPrompt = `You are ELLA, a calm and compassionate AI meditation guide. 
Speak in second person, present tense, with a slow, peaceful, warm tone.
Write a complete ${duration}-minute guided meditation script.
Structure: opening breath work, body relaxation, visualization/mindfulness practice, gentle closing.
Format as flowing paragraphs of narration only — no headers or bullet points.
Use natural pacing cues like "...take a deep breath..." and "...allow yourself to settle...".`;

  const userPrompt = `Create a ${duration}-minute guided meditation with theme: "${theme}".${mood ? ` The person is currently feeling: ${mood}.` : ""} Write the complete narration script to be read aloud at a calm pace.`;

  try {
    // First generate the meditation script
    const scriptCompletion = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const script = scriptCompletion.choices[0]?.message?.content ?? "";

    // Then convert to speech
    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: script,
    });

    // Stream the audio back to the client
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");

    const audioBuffer = await ttsResponse.arrayBuffer();
    const readable = Readable.from(Buffer.from(audioBuffer));
    readable.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate meditation audio" });
  }
});

export default router;
