import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getDb } from "../../../db/connection.js";
import { voiceAgents } from "../../../db/schema/index.js";
import { requireAuth } from "../../../middleware/auth.js";
import { createAgentSchema } from "./schema.js";

const app = new Hono();

app.post("/", zValidator("json", createAgentSchema), async (c) => {
  try {
    const user = requireAuth(c);
    if (!user) return;

    const agentData = c.req.valid("json");
    const db = getDb();
    const userId = user.userId;

    const [newAgent] = await db
      .insert(voiceAgents)
      .values({
        name: agentData.name,
        description: agentData.description,
        instructions: agentData.instructions,
        llmProvider: "openai",
        llmModel: "microsoft/phi-4",
        llmTemperature: agentData.llmTemperature ?? 0.7,
        llmMaxTokens: agentData.llmMaxTokens ?? 1000,
        sttProvider: "deepgram",
        sttModel: "nova-3",
        sttLanguage: agentData.sttLanguage ?? "en",
        ttsProvider: "elevenlabs",
        ttsVoice: "rachel",
        ttsModel: "eleven_turbo_v2_5",
        targetLatency: 1000,
        livekitAgentName: "CA_E2Fk4oUhfSGD",
        userId,
      })
      .returning();

    return c.json(newAgent, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
