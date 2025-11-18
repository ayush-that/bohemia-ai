import { Hono } from "hono";
import { getLiveKitService } from "../../../services/livekit.service.js";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body = await c.req.text();
    const authorization = c.req.header("Authorization");
    const liveKitService = getLiveKitService();
    const event = await liveKitService.handleWebhook(body, authorization);

    if (!event) {
      return c.json({ error: "Invalid webhook signature" }, 401);
    }

    await liveKitService.processWebhookEvent(event);

    return c.json({ received: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
