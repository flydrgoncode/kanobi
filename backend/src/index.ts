import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { healthRouter } from "./routes/health.js";
import { chatRouter } from "./routes/chat.js";
import { workspaceRouter } from "./routes/workspace.js";

const app = new Hono();
const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5180,http://localhost:1420")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.route("/api/health", healthRouter);
app.route("/api/chat", chatRouter);
app.route("/api/workspace", workspaceRouter);

const port = Number(process.env.PORT) || 3737;

serve({ fetch: app.fetch, port }, () => {
  console.log(`kanobi backend running on http://localhost:${port}`);
});
