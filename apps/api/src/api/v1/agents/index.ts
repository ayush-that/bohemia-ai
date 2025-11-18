import { Hono } from "hono";
import { clerkAuth } from "../../../middleware/auth.js";
import list from "./list.js";
import get from "./get.js";
import create from "./create.js";
import update from "./update.js";
import del from "./delete.js";
import test from "./test.js";

const app = new Hono();

// Apply auth middleware to all routes
app.use("*", clerkAuth);

// Mount all sub-routes
app.route("/", list);
app.route("/", get);
app.route("/", create);
app.route("/", update);
app.route("/", del);
app.route("/", test);

export default app;
