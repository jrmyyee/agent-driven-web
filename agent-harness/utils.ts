import { fileURLToPath } from "node:url";

const DEFAULT_OPENAI_HARNESS_MODEL = "openai/gpt-5.4-nano";
const DEFAULT_ANTHROPIC_HARNESS_MODEL = "anthropic/claude-haiku-4.5";

export const HARNESS_MODEL =
  process.env.HARNESS_MODEL ??
  (process.env.OPENAI_API_KEY ? DEFAULT_OPENAI_HARNESS_MODEL : DEFAULT_ANTHROPIC_HARNESS_MODEL);

export type HarnessResult = {
  handle: string;
  mode: "html-snapshot" | "mcp" | "intent-http";
  answer: string;
  tokens: number;
  costUSD: number;
  wallClockMs: number;
  success: boolean;
  transport?: string;
  error?: string;
};

export type IntentPayload = {
  analysis: {
    handle?: string;
    oneLineSummary: string;
    primaryLanguages: Array<{ lang: string; pct: number; repoCount: number }>;
    spotlightRepo?: {
      name: string;
      oneLine: string;
      why: string;
    } | null;
    greenFlags?: string[];
  };
};

export function baseUrl() {
  return process.env.BASE_URL ?? "http://localhost:3000";
}

export function urlFor(pathname: string) {
  return new URL(pathname, baseUrl()).toString();
}

export function requestHeaders() {
  const headers: Record<string, string> = {};
  if (process.env.VERCEL_COOKIE_HEADER) {
    headers.cookie = process.env.VERCEL_COOKIE_HEADER;
  }
  if (process.env.VERCEL_PROTECTION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] = process.env.VERCEL_PROTECTION_BYPASS_SECRET;
  }
  return headers;
}

export function gatewayProviderOptions(model = HARNESS_MODEL) {
  if (!model.startsWith("openai/")) return undefined;

  return {
    gateway: {
      only: ["openai"],
      ...(process.env.OPENAI_API_KEY
        ? {
            byok: {
              openai: [{ apiKey: process.env.OPENAI_API_KEY }],
            },
          }
        : {}),
    },
  };
}

export function estimateHarnessCost(inputTokens = 0, outputTokens = 0, model = HARNESS_MODEL) {
  if (model === "openai/gpt-5.4-nano") {
    return inputTokens * (0.2 / 1_000_000) + outputTokens * (1.25 / 1_000_000);
  }

  return inputTokens * (1 / 1_000_000) + outputTokens * (5 / 1_000_000);
}

export function hasAiGatewayKey() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL);
}

export function totalTokens(usage: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}) {
  return usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
}

export async function fetchIntent(handle: string): Promise<IntentPayload> {
  const res = await fetch(urlFor(`/v/${encodeURIComponent(handle)}/intent`), {
    headers: { accept: "application/intent+json", ...requestHeaders() },
  });
  if (!res.ok) throw new Error(`intent fetch failed: ${res.status}`);
  return (await res.json()) as IntentPayload;
}

export function successForAnswer(answer: string, intent: IntentPayload) {
  const topLanguage = intent.analysis.primaryLanguages[0];
  if (!topLanguage) return answer.length > 20;
  return (
    answer.toLowerCase().includes(topLanguage.lang.toLowerCase()) &&
    answer.includes(String(topLanguage.pct))
  );
}

export function deterministicAnswer(intent: IntentPayload, evidence: string) {
  const topLanguage = intent.analysis.primaryLanguages[0];
  const languagePhrase = topLanguage
    ? `${topLanguage.lang} at ${topLanguage.pct}%`
    : "no dominant language percentage";
  return `${intent.analysis.oneLineSummary} Primary language signal: ${languagePhrase}. ${evidence}`;
}

export function taskRelevantIntent(intent: IntentPayload) {
  return {
    handle: intent.analysis.handle,
    oneLineSummary: intent.analysis.oneLineSummary,
    primaryLanguages: intent.analysis.primaryLanguages.slice(0, 3),
    spotlightRepo: intent.analysis.spotlightRepo
      ? {
          name: intent.analysis.spotlightRepo.name,
          oneLine: intent.analysis.spotlightRepo.oneLine,
        }
      : null,
    greenFlags: intent.analysis.greenFlags?.slice(0, 2) ?? [],
  };
}

export function isMain(importMetaUrl: string) {
  return process.argv[1] ? fileURLToPath(importMetaUrl) === process.argv[1] : false;
}

export function printResult(result: HarnessResult) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
