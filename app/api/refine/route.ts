import { fetchAction, fetchMutation, fetchQuery } from "convex/nextjs";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  buildSystemInstruction,
  createGeminiClient,
  createRefinementStreamFilter,
  getGeminiRefinementModel,
  parseRefinementTranscript,
  toGeminiContents,
} from "@/lib/server/refinement";
import { requireRouteToken, routeErrorResponse } from "@/lib/server/route-utils";

const refineRequestSchema = z
  .object({
    sessionId: z.string().nullable(),
    message: z.string().max(2000),
    attachmentStorageId: z.string().min(1).optional().nullable(),
    attachmentContentType: z.string().max(120).optional().nullable(),
  })
  .refine(
    (data) =>
      data.message.trim().length > 0 ||
      (data.attachmentStorageId !== null &&
        data.attachmentStorageId !== undefined &&
        data.attachmentStorageId.length > 0),
    { message: "Add a message or attach a reference image or sketch." },
  );

function streamLine(payload: unknown) {
  return `${JSON.stringify(payload)}\n`;
}

export async function POST(request: Request) {
  try {
    const token = await requireRouteToken();
    const body = refineRequestSchema.parse(await request.json());

    const attachmentStorageId =
      body.attachmentStorageId && body.attachmentStorageId.length > 0
        ? (body.attachmentStorageId as Id<"_storage">)
        : undefined;

    const started = await fetchMutation(
      api.app.beginRefinementTurn,
      {
        sessionId: body.sessionId as Id<"refinementSessions"> | null,
        message: body.message.trim(),
        attachmentStorageId,
        attachmentContentType: body.attachmentContentType?.trim() || undefined,
      },
      { token },
    );

    const conversation = await fetchQuery(
      api.app.getSessionConversation,
      { sessionId: started.sessionId },
      { token },
    );

    const attachmentPayloads = await fetchAction(
      api.app.loadRefinementAttachmentPayloads,
      { sessionId: started.sessionId },
      { token },
    );

    const client = createGeminiClient();
    const encoder = new TextEncoder();

    const systemInstruction = buildSystemInstruction(
      conversation.session.latestPrompt,
    );

    const historyMessages = conversation.messages.filter(
      (message) => message.role === "user" || message.role === "assistant",
    );

    const contents = toGeminiContents(
      historyMessages.map((message) => {
        const payload =
          message.role === "user" ? attachmentPayloads[message._id] : undefined;
        return {
          role: message.role as "user" | "assistant",
          content: message.content,
          attachment: payload
            ? { mimeType: payload.mimeType, base64: payload.base64 }
            : null,
        };
      }),
    );

    const fallbackUserText =
      [...historyMessages].reverse().find((m) => m.role === "user")?.content?.trim() ||
      body.message.trim();

    const response = await client.models.generateContentStream({
      model: getGeminiRefinementModel(),
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

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

          for await (const chunk of response) {
            const delta = chunk.text;
            if (!delta) {
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
            conversation.session.latestPrompt.trim() || fallbackUserText,
          );

          await fetchMutation(
            api.app.completeRefinementTurn,
            {
              sessionId: started.sessionId,
              assistantMessage: parsed.assistantMessage,
              latestPrompt: parsed.latestPrompt,
              canonicalPrompt: parsed.canonicalPrompt,
              readyToGenerate: parsed.readyToGenerate,
              tips: parsed.nextPrompts,
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
