import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { healthRouter } from "./routes/health.js";
import { chatRouter } from "./routes/chat.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:1420"],
    credentials: true,
  })
);

app.route("/api/health", healthRouter);
app.route("/api/chat", chatRouter);

const port = Number(process.env.PORT) || 3737;

serve({ fetch: app.fetch, port }, () => {
  console.log(`kanobi backend running on http://localhost:${port}`);
});
