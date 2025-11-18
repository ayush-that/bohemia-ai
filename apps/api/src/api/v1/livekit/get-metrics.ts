import { Hono } from "hono";
import { getLiveKitService } from "../../../services/livekit.service.js";

const app = new Hono();

app.get("/:sessionId/metrics", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    const liveKitService = getLiveKitService();
    const metrics = await liveKitService.getSessionMetrics(sessionId);

    if (!metrics) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json(metrics);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
