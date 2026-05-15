import type { AnalysedHandle } from "./analyser";
import { normaliseRenderPlan } from "./render-plan";

export function toIntent(result: AnalysedHandle) {
  const renderPlan = normaliseRenderPlan(result);
  return {
    kind: "agent-driven-web.intent",
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    source: {
      model: result.meta.model,
      analysisSource: result.meta.source,
      latencyMs: result.meta.latencyMs,
    },
    analysis: result.analysis,
    renderPlan,
    suggestedAgentTasks: [
      "Summarise the person's strongest public GitHub signal.",
      "Quote the leading language with its percentage.",
      "List green flags and red flags with evidence.",
    ],
  };
}
