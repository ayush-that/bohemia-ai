import { Hono } from "hono";
import check from "./check.js";

const app = new Hono();

app.route("/", check);

export default app;

