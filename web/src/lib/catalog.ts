import { z } from "zod";

export const componentCatalog = z.enum([
  "HeroQuote",
  "LanguageRing",
  "ActivityHeatmap",
  "RepoSpotlight",
  "TopicGraph",
  "MilestoneTimeline",
  "RedFlagCard",
  "GreenFlagCard",
  "SuperlativeDeck",
  "WorkStyleCard",
  "InfluenceMap",
]);

export type ComponentId = z.infer<typeof componentCatalog>;

export const renderVariant = z.enum([
  "headline",
  "proof",
  "receipt",
  "radar",
  "timeline",
  "constellation",
  "compact",
  "story",
  "warning",
]);

export const renderSize = z.enum(["wide", "standard", "compact"]);

export const visualTreatment = z.enum([
  "loud",
  "calm",
  "dataDense",
  "story",
  "proof",
  "warning",
  "celebration",
]);

export const RenderPlanDisplaySchema = z.object({
  kicker: z.string().min(1).max(48).nullable(),
  title: z.string().min(1).max(140).nullable(),
  body: z.string().min(1).max(360).nullable(),
  bullets: z.array(z.string().min(1).max(140)).max(4).nullable(),
});

export const RenderPlanPickSchema = z.object({
  component: componentCatalog,
  reason: z.string().min(1),
  variant: renderVariant,
  size: renderSize,
  visualTreatment,
  emphasis: z.string().min(1).max(140),
  display: RenderPlanDisplaySchema.nullable(),
});

export const SkippedComponentSchema = z.object({
  component: componentCatalog,
  reason: z.string().min(1),
});

export const RenderPlanSchema = z.object({
  picks: z.array(RenderPlanPickSchema).min(4).max(6),
  skipped: z.array(SkippedComponentSchema).max(11),
  layoutRationale: z.string().min(1).max(360),
});

export type RenderPlan = z.infer<typeof RenderPlanSchema>;
export type RenderPlanDisplay = z.infer<typeof RenderPlanDisplaySchema>;

export function renderPlanDisplay(
  display: Partial<RenderPlanDisplay> | null | undefined,
): RenderPlanDisplay | null {
  if (!display) return null;
  return {
    kicker: display.kicker ?? null,
    title: display.title ?? null,
    body: display.body ?? null,
    bullets: display.bullets ?? null,
  };
}

export const CATALOG_DESCRIPTIONS: Record<ComponentId, string> = {
  HeroQuote: "A single dominant standout finding rendered as a large quote.",
  LanguageRing: "Primary programming languages with percentages and repo counts. Choose it only when languages are a genuinely useful signal, not by habit.",
  ActivityHeatmap: "Last 12 weeks of public contribution density with interpretation.",
  RepoSpotlight: "One repository that best represents the person's current work.",
  TopicGraph: "Inferred topics and connections from repos, descriptions, and activity.",
  MilestoneTimeline: "Five to seven dated events showing the user's public GitHub arc.",
  RedFlagCard: "Up to three honest concerns, only when supported by public data.",
  GreenFlagCard: "Up to three strengths supported by public data.",
  SuperlativeDeck: "A mobile-first deck of memorable awards derived from the creative profile superlatives.",
  WorkStyleCard: "A personality-esque but evidence-grounded read of how the person appears to work.",
  InfluenceMap: "A compact map of public reach: followers, star magnets, and topics that travel.",
};

export const DEFAULT_COMPONENT_ORDER: ComponentId[] = [
  "HeroQuote",
  "WorkStyleCard",
  "SuperlativeDeck",
  "RepoSpotlight",
  "GreenFlagCard",
  "InfluenceMap",
  "LanguageRing",
  "TopicGraph",
  "ActivityHeatmap",
  "MilestoneTimeline",
  "RedFlagCard",
];

export function catalogPrompt(): string {
  return Object.entries(CATALOG_DESCRIPTIONS)
    .map(([id, description]) => `- ${id}: ${description}`)
    .join("\n");
}
