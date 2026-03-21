import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";
import {
  getAppTitle,
  getAppUrl,
  getFeatherlessApiKey,
  getFeatherlessBaseUrl,
  getFeatherlessModel,
} from "./env";

const JSON_START = "<<<REFINEMENT_JSON>>>";
const JSON_END = "<<<END_REFINEMENT_JSON>>>";

const refinementMetadataSchema = z.object({
  readyToGenerate: z.boolean(),
  latestPrompt: z.string().min(1),
  canonicalPrompt: z.string().nullable(),
  tips: z.array(z.string()).max(4).default([]),
  title: z.string().min(1),
});

function buildSessionTitle(prompt: string) {
  return prompt.trim().slice(0, 48) || "Untitled model";
}

type RefinementStreamFilter = {
  push: (chunk: string) => string;
  flush: () => string;
};

export function createRefinementStreamFilter(): RefinementStreamFilter {
  let pending = "";
  let insideJsonBlock = false;

  return {
    push(chunk) {
      pending += chunk;
      let visibleText = "";

      while (pending.length > 0) {
        if (insideJsonBlock) {
          const jsonEndIndex = pending.indexOf(JSON_END);
          if (jsonEndIndex < 0) {
            pending = pending.slice(-(JSON_END.length - 1));
            break;
          }

          pending = pending.slice(jsonEndIndex + JSON_END.length);
          insideJsonBlock = false;
          continue;
        }

        const jsonStartIndex = pending.indexOf(JSON_START);
        if (jsonStartIndex < 0) {
          const safeLength = Math.max(0, pending.length - (JSON_START.length - 1));
          visibleText += pending.slice(0, safeLength);
          pending = pending.slice(safeLength);
          break;
        }

        visibleText += pending.slice(0, jsonStartIndex);
        pending = pending.slice(jsonStartIndex + JSON_START.length);
        insideJsonBlock = true;
      }

      return visibleText;
    },
    flush() {
      if (insideJsonBlock) {
        pending = "";
        return "";
      }

      const visibleText = pending;
      pending = "";
      return visibleText;
    },
  };
}

export function createFeatherlessClient() {
  return new OpenAI({
    apiKey: getFeatherlessApiKey(),
    baseURL: getFeatherlessBaseUrl(),
    defaultHeaders: {
      "HTTP-Referer": getAppUrl(),
      "X-Title": getAppTitle(),
    },
  });
}

export function getFeatherlessRefinementModel() {
  return getFeatherlessModel();
}

export function getRefinementSystemPrompt() {
  return [
    "You are a prompt refinement agent for a 3D-print app that generates models in Meshy.",
    "Your job is to turn rough user ideas into printable, Meshy-ready prompts.",
    "The user is chatting with you conversationally. Treat each user turn as feedback, clarification, or a new constraint rather than as the full prompt.",
    "Ask concise clarifying questions when needed, suggest practical tips, and focus on shape, pose, scale, material cues, and printability.",
    "If the prompt still needs work, explain what is missing and ask the most useful next question.",
    "If the prompt is ready, clearly say it is ready and tell the user they can click Generate model.",
    "Keep the user-facing response conversational and concise.",
    `Always end with a machine-readable JSON block wrapped between ${JSON_START} and ${JSON_END}.`,
    "The JSON must have this exact shape:",
    '{"readyToGenerate": boolean, "latestPrompt": string, "canonicalPrompt": string | null, "tips": string[], "title": string}',
    "Set canonicalPrompt to null unless the prompt is ready.",
    "latestPrompt should always contain the current best prompt draft.",
    "title should be a short session title of 2-6 words.",
  ].join(" ");
}

export function toChatMessages(
  currentIdea: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: getRefinementSystemPrompt(),
    },
    ...(currentIdea.trim()
      ? [
          {
            role: "system" as const,
            content: `Current refined prompt draft:\n${currentIdea.trim()}`,
          },
        ]
      : []),
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

export function parseRefinementTranscript(transcript: string, fallbackPrompt: string) {
  const match = transcript.match(
    new RegExp(`${JSON_START}\\s*([\\s\\S]*?)\\s*${JSON_END}`),
  );

  const visibleText = (match ? transcript.slice(0, match.index) : transcript).trim();
  const parsedResult = (() => {
    if (!match) {
      return null;
    }

    try {
      const parsed = JSON.parse(match[1]);
      return refinementMetadataSchema.parse(parsed);
    } catch {
      return null;
    }
  })();

  const latestPrompt = parsedResult?.latestPrompt?.trim() || fallbackPrompt.trim();
  const readyToGenerate = parsedResult?.readyToGenerate ?? false;
  const canonicalPrompt =
    readyToGenerate && parsedResult?.canonicalPrompt?.trim()
      ? parsedResult.canonicalPrompt.trim()
      : null;

  return {
    assistantMessage: visibleText || "Tell me a bit more about the model you want to print.",
    readyToGenerate,
    latestPrompt,
    canonicalPrompt,
    tips: parsedResult?.tips ?? [],
    title: parsedResult?.title?.trim() || buildSessionTitle(latestPrompt),
  };
}
