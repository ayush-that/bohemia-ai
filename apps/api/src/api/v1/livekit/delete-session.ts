import { Hono } from "hono";
import { getLiveKitService } from "../../../services/livekit.service.js";

const app = new Hono();

app.delete("/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    const liveKitService = getLiveKitService();
    await liveKitService.endAgentSession(sessionId);

    return c.json({ message: "Session ended successfully" });
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
