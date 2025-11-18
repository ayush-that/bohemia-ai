import { Hono } from "hono";
import { clerkAuth } from "../../../middleware/auth.js";
import webhook from "./webhook.js";
import createSession from "./create-session.js";
import deleteSession from "./delete-session.js";
import getMetrics from "./get-metrics.js";

const app = new Hono();

// Apply auth middleware to specific routes
app.use("/create-session", clerkAuth);
app.use("/sessions", clerkAuth);

// Mount all sub-routes
app.route("/webhook", webhook);
app.route("/create-session", createSession);
app.route("/sessions", deleteSession);
app.route("/sessions", getMetrics);

export default app;
