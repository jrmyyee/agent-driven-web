import {
  DEFAULT_COMPONENT_ORDER,
  RenderPlanSchema,
  type ComponentId,
  type RenderPlan,
} from "./catalog";
import type { GitHubAnalysis, GitHubAnalysisResult } from "./analyser";

function hasData(component: ComponentId, analysis: GitHubAnalysis): boolean {
  switch (component) {
    case "HeroQuote":
      return Boolean(analysis.oneLineSummary);
    case "LanguageRing":
      return analysis.primaryLanguages.length > 0;
    case "ActivityHeatmap":
      return analysis.activityPattern.weeklyDensity.length === 12;
    case "RepoSpotlight":
      return Boolean(analysis.spotlightRepo);
    case "TopicGraph":
      return analysis.inferredTopics.length >= 2;
    case "MilestoneTimeline":
      return analysis.milestones.length >= 2;
    case "RedFlagCard":
      return analysis.redFlags.length > 0;
    case "GreenFlagCard":
      return analysis.greenFlags.length > 0;
    case "SuperlativeDeck":
      return analysis.creativeProfile.superlatives.length > 0;
    case "WorkStyleCard":
      return Boolean(analysis.creativeProfile.personalRead);
    case "InfluenceMap":
      return analysis.profile.followers > 0 || Boolean(analysis.spotlightRepo) || analysis.inferredTopics.length > 0;
  }
}

function fallbackPick(component: ComponentId, reason: string): RenderPlan["picks"][number] {
  const variants: Record<ComponentId, RenderPlan["picks"][number]["variant"]> = {
    HeroQuote: "headline",
    LanguageRing: "proof",
    ActivityHeatmap: "radar",
    RepoSpotlight: "receipt",
    TopicGraph: "constellation",
    MilestoneTimeline: "timeline",
    RedFlagCard: "warning",
    GreenFlagCard: "proof",
    SuperlativeDeck: "compact",
    WorkStyleCard: "story",
    InfluenceMap: "radar",
  };
  const treatments: Record<ComponentId, RenderPlan["picks"][number]["visualTreatment"]> = {
    HeroQuote: "loud",
    LanguageRing: "dataDense",
    ActivityHeatmap: "dataDense",
    RepoSpotlight: "proof",
    TopicGraph: "story",
    MilestoneTimeline: "story",
    RedFlagCard: "warning",
    GreenFlagCard: "celebration",
    SuperlativeDeck: "celebration",
    WorkStyleCard: "story",
    InfluenceMap: "proof",
  };

  return {
    component,
    reason,
    variant: variants[component],
    size: component === "HeroQuote" || component === "SuperlativeDeck" ? "wide" : "standard",
    visualTreatment: treatments[component],
    emphasis: reason,
    display: null,
  };
}

function normalisePickLayout(pick: RenderPlan["picks"][number]): RenderPlan["picks"][number] {
  const normalized = { ...pick, display: pick.display ?? null };
  if (pick.component === "HeroQuote" || pick.component === "SuperlativeDeck") {
    return { ...normalized, size: "wide" };
  }
  return normalized;
}

function sortedFallbackComponents(analysis: GitHubAnalysis): ComponentId[] {
  const scored = Object.entries(analysis.interestingnessScore)
    .filter((entry): entry is [ComponentId, number] =>
      DEFAULT_COMPONENT_ORDER.includes(entry[0] as ComponentId),
    )
    .sort((a, b) => b[1] - a[1])
    .map(([component]) => component);

  return [...scored, ...DEFAULT_COMPONENT_ORDER].filter(
    (component, index, all) => all.indexOf(component) === index,
  );
}

export function normaliseRenderPlan(result: GitHubAnalysisResult): RenderPlan {
  const seen = new Set<ComponentId>();
  const picks: RenderPlan["picks"] = [];
  const incomingPlan = result.renderPlan as Partial<RenderPlan>;

  for (const pick of incomingPlan.picks ?? []) {
    if (seen.has(pick.component)) continue;
    if (!hasData(pick.component, result.analysis)) continue;
    seen.add(pick.component);
    picks.push(normalisePickLayout(pick));
  }

  for (const component of sortedFallbackComponents(result.analysis)) {
    if (picks.length >= 4) break;
    if (seen.has(component)) continue;
    if (!hasData(component, result.analysis)) continue;
    seen.add(component);
    picks.push(
      fallbackPick(
        component,
        `Added as a deterministic fallback from the component score for ${component}.`,
      ),
    );
  }

  for (const component of DEFAULT_COMPONENT_ORDER) {
    if (picks.length >= 4) break;
    if (seen.has(component)) continue;
    seen.add(component);
    picks.push(fallbackPick(component, `Added to keep the render plan complete for ${component}.`));
  }

  const selected = new Set(picks.map((pick) => pick.component));
  const skipped = [
    ...(incomingPlan.skipped ?? []).filter((item) => !selected.has(item.component)),
    ...DEFAULT_COMPONENT_ORDER.filter((component) => !selected.has(component)).map((component) => ({
      component,
      reason: hasData(component, result.analysis)
        ? "Available but lower priority for this profile."
        : "Required data was empty for this profile.",
    })),
  ].filter(
    (item, index, all) =>
      all.findIndex((candidate) => candidate.component === item.component) === index,
  );

  return RenderPlanSchema.parse({
    picks: picks.slice(0, 6),
    skipped,
    layoutRationale:
      incomingPlan.layoutRationale ??
      "The render plan was normalised from the single upstream analysis result.",
  });
}
