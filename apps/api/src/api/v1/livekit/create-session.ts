import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getLiveKitService } from "../../../services/livekit.service.js";
import { requireAuth } from "../../../middleware/auth.js";
import { createSessionSchema } from "./schema.js";

const app = new Hono();

app.post("/", zValidator("json", createSessionSchema), async (c) => {
  try {
    const user = requireAuth(c);
    if (!user) return;

    const { agentId, isTest } = c.req.valid("json");

    const liveKitService = getLiveKitService();
    const sessionData = await liveKitService.createAgentSession(
      agentId,
      user.userId,
      isTest
    );

    return c.json({
      sessionId: sessionData.sessionId,
      roomName: sessionData.roomName,
      accessToken: sessionData.accessToken,
      wsUrl: sessionData.wsUrl,
      livekitAgentName: sessionData.livekitAgentName,
      agentConfig: sessionData.agentConfig,
    });
  } catch (error) {
    console.error(error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

export default app;
