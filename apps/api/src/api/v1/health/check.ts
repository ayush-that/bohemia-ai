import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

export default app;

