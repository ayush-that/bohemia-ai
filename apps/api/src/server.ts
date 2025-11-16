import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./index.js";

const port = parseInt(process.env.PORT || "8080", 10);
if (isNaN(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}.`);
}

serve({
  fetch: app.fetch,
  port,
});
