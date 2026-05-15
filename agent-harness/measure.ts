import { runHtml } from "./run-html.js";
import { runMcp } from "./run-mcp.js";
import type { HarnessResult } from "./utils.js";

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function p95(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

function summarize(mode: string, results: HarnessResult[]) {
  const tokens = results.map((result) => result.tokens);
  const cost = results.map((result) => result.costUSD);
  const latency = results.map((result) => result.wallClockMs);
  const successRate = results.filter((result) => result.success).length / Math.max(1, results.length);
  return {
    mode,
    runs: results.length,
    meanTokens: Math.round(mean(tokens)),
    p95Tokens: Math.round(p95(tokens)),
    meanCost: mean(cost),
    meanLatencyMs: Math.round(mean(latency)),
    p95LatencyMs: Math.round(p95(latency)),
    successRate,
  };
}

function row(summary: ReturnType<typeof summarize>) {
  return `| ${summary.mode} | ${summary.runs} | ${summary.meanTokens} | ${summary.p95Tokens} | $${summary.meanCost.toFixed(5)} | ${summary.meanLatencyMs} | ${summary.p95LatencyMs} | ${(summary.successRate * 100).toFixed(0)}% |`;
}

async function main() {
  const handles = (process.env.HANDLES ?? "swyxio,jrmyy,simonw")
    .split(",")
    .map((handle) => handle.trim())
    .filter(Boolean);
  const runs = Number(process.env.RUNS ?? "5");
  const htmlResults: HarnessResult[] = [];
  const mcpResults: HarnessResult[] = [];

  for (const handle of handles) {
    for (let index = 0; index < runs; index += 1) {
      htmlResults.push(await runHtml(handle));
      mcpResults.push(await runMcp(handle));
    }
  }

  const html = summarize("html-snapshot", htmlResults);
  const mcp = summarize(
    mcpResults.some((result) => result.mode === "mcp") ? "mcp-or-intent" : "intent-http",
    mcpResults,
  );
  const tokenGap = mcp.meanTokens > 0 ? html.meanTokens / mcp.meanTokens : 0;
  const latencyGap = mcp.meanLatencyMs > 0 ? html.meanLatencyMs / mcp.meanLatencyMs : 0;

  console.log("| Mode | Runs | Mean tokens | P95 tokens | Mean cost | Mean latency ms | P95 latency ms | Success |");
  console.log("|---|---:|---:|---:|---:|---:|---:|---:|");
  console.log(row(html));
  console.log(row(mcp));
  console.log("");
  console.log(`Token gap: ${tokenGap.toFixed(2)}x`);
  console.log(`Latency gap: ${latencyGap.toFixed(2)}x`);
  console.log("Target: 5x. If lower, frame around robustness and direct structured access.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
