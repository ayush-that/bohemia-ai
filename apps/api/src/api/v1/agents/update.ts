import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getDb } from "../../../db/connection.js";
import { voiceAgents } from "../../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../../middleware/auth.js";
import { updateAgentSchema } from "./schema.js";

const app = new Hono();

app.put("/:id", zValidator("json", updateAgentSchema), async (c) => {
  try {
    const user = requireAuth(c);
    if (!user) return;

    const id = c.req.param("id");
    const updateData = c.req.valid("json");
    const db = getDb();
    const userId = user.userId;

    const [updatedAgent] = await db
      .update(voiceAgents)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(eq(voiceAgents.id, id), eq(voiceAgents.userId, userId)))
      .returning();

    if (!updatedAgent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    return c.json(updatedAgent);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
