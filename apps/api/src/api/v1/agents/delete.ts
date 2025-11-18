import { Hono } from "hono";
import { getDb } from "../../../db/connection.js";
import { voiceAgents } from "../../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../../middleware/auth.js";

const app = new Hono();

app.delete("/:id", async (c) => {
  try {
    const user = requireAuth(c);
    if (!user) return;

    const id = c.req.param("id");
    const db = getDb();
    const userId = user.userId;

    const [deletedAgent] = await db
      .delete(voiceAgents)
      .where(and(eq(voiceAgents.id, id), eq(voiceAgents.userId, userId)))
      .returning();

    if (!deletedAgent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    return c.json({ message: "Agent deleted successfully" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
