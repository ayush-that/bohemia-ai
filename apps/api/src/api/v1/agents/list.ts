import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getDb } from "../../../db/connection.js";
import { voiceAgents } from "../../../db/schema/index.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../../../middleware/auth.js";
import { querySchema } from "./schema.js";

const app = new Hono();

app.get("/", zValidator("query", querySchema), async (c) => {
  try {
    const user = requireAuth(c);
    if (!user) return;

    const { page, limit, provider } = c.req.valid("query");
    const db = getDb();
    const userId = user.userId;

    let whereConditions = [eq(voiceAgents.userId, userId)];

    if (provider) {
      whereConditions.push(eq(voiceAgents.llmProvider, provider));
    }

    const offset = (page - 1) * limit;
    const agents = await db
      .select({
        id: voiceAgents.id,
        name: voiceAgents.name,
        description: voiceAgents.description,
        llmProvider: voiceAgents.llmProvider,
        llmModel: voiceAgents.llmModel,
        sttProvider: voiceAgents.sttProvider,
        sttModel: voiceAgents.sttModel,
        ttsProvider: voiceAgents.ttsProvider,
        ttsModel: voiceAgents.ttsModel,
        targetLatency: voiceAgents.targetLatency,
        createdAt: voiceAgents.createdAt,
        updatedAt: voiceAgents.updatedAt,
        sessionCount: sql<number>`(
          SELECT COUNT(*) FROM agent_sessions
          WHERE agent_sessions.agent_id = voice_agents.id
        )`,
      })
      .from(voiceAgents)
      .where(and(...whereConditions))
      .orderBy(desc(voiceAgents.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(voiceAgents)
      .where(and(...whereConditions));

    return c.json({
      data: agents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
