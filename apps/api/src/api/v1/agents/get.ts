import { Hono } from "hono";
import { getDb } from "../../../db/connection.js";
import { voiceAgents, agentSessions } from "../../../db/schema/index.js";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../../../middleware/auth.js";

const app = new Hono();

app.get("/:id", async (c) => {
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

    const recentSessions = await db
      .select({
        id: agentSessions.id,
        status: agentSessions.status,
        totalDuration: agentSessions.totalDuration,
        avgLatency: agentSessions.avgLatency,
        messageCount: agentSessions.messageCount,
        startedAt: agentSessions.startedAt,
        endedAt: agentSessions.endedAt,
      })
      .from(agentSessions)
      .where(eq(agentSessions.agentId, id))
      .orderBy(desc(agentSessions.startedAt))
      .limit(10);

    return c.json({
      ...agent,
      recentSessions,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
