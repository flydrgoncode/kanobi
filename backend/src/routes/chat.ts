import { Hono } from "hono";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

export const chatRouter = new Hono();

const messageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

chatRouter.post(
  "/",
  zValidator("json", messageSchema),
  async (c) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return c.json(
        { error: "ANTHROPIC_API_KEY is not configured on the backend." },
        500
      );
    }

    const { messages } = c.req.valid("json");

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      messages,
      system: "You are Kanobi, a helpful AI assistant.",
    });

    return result.toTextStreamResponse();
  }
);
