import { generateText, Output } from "ai";
import { z } from "zod";
import {
  CATALOG_DESCRIPTIONS,
  RenderPlanSchema,
  catalogPrompt,
  type ComponentId,
  type RenderPlan,
} from "./catalog";
import type { GhEvent, GhRepo, GhUser, GitHubFetchResult } from "./github";

const DEFAULT_OPENAI_ANALYSIS_MODEL = "openai/gpt-5.1-instant";
const DEFAULT_OPENAI_HARNESS_MODEL = "openai/gpt-5.4-nano";
const DEFAULT_ANTHROPIC_ANALYSIS_MODEL = "anthropic/claude-sonnet-4.6";
const DEFAULT_ANTHROPIC_HARNESS_MODEL = "anthropic/claude-haiku-4.5";

const prefersOpenAiByok = Boolean(process.env.OPENAI_API_KEY);

export const ANALYSIS_MODEL =
  process.env.ANALYSIS_MODEL ??
  (prefersOpenAiByok ? DEFAULT_OPENAI_ANALYSIS_MODEL : DEFAULT_ANTHROPIC_ANALYSIS_MODEL);
export const HARNESS_MODEL =
  process.env.HARNESS_MODEL ??
  (prefersOpenAiByok ? DEFAULT_OPENAI_HARNESS_MODEL : DEFAULT_ANTHROPIC_HARNESS_MODEL);

const LanguageSchema = z.object({
  lang: z.string(),
  pct: z.number().min(0).max(100),
  repoCount: z.number().int().min(0),
});

const InterestingnessScoreSchema = z.object({
  HeroQuote: z.number().min(0).max(10),
  LanguageRing: z.number().min(0).max(10),
  ActivityHeatmap: z.number().min(0).max(10),
  RepoSpotlight: z.number().min(0).max(10),
  TopicGraph: z.number().min(0).max(10),
  MilestoneTimeline: z.number().min(0).max(10),
  RedFlagCard: z.number().min(0).max(10),
  GreenFlagCard: z.number().min(0).max(10),
  SuperlativeDeck: z.number().min(0).max(10),
  WorkStyleCard: z.number().min(0).max(10),
  InfluenceMap: z.number().min(0).max(10),
});

const CreativeProfileSchema = z.object({
  archetype: z.enum([
    "Public Signal",
    "Shipping Loop",
    "Polyglot Operator",
    "Idea Cartographer",
    "Repository Anchor",
    "Steady Builder",
    "Quiet Signal",
  ]),
  energy: z.number().min(0).max(10),
  motif: z.string(),
  palette: z.enum(["signal", "orbit", "forge", "garden", "pulse", "archive"]),
  animationPreset: z.enum([
    "constellation",
    "pulseGrid",
    "orbitRings",
    "repoCascade",
    "quietBloom",
    "terminalRain",
  ]),
  personalRead: z.string(),
  statSpin: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        interpretation: z.string(),
      }),
    )
    .min(2)
    .max(4),
  superlatives: z
    .array(
      z.object({
        title: z.string(),
        reason: z.string(),
      }),
    )
    .max(3),
});

const GitHubAnalysisSchema = z.object({
  handle: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  profile: z.object({
    bio: z.string().nullable(),
    company: z.string().nullable(),
    location: z.string().nullable(),
    publicRepoCount: z.number().int().min(0),
    followers: z.number().int().min(0),
    createdAt: z.string(),
  }),
  oneLineSummary: z.string(),
  creativeProfile: CreativeProfileSchema,
  primaryLanguages: z.array(LanguageSchema).max(5),
  activityPattern: z.object({
    weeklyDensity: z.array(z.number().min(0).max(10)).length(12),
    interpretation: z.string(),
  }),
  spotlightRepo: z
    .object({
      name: z.string(),
      oneLine: z.string(),
      why: z.string(),
      url: z.string().nullable(),
      stars: z.number().int().min(0),
    })
    .nullable(),
  inferredTopics: z
    .array(
      z.object({
        topic: z.string(),
        strength: z.number().min(0).max(10),
        evidence: z.string(),
      }),
    )
    .max(5),
  milestones: z
    .array(
      z.object({
        date: z.string(),
        event: z.string(),
      }),
    )
    .max(7),
  greenFlags: z.array(z.string()).max(3),
  redFlags: z.array(z.string()).max(3),
  interestingnessScore: InterestingnessScoreSchema,
});

export const GitHubAnalysisResultSchema = z.object({
  analysis: GitHubAnalysisSchema,
  renderPlan: RenderPlanSchema,
});

export type GitHubAnalysis = z.infer<typeof GitHubAnalysisSchema>;
export type GitHubAnalysisResult = z.infer<typeof GitHubAnalysisResultSchema>;

export type AnalysisMeta = {
  model: string;
  source: "ai-gateway" | "deterministic-fallback";
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  error?: string;
};

export type AnalysedHandle = GitHubAnalysisResult & {
  meta: AnalysisMeta;
};

type GitHubOk = Extract<GitHubFetchResult, { ok: true }>;

const structuredAnalysisOutput = (Output.object as (config: unknown) => unknown)({
  name: "GitHubAnalysisResult",
  description: "A GitHub user's structured analysis and constrained JSON render plan.",
  schema: GitHubAnalysisResultSchema,
});

export function gatewayProviderOptions(model: string) {
  if (!model.startsWith("openai/")) return undefined;

  return {
    gateway: {
      // Force the OpenAI provider so BYOK/OpenAI credits are used when configured,
      // instead of Gateway dynamically routing this OpenAI model to Azure.
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

function cleanRepo(repo: GhRepo) {
  return {
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    fork: repo.fork,
    archived: repo.archived,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    pushedAt: repo.pushed_at,
    createdAt: repo.created_at,
    topics: repo.topics,
    homepage: repo.homepage,
  };
}

function promptPayload(data: GitHubOk) {
  return {
    user: {
      login: data.user.login,
      name: data.user.name,
      bio: data.user.bio,
      publicRepos: data.user.public_repos,
      followers: data.user.followers,
      following: data.user.following,
      createdAt: data.user.created_at,
      updatedAt: data.user.updated_at,
      company: data.user.company,
      location: data.user.location,
      blog: data.user.blog,
      twitter: data.user.twitter_username,
      avatarUrl: data.user.avatar_url,
    },
    repos: data.repos.slice(0, 60).map(cleanRepo),
    recentActivity: data.recentActivity.slice(0, 30).map((event) => ({
      type: event.type,
      createdAt: event.created_at,
      repo: event.repo.name,
    })),
    componentCatalog: CATALOG_DESCRIPTIONS,
  };
}

function languageStats(repos: GhRepo[]) {
  const counts = new Map<string, number>();
  const sourceRepos = repos.filter((repo) => !repo.fork);
  for (const repo of sourceRepos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, repoCount]) => ({
      lang,
      repoCount,
      pct: Math.round((repoCount / total) * 100),
    }));
}

function activityDensity(events: GhEvent[]) {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const buckets = Array.from({ length: 12 }, () => 0);
  for (const event of events) {
    const age = now - new Date(event.created_at).getTime();
    const index = 11 - Math.floor(age / weekMs);
    if (index >= 0 && index < buckets.length) buckets[index] += 1;
  }
  const max = Math.max(...buckets, 1);
  return buckets.map((count) => Math.min(10, Math.round((count / max) * 10)));
}

function topTopics(repos: GhRepo[]) {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    for (const topic of repo.topics ?? []) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
    if (repo.language) {
      counts.set(repo.language.toLowerCase(), (counts.get(repo.language.toLowerCase()) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({
      topic,
      strength: Math.min(10, Math.max(1, count * 2)),
      evidence: `${count} public repo${count === 1 ? "" : "s"} reference this topic.`,
    }));
}

function spotlightRepo(repos: GhRepo[]) {
  const repo = [...repos]
    .filter((item) => !item.fork)
    .sort((a, b) => {
      const starDelta = b.stargazers_count - a.stargazers_count;
      if (starDelta !== 0) return starDelta;
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
    })[0];
  if (!repo) return null;
  return {
    name: repo.name,
    oneLine: repo.description ?? `${repo.name} is the most visible public repository here.`,
    why:
      repo.stargazers_count > 0
        ? `It has ${repo.stargazers_count} stars and gives the strongest public signal.`
        : "It is one of the clearest source repositories in the account.",
    url: `https://github.com/${repo.full_name}`,
    stars: repo.stargazers_count,
  };
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function activeRepoCount(repos: GhRepo[]) {
  return repos.filter((repo) => !repo.archived && !repo.fork).length;
}

function totalStars(repos: GhRepo[]) {
  return repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
}

function topicVariety(repos: GhRepo[]) {
  const topics = new Set<string>();
  for (const repo of repos) {
    for (const topic of repo.topics ?? []) topics.add(topic);
    if (repo.language) topics.add(repo.language.toLowerCase());
  }
  return topics.size;
}

function buildCreativeProfile(
  user: GhUser,
  repos: GhRepo[],
  events: GhEvent[],
  languages: ReturnType<typeof languageStats>,
  activity: number[],
  repo: ReturnType<typeof spotlightRepo>,
  topics: ReturnType<typeof topTopics>,
): GitHubAnalysis["creativeProfile"] {
  const activeRepos = activeRepoCount(repos);
  const stars = totalStars(repos);
  const topicCount = topicVariety(repos);
  const activeWeeks = activity.filter((value) => value > 0).length;
  const topLanguage = languages[0];
  const leadingTopic = topics[0]?.topic;
  const isThin = repos.length === 0 || (activeRepos < 3 && events.length < 3);
  const energy = Math.min(
    10,
    Math.max(
      1,
      Math.round(events.length * 0.22 + activeRepos * 0.28 + activeWeeks * 0.35 + Math.min(2, stars / 500)),
    ),
  );

  const archetype: GitHubAnalysis["creativeProfile"]["archetype"] = isThin
    ? "Quiet Signal"
    : stars >= 1000 || user.followers >= 5000
      ? "Public Signal"
      : events.length >= 20
        ? "Shipping Loop"
        : languages.length >= 4
          ? "Polyglot Operator"
          : topicCount >= 8
            ? "Idea Cartographer"
            : repo && repo.stars >= 10
              ? "Repository Anchor"
              : "Steady Builder";

  const paletteByLanguage: Record<string, GitHubAnalysis["creativeProfile"]["palette"]> = {
    javascript: "signal",
    typescript: "signal",
    python: "orbit",
    rust: "forge",
    go: "forge",
    c: "forge",
    "c++": "forge",
    ruby: "pulse",
    php: "pulse",
    css: "garden",
    html: "garden",
    svelte: "garden",
    vue: "garden",
  };
  const palette =
    isThin
      ? "archive"
      : topLanguage
        ? (paletteByLanguage[topLanguage.lang.toLowerCase()] ?? "orbit")
        : "archive";

  const animationPreset: GitHubAnalysis["creativeProfile"]["animationPreset"] = isThin
    ? "quietBloom"
    : events.length >= 20
      ? "pulseGrid"
      : languages.length >= 4
        ? "constellation"
        : topicCount >= 8
          ? "orbitRings"
          : repo
            ? "repoCascade"
            : "terminalRain";

  const motif =
    archetype === "Public Signal"
      ? "broadcast tower"
      : archetype === "Shipping Loop"
        ? "release radar"
        : archetype === "Polyglot Operator"
          ? "multi-tool console"
          : archetype === "Idea Cartographer"
            ? "map of recurring ideas"
            : archetype === "Repository Anchor"
              ? "flagship project spotlight"
              : archetype === "Quiet Signal"
                ? "low-noise archive"
                : "workbench in motion";

  const personalRead = isThin
    ? `The public surface for ${user.login} is deliberately compact, so the honest read is restraint: fewer artifacts, but cleaner signals to inspect.`
    : events.length >= 20
      ? `${user.login} reads like someone who keeps work in circulation: the recent event stream is doing more storytelling than the profile bio.`
      : languages.length >= 4
        ? `${user.login} has a portfolio shape that looks exploratory rather than narrow, with ${languages.length} visible language lanes.`
        : repo
          ? `${user.login}'s public identity is anchored by ${repo.name}; the rest of the profile reads around that project as context.`
          : `${user.login} looks like a steady builder whose public GitHub signal comes from cumulative traces rather than one loud metric.`;

  const statSpin = [
    {
      label: "Public surface",
      value: `${activeRepos}/${repos.length}`,
      interpretation:
        activeRepos === repos.length
          ? "Nearly everything visible is live source, not archived shelf-space."
          : `${activeRepos} active non-fork repos are the clearest inspectable work sample.`,
    },
    {
      label: "Top language",
      value: topLanguage ? `${topLanguage.lang} ${topLanguage.pct}%` : "No dominant language",
      interpretation: topLanguage
        ? `${topLanguage.lang} is the strongest machine-readable style signal.`
        : "The account does not expose enough language metadata for a confident read.",
    },
    {
      label: "Recent pulse",
      value: `${events.length} events`,
      interpretation:
        events.length > 0
          ? `${activeWeeks} of the last 12 weeks show public activity.`
          : "The recent public event stream is quiet, so the demo leans on repos instead.",
    },
    {
      label: "Signal magnet",
      value: repo ? repo.name : "None yet",
      interpretation: repo
        ? `${compactNumber(repo.stars)} stars make this the easiest entry point.`
        : "No single public repo stands out enough to crown.",
    },
  ];

  const superlatives = [
    repo
      ? {
          title: "Most rewatchable artifact",
          reason: `${repo.name} carries the strongest public repository signal.`,
        }
      : null,
    leadingTopic
      ? {
          title: "Most repeated clue",
          reason: `${leadingTopic} keeps appearing across the public sample.`,
        }
      : null,
    {
      title: energy >= 7 ? "Highest tempo" : "Cleanest read",
      reason:
        energy >= 7
          ? "The recent activity and repository surface combine into a high-motion profile."
          : "The profile leaves enough signal to analyse without pretending the data says more than it does.",
    },
  ].filter((item): item is { title: string; reason: string } => Boolean(item));

  return {
    archetype,
    energy,
    motif,
    palette,
    animationPreset,
    personalRead,
    statSpin,
    superlatives: superlatives.slice(0, 3),
  };
}

function buildMilestones(user: GhUser, repos: GhRepo[], events: GhEvent[]) {
  const milestones = [
    { date: user.created_at.slice(0, 10), event: `Joined GitHub as ${user.login}.` },
  ];
  const firstRepo = [...repos].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
  if (firstRepo) {
    milestones.push({
      date: firstRepo.created_at.slice(0, 10),
      event: `Created ${firstRepo.name}, the earliest public repo in this sample.`,
    });
  }
  const mostStarred = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
  if (mostStarred && mostStarred.stargazers_count > 0) {
    milestones.push({
      date: mostStarred.pushed_at.slice(0, 10),
      event: `${mostStarred.name} became the strongest public signal with ${mostStarred.stargazers_count} stars.`,
    });
  }
  const recent = events[0];
  if (recent) {
    milestones.push({
      date: recent.created_at.slice(0, 10),
      event: `Recent public activity on ${recent.repo.name}.`,
    });
  }
  return milestones.slice(0, 7);
}

function scoreDefaults(analysis: GitHubAnalysis): GitHubAnalysis["interestingnessScore"] {
  return {
    HeroQuote: 9,
    LanguageRing: analysis.primaryLanguages.length > 0 ? Math.min(8, 4 + analysis.primaryLanguages.length) : 1,
    ActivityHeatmap: analysis.activityPattern.weeklyDensity.some((value) => value > 0) ? 7 : 2,
    RepoSpotlight: analysis.spotlightRepo ? 8 : 1,
    TopicGraph: analysis.inferredTopics.length >= 3 ? 8 : 3,
    MilestoneTimeline: analysis.milestones.length >= 3 ? 6 : 2,
    RedFlagCard: analysis.redFlags.length > 0 ? 6 : 0,
    GreenFlagCard: analysis.greenFlags.length > 0 ? 8 : 2,
    SuperlativeDeck: analysis.creativeProfile.superlatives.length >= 2 ? 8 : 3,
    WorkStyleCard: analysis.creativeProfile.personalRead ? 8 : 2,
    InfluenceMap: analysis.profile.followers > 0 || (analysis.spotlightRepo?.stars ?? 0) > 0 ? 8 : 3,
  };
}

function scaleMaybeUnitInterval(value: number) {
  if (value > 0 && value <= 1) return Math.round(value * 100) / 10;
  return value;
}

function normaliseScaledFields(result: GitHubAnalysisResult): GitHubAnalysisResult {
  const interestingnessScore = Object.fromEntries(
    Object.entries(result.analysis.interestingnessScore).map(([key, value]) => [
      key,
      scaleMaybeUnitInterval(value),
    ]),
  ) as GitHubAnalysis["interestingnessScore"];

  return {
    ...result,
    analysis: {
      ...result.analysis,
      creativeProfile: {
        ...result.analysis.creativeProfile,
        energy: scaleMaybeUnitInterval(result.analysis.creativeProfile.energy),
      },
      activityPattern: {
        ...result.analysis.activityPattern,
        weeklyDensity: result.analysis.activityPattern.weeklyDensity.map(scaleMaybeUnitInterval),
      },
      inferredTopics: result.analysis.inferredTopics.map((topic) => ({
        ...topic,
        strength: scaleMaybeUnitInterval(topic.strength),
      })),
      interestingnessScore,
    },
  };
}

function deterministicPick(component: ComponentId, reason: string): RenderPlan["picks"][number] {
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

function deterministicResult(data: GitHubOk, source: AnalysisMeta["source"], latencyMs: number, error?: string): AnalysedHandle {
  const languages = languageStats(data.repos);
  const activity = activityDensity(data.recentActivity);
  const repo = spotlightRepo(data.repos);
  const topics = topTopics(data.repos);
  const activeRepos = activeRepoCount(data.repos);
  const analysis: GitHubAnalysis = {
    handle: data.user.login,
    displayName: data.user.name,
    avatarUrl: data.user.avatar_url,
    profile: {
      bio: data.user.bio,
      company: data.user.company,
      location: data.user.location,
      publicRepoCount: data.user.public_repos,
      followers: data.user.followers,
      createdAt: data.user.created_at,
    },
    oneLineSummary:
      languages[0]?.lang && repo
        ? `${data.user.login} has a public GitHub footprint led by ${languages[0].lang} and ${repo.name}.`
        : `${data.user.login} has a compact public GitHub footprint with limited machine-readable signals.`,
    creativeProfile: buildCreativeProfile(
      data.user,
      data.repos,
      data.recentActivity,
      languages,
      activity,
      repo,
      topics,
    ),
    primaryLanguages: languages,
    activityPattern: {
      weeklyDensity: activity,
      interpretation: activity.some((value) => value > 0)
        ? "Recent public activity is visible in the last twelve-week window."
        : "No recent public events were visible in the sampled activity window.",
    },
    spotlightRepo: repo,
    inferredTopics: topics,
    milestones: buildMilestones(data.user, data.repos, data.recentActivity),
    greenFlags: [
      activeRepos > 0 ? `${activeRepos} non-fork public repos provide inspectable work.` : "",
      data.user.followers > 0 ? `${data.user.followers} followers indicate some public visibility.` : "",
      languages[0] ? `${languages[0].lang} appears as the leading language signal.` : "",
    ].filter(Boolean).slice(0, 3),
    redFlags: [
      data.repos.length === 0 ? "No public repositories were available to analyse." : "",
      data.recentActivity.length === 0 ? "No recent public activity was returned by GitHub." : "",
      activeRepos < 3 ? "The public sample is thin, so conclusions should stay modest." : "",
    ].filter(Boolean).slice(0, 3),
    interestingnessScore: {
      HeroQuote: 0,
      LanguageRing: 0,
      ActivityHeatmap: 0,
      RepoSpotlight: 0,
      TopicGraph: 0,
      MilestoneTimeline: 0,
      RedFlagCard: 0,
      GreenFlagCard: 0,
      SuperlativeDeck: 0,
      WorkStyleCard: 0,
      InfluenceMap: 0,
    },
  };
  analysis.interestingnessScore = scoreDefaults(analysis);
  const sorted = Object.entries(analysis.interestingnessScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([component]) =>
      deterministicPick(
        component as ComponentId,
        `Deterministic fallback selected ${component} from the component scores.`,
      ),
    );
  const selected = new Set(sorted.map((pick) => pick.component));
  return {
    analysis,
    renderPlan: {
      picks: sorted,
      skipped: Object.keys(analysis.interestingnessScore)
        .filter((component) => !selected.has(component as ComponentId))
        .map((component) => ({
          component: component as ComponentId,
          reason: "Lower deterministic score for this profile.",
        })),
      layoutRationale:
        "Deterministic fallback ranked the typed catalog by available public GitHub signal and selected the strongest slots.",
    },
    meta: {
      model: ANALYSIS_MODEL,
      source,
      latencyMs,
      error,
    },
  };
}

export async function analyseGitHubData(data: GitHubOk): Promise<AnalysedHandle> {
  const started = Date.now();
  const hasGatewayAuth = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY || process.env.VERCEL,
  );
  if (!hasGatewayAuth) {
    return deterministicResult(
      data,
      "deterministic-fallback",
      Date.now() - started,
      "AI_GATEWAY_API_KEY not set locally",
    );
  }

  try {
    const result = await generateText({
      model: ANALYSIS_MODEL,
      providerOptions: gatewayProviderOptions(ANALYSIS_MODEL),
      output: structuredAnalysisOutput as never,
      system: [
        "You analyse a GitHub user's public data.",
        "Return a structured analysis plus a constrained JSON render plan.",
        "Be specific, memorable, and honest. Never be snarky.",
        "The creativeProfile drives a typed Wrapped-style frontend: choose the exact archetype, palette, and animationPreset that best fits the evidence.",
        "All score-like numbers use a 0-10 scale, not a 0-1 confidence scale.",
        "The personalRead may be personality-esque, but it must be grounded in visible repos, languages, topics, followers, or activity. If the public sample is thin, say so instead of inventing certainty.",
        "Make statSpin translate raw stats into meaning; avoid generic statements that would fit every GitHub user.",
        "Keep output concise enough for a live demo: personalRead is 1-2 sentences; each stat interpretation is one short sentence; each milestone is one sentence.",
        "Only flag red flags when they are directly supported by the data.",
        "The render plan must pick 4-6 components from the catalog and include skipped components for catalog items you did not select.",
        "Do not pick the same components by habit. LanguageRing is optional: pick it only when languages help explain this specific user.",
        "Use variant, size, visualTreatment, and emphasis to make the Wrapped feel tailored while staying inside the typed catalog.",
        "Every renderPlan pick must include display. For the canonical view, set display to null unless a small copy override is genuinely useful. If display is present, include kicker, title, body, and bullets, using null for unused fields.",
        "layoutRationale should explain the composition in one clear sentence.",
        "Do not pick a component if its required data slot is empty.",
        "Catalog:\n" + catalogPrompt(),
      ].join("\n"),
      prompt: JSON.stringify(promptPayload(data), null, 2),
      temperature: 0.45,
      maxOutputTokens: 2200,
    });

    const parsed = normaliseScaledFields(GitHubAnalysisResultSchema.parse(result.output));
    return {
      ...parsed,
      meta: {
        model: ANALYSIS_MODEL,
        source: "ai-gateway",
        latencyMs: Date.now() - started,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
      },
    };
  } catch (error) {
    return deterministicResult(
      data,
      "deterministic-fallback",
      Date.now() - started,
      error instanceof Error ? error.message : String(error),
    );
  }
}
