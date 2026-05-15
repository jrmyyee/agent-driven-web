import { createMCPClient } from "@ai-sdk/mcp";
import { generateText } from "ai";
import { performance } from "node:perf_hooks";
import {
  HARNESS_MODEL,
  deterministicAnswer,
  estimateHarnessCost,
  fetchIntent,
  gatewayProviderOptions,
  hasAiGatewayKey,
  isMain,
  printResult,
  requestHeaders,
  successForAnswer,
  taskRelevantIntent,
  totalTokens,
  urlFor,
  type HarnessResult,
  type IntentPayload,
} from "./utils.js";

type McpResource = {
  contents?: Array<{ text?: string; mimeType?: string; uri?: string }>;
};

async function readIntentViaMcp(handle: string) {
  const url = urlFor(`/v/${encodeURIComponent(handle)}/mcp`);
  const client = await createMCPClient({
    transport: {
      type: "http",
      url,
      headers: requestHeaders(),
    },
  });

  try {
    const resource = (await client.readResource({
      uri: `analysis://${handle}`,
    })) as McpResource;
    const text = resource.contents?.map((content) => content.text ?? "").join("\n").trim();
    if (!text) throw new Error("MCP resource returned no text");
    return { text, transport: "mcp" as const, error: undefined };
  } finally {
    await client.close();
  }
}

async function readIntent(handle: string) {
  try {
    return await readIntentViaMcp(handle);
  } catch (error) {
    const intent = await fetchIntent(handle);
    return {
      text: JSON.stringify(intent, null, 2),
      transport: "intent-http" as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runMcp(handle: string): Promise<HarnessResult> {
  const started = performance.now();
  const { text, transport, error } = await readIntent(handle);
  const intent = JSON.parse(text) as IntentPayload;
  const taskPayload = JSON.stringify(taskRelevantIntent(intent), null, 2);

  if (!hasAiGatewayKey()) {
    const answer = deterministicAnswer(
      intent,
      transport === "mcp"
        ? "Read directly from the MCP resource."
        : "Read directly from the HTTP intent fallback.",
    );
    return {
      handle,
      mode: transport,
      transport,
      answer,
      tokens: Math.ceil(taskPayload.length / 4),
      costUSD: 0,
      wallClockMs: Math.round(performance.now() - started),
      success: successForAnswer(answer, intent),
      error,
    };
  }

  const response = await generateText({
    model: HARNESS_MODEL,
    providerOptions: gatewayProviderOptions(HARNESS_MODEL),
    prompt: [
      "You are an agent consuming a structured intent feed.",
      "Task: tell me one interesting thing about this person and quote one primary language with its percentage.",
      "Return a concise answer.",
      "",
      "Task-relevant intent fields:",
      taskPayload,
    ].join("\n"),
  });

  const inputTokens = response.usage.inputTokens ?? 0;
  const outputTokens = response.usage.outputTokens ?? 0;
  return {
    handle,
    mode: transport,
    transport,
    answer: response.text,
    tokens: totalTokens(response.usage),
    costUSD: estimateHarnessCost(inputTokens, outputTokens),
    wallClockMs: Math.round(performance.now() - started),
    success: successForAnswer(response.text, intent),
    error,
  };
}

if (isMain(import.meta.url)) {
  const handle = process.argv[2] ?? "swyxio";
  runMcp(handle)
    .then(printResult)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
