import { Hono } from "hono";
import { getDb } from "../../../db/connection.js";
import { voiceAgents, agentSessions } from "../../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../../middleware/auth.js";

const app = new Hono();

app.post("/:id/test", async (c) => {
  try {
    const user = requireAuth(c);
    if (!user) return;

    const id = c.req.param("id");
    const db = getDb();
    const userId = user.userId;

    const [agent] = await db
      .select()
      .from(voiceAgents)
      .where(and(eq(voiceAgents.id, id), eq(voiceAgents.userId, userId)));

    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const [session] = await db
      .insert(agentSessions)
      .values({
        agentId: id,
        sessionId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        roomName: `test-room-${id}-${Date.now()}`,
        userId,
        status: "active",
        metadata: { isTest: true },
      })
      .returning();

    return c.json({
      sessionId: session.id,
      roomName: session.roomName,
      agentConfig: {
        llmProvider: agent.llmProvider,
        llmModel: agent.llmModel,
        sttProvider: agent.sttProvider,
        ttsProvider: agent.ttsProvider,
        instructions: agent.instructions,
      },
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
