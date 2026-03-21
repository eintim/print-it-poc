import { fetchMutation, fetchQuery } from "convex/nextjs";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  createFeatherlessClient,
  createRefinementStreamFilter,
  getFeatherlessRefinementModel,
  parseRefinementTranscript,
  toChatMessages,
} from "@/lib/server/refinement";
import { requireRouteToken, routeErrorResponse } from "@/lib/server/route-utils";

const refineRequestSchema = z.object({
  sessionId: z.string().nullable(),
  message: z.string().min(1).max(600),
});

function streamLine(payload: unknown) {
  return `${JSON.stringify(payload)}\n`;
}

export async function POST(request: Request) {
  try {
    const token = await requireRouteToken();
    const body = refineRequestSchema.parse(await request.json());

    const started = await fetchMutation(
      api.app.beginRefinementTurn,
      {
        sessionId: body.sessionId as Id<"refinementSessions"> | null,
        message: body.message.trim(),
      },
      { token },
    );

    const conversation = await fetchQuery(
      api.app.getSessionConversation,
      { sessionId: started.sessionId },
      { token },
    );

    const client = createFeatherlessClient();
    const encoder = new TextEncoder();

    const stream = await client.chat.completions.create(
      {
        model: getFeatherlessRefinementModel(),
        temperature: 0.4,
        stream: true,
        messages: toChatMessages(
          conversation.session.latestPrompt,
          conversation.messages
            .filter((message) => message.role === "user" || message.role === "assistant")
            .map((message) => ({
              role: message.role as "user" | "assistant",
              content: message.content,
            })),
        ),
      },
      { signal: request.signal },
    );

    let transcript = "";
    const visibleTextFilter = createRefinementStreamFilter();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              streamLine({
                type: "session",
                sessionId: started.sessionId,
              }),
            ),
          );

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (typeof delta !== "string" || delta.length === 0) {
              continue;
            }

            transcript += delta;
            const visibleDelta = visibleTextFilter.push(delta);
            if (visibleDelta) {
              controller.enqueue(
                encoder.encode(
                  streamLine({
                    type: "token",
                    value: visibleDelta,
                  }),
                ),
              );
            }
          }

          const trailingVisibleText = visibleTextFilter.flush();
          if (trailingVisibleText) {
            controller.enqueue(
              encoder.encode(
                streamLine({
                  type: "token",
                  value: trailingVisibleText,
                }),
              ),
            );
          }

          const parsed = parseRefinementTranscript(
            transcript,
            conversation.session.latestPrompt.trim() || body.message.trim(),
          );

          await fetchMutation(
            api.app.completeRefinementTurn,
            {
              sessionId: started.sessionId,
              assistantMessage: parsed.assistantMessage,
              latestPrompt: parsed.latestPrompt,
              canonicalPrompt: parsed.canonicalPrompt,
              readyToGenerate: parsed.readyToGenerate,
              tips: parsed.tips,
              title: parsed.title,
            },
            { token },
          );

          controller.enqueue(
            encoder.encode(
              streamLine({
                type: "final",
                sessionId: started.sessionId,
                ...parsed,
              }),
            ),
          );
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              streamLine({
                type: "error",
                error: error instanceof Error ? error.message : "Streaming failed.",
              }),
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
