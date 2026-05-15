import { generateText } from "ai";
import { chromium } from "playwright";
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
  totalTokens,
  urlFor,
  type HarnessResult,
} from "./utils.js";

export async function runHtml(handle: string): Promise<HarnessResult> {
  const started = performance.now();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      extraHTTPHeaders: requestHeaders(),
    });
    const page = await context.newPage();
    await page.goto(urlFor(`/v/${encodeURIComponent(handle)}`), {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    const snapshot = await page.locator("body").ariaSnapshot();
    const intent = await fetchIntent(handle);

    if (!hasAiGatewayKey()) {
      const topLanguage = intent.analysis.primaryLanguages[0];
      const evidence =
        topLanguage &&
        snapshot.toLowerCase().includes(topLanguage.lang.toLowerCase()) &&
        snapshot.includes(String(topLanguage.pct))
          ? "Verified from the accessibility snapshot."
          : "Accessibility snapshot captured, but deterministic fallback could not verify the top language text.";
      const answer = deterministicAnswer(intent, evidence);

      return {
        handle,
        mode: "html-snapshot",
        answer,
        tokens: Math.ceil(snapshot.length / 4),
        costUSD: 0,
        wallClockMs: Math.round(performance.now() - started),
        success: successForAnswer(answer, intent),
        transport: "deterministic-fallback",
      };
    }

    const response = await generateText({
      model: HARNESS_MODEL,
      providerOptions: gatewayProviderOptions(HARNESS_MODEL),
      prompt: [
        "You are an agent reading a human web surface via an accessibility snapshot.",
        "Task: tell me one interesting thing about this person and quote one primary language with its percentage.",
        "Return a concise answer.",
        "",
        "Accessibility snapshot:",
        snapshot,
      ].join("\n"),
    });

    const inputTokens = response.usage.inputTokens ?? 0;
    const outputTokens = response.usage.outputTokens ?? 0;
    return {
      handle,
      mode: "html-snapshot",
      answer: response.text,
      tokens: totalTokens(response.usage),
      costUSD: estimateHarnessCost(inputTokens, outputTokens),
      wallClockMs: Math.round(performance.now() - started),
      success: successForAnswer(response.text, intent),
    };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const handle = process.argv[2] ?? "swyxio";
  runHtml(handle)
    .then(printResult)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
