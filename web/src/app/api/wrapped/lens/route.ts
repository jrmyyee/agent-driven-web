import { generateText, Output } from "ai";
import { z } from "zod";
import { AnalysisLookupError, getAnalysisForHandle } from "@/lib/analysis-cache";
import { gatewayProviderOptions, HARNESS_MODEL, type GitHubAnalysis } from "@/lib/analyser";
import {
  CATALOG_DESCRIPTIONS,
  RenderPlanSchema,
  catalogPrompt,
  renderPlanDisplay,
  type ComponentId,
  type RenderPlan,
} from "@/lib/catalog";
import { LENS_LABELS, LENS_NAMES, type LensName, type PresetLensName } from "@/lib/lens";
import { normaliseRenderPlan } from "@/lib/render-plan";
import { checkLensAllowed, requestKeyFromHeaders } from "@/lib/usage-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 32 * 1024;
const MAX_INSTRUCTION_CHARS = 500;

const LensNameSchema = z.enum(LENS_NAMES);

const LensPlannerSchema = z.object({
  reply: z.string().min(1).max(1200),
  lens: LensNameSchema,
  lensLabel: z.string().min(1).max(48),
  renderPlan: RenderPlanSchema,
  changeSummary: z.string().min(1).max(360),
});

const structuredLensOutput = (Output.object as (config: unknown) => unknown)({
  name: "WrappedLensPlan",
  description: "A derived GitHub Wrapped render plan for a requested audience lens.",
  schema: LensPlannerSchema,
});

function errorResponse(error: unknown) {
  if (error instanceof AnalysisLookupError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("lens route error", error);
  return Response.json({ error: "Internal error." }, { status: 500 });
}

function comparePlans(
  before: RenderPlan,
  after: RenderPlan,
  summary: string,
) {
  const beforeIds = before.picks.map((pick) => pick.component);
  const afterIds = after.picks.map((pick) => pick.component);

  return {
    summary: cleanSummary(summary),
    added: afterIds.filter((component) => !beforeIds.includes(component)),
    removed: beforeIds.filter((component) => !afterIds.includes(component)),
    retained: afterIds.filter((component) => beforeIds.includes(component)),
  };
}

function cleanSummary(summary: string) {
  const normalized = summary
    .replace(/[*#_`]/g, "")
    .replace(/\s*[-•]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= 220) return normalized;
  return `${normalized.slice(0, 217).replace(/\s+\S*$/, "").replace(/\.+$/, "")}...`;
}

function lensInstruction(lens: LensName) {
  switch (lens) {
    case "recruiter":
      return "Optimize for job fit, credible evidence, role-relevant strengths, current work, cadence, and clear hiring signals. Avoid playful superlatives unless they provide hiring evidence.";
    case "founder":
      return "Optimize for customer-facing clarity, marketable proof, momentum, audience, trust, and a crisp story a founder could use in a pitch.";
    case "technical-peer":
      return "Optimize for implementation depth, technical taste, systems evidence, repo quality, topics, tradeoffs, and signals another senior engineer would respect.";
    case "maintainer":
      return "Optimize for open-source maintainability, contributor fit, project health, collaboration signals, docs, issue surface, and long-term stewardship.";
    case "caveman":
      return "Optimize for blunt, playful cave-man clarity. Use short concrete words in display copy, but keep facts grounded. Prefer speed, stack, newest ship, good signs, and work pattern. Do not add jokes that obscure the evidence.";
    case "custom":
      return "Optimize for the user's requested lens. Infer the audience, tone, and emphasis from the instruction, but stay inside the typed component catalog and the supplied facts. Create a concise lens label.";
  }
}

function deterministicDisplay(
  analysis: GitHubAnalysis,
  lens: LensName,
  label: string,
  pick: RenderPlan["picks"][number],
) {
  const repo = analysis.spotlightRepo;
  if (lens === "caveman") {
    switch (pick.component) {
      case "HeroQuote":
        return renderPlanDisplay({
          kicker: "Big signal",
          title: `${analysis.handle} build thing. Pattern clear.`,
          body: analysis.oneLineSummary,
        });
      case "RepoSpotlight":
        return renderPlanDisplay({
          kicker: "Best rock",
          title: repo?.name ?? "Main project",
          body: repo?.oneLine ?? pick.emphasis,
          bullets: [repo?.why ?? pick.reason].filter(Boolean),
        });
      case "GreenFlagCard":
        return renderPlanDisplay({ title: "Good rock signs", bullets: analysis.greenFlags });
      case "WorkStyleCard":
        return renderPlanDisplay({
          kicker: "How build",
          title: analysis.creativeProfile.motif,
          body: analysis.creativeProfile.personalRead,
        });
      default:
        return undefined;
    }
  }

  if (lens === "recruiter") {
    switch (pick.component) {
      case "HeroQuote":
        return renderPlanDisplay({
          kicker: "Recruiter summary",
          title: analysis.oneLineSummary,
          body: "This view foregrounds job-fit evidence: current work, cadence, stack focus, and strengths.",
        });
      case "RepoSpotlight":
        return renderPlanDisplay({
          kicker: "Current work evidence",
          title: repo?.name ?? "Repo evidence",
          body: repo?.why ?? repo?.oneLine ?? pick.emphasis,
        });
      case "GreenFlagCard":
        return renderPlanDisplay({ title: "Fit signals", bullets: analysis.greenFlags });
      case "WorkStyleCard":
        return renderPlanDisplay({
          kicker: "Working style",
          title: "What this suggests day-to-day",
          body: analysis.creativeProfile.personalRead,
        });
      default:
        return undefined;
    }
  }

  if (lens === "custom") {
    switch (pick.component) {
      case "HeroQuote":
        return renderPlanDisplay({
          kicker: `${label} view`,
          title: analysis.oneLineSummary,
          body: `Same canonical analysis, re-presented for a ${label.toLowerCase()} read.`,
        });
      case "GreenFlagCard":
        return renderPlanDisplay({ title: `${label} signals`, bullets: analysis.greenFlags });
      case "WorkStyleCard":
        return renderPlanDisplay({
          kicker: label,
          title: analysis.creativeProfile.motif,
          body: analysis.creativeProfile.personalRead,
        });
      default:
        return undefined;
    }
  }

  return undefined;
}

function deterministicLensPlan(
  current: RenderPlan,
  lens: LensName,
  analysis: GitHubAnalysis,
  label: string,
): RenderPlan {
  if (lens === "custom") {
    return {
      ...current,
      picks: current.picks.map((pick) => ({
        ...pick,
        display: deterministicDisplay(analysis, lens, label, pick) ?? pick.display,
      })),
      layoutRationale:
        `${label} lens applies constrained display copy over the canonical render plan without changing the analysis.`,
    };
  }

  const preferred: Record<PresetLensName, ComponentId[]> = {
    recruiter: [
      "HeroQuote",
      "RepoSpotlight",
      "MilestoneTimeline",
      "WorkStyleCard",
      "GreenFlagCard",
      "InfluenceMap",
    ],
    founder: [
      "HeroQuote",
      "RepoSpotlight",
      "InfluenceMap",
      "GreenFlagCard",
      "SuperlativeDeck",
      "WorkStyleCard",
    ],
    "technical-peer": [
      "HeroQuote",
      "TopicGraph",
      "RepoSpotlight",
      "LanguageRing",
      "ActivityHeatmap",
      "WorkStyleCard",
    ],
    maintainer: [
      "HeroQuote",
      "MilestoneTimeline",
      "RepoSpotlight",
      "GreenFlagCard",
      "ActivityHeatmap",
      "RedFlagCard",
    ],
    caveman: [
      "HeroQuote",
      "RepoSpotlight",
      "ActivityHeatmap",
      "GreenFlagCard",
      "WorkStyleCard",
      "LanguageRing",
    ],
  };
  const byComponent = new Map(current.picks.map((pick) => [pick.component, pick]));
  const ordered = [
    ...preferred[lens].flatMap((component) => {
      const pick = byComponent.get(component);
      return pick ? [pick] : [];
    }),
    ...current.picks.filter((pick) => !preferred[lens].includes(pick.component)),
  ]
    .slice(0, 6)
    .map((pick) => ({
      ...pick,
      display: deterministicDisplay(analysis, lens, label, pick) ?? pick.display,
    }));

  return {
    ...current,
    picks: ordered.length >= 4 ? ordered : current.picks,
    layoutRationale: `${label} lens reorders the canonical render plan and applies constrained display copy without changing the underlying analysis.`,
  };
}

function ensureVisibleDisplayOverrides(
  renderPlan: RenderPlan,
  analysis: GitHubAnalysis,
  lens: LensName,
  label: string,
): RenderPlan {
  const shouldFill = lens === "custom" || renderPlan.picks.every((pick) => !pick.display);
  if (!shouldFill) return renderPlan;

  return {
    ...renderPlan,
    picks: renderPlan.picks.map((pick) => ({
      ...pick,
      display: pick.display ?? deterministicDisplay(analysis, lens, label, pick) ?? null,
    })),
  };
}

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return Response.json({ error: "Body too large." }, { status: 413 });
    }
    const requestKey = requestKeyFromHeaders(req.headers);
    const guard = checkLensAllowed({ requestKey });
    if (!guard.ok) {
      return Response.json({ error: guard.message }, { status: guard.status });
    }

    const body = (await req.json()) as {
      handle?: string;
      lens?: LensName;
      lensLabel?: string;
      instruction?: string;
      currentRenderPlan?: RenderPlan;
    };
    const lens = LensNameSchema.parse(body.lens);
    const requestedLabel = body.lensLabel?.trim().slice(0, 48) || LENS_LABELS[lens];
    const instruction = body.instruction?.slice(0, MAX_INSTRUCTION_CHARS);
    const handle = (body.handle ?? "").slice(0, 39);
    const result = await getAnalysisForHandle(handle, {
      requestKey,
    });
    const canonicalRenderPlan = normaliseRenderPlan(result);
    const currentRenderPlan = body.currentRenderPlan
      ? RenderPlanSchema.parse(body.currentRenderPlan)
      : canonicalRenderPlan;

    const hasGatewayAuth = Boolean(
      process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY || process.env.VERCEL,
    );

    if (!hasGatewayAuth) {
      const renderPlan = deterministicLensPlan(
        currentRenderPlan,
        lens,
        result.analysis,
        requestedLabel,
      );
      return Response.json({
        reply: `${requestedLabel} view applied using a deterministic fallback over the canonical analysis.`,
        lens,
        lensLabel: requestedLabel,
        renderPlan,
        changeLog: comparePlans(
          currentRenderPlan,
          renderPlan,
          `${requestedLabel} lens updated the current components without another analysis call.`,
        ),
      });
    }

    const modelResult = await generateText({
      model: HARNESS_MODEL,
      providerOptions: gatewayProviderOptions(HARNESS_MODEL),
      output: structuredLensOutput as never,
      system: [
        "You re-compose a GitHub Wrapped human interface for a requested audience lens.",
        "You must use only the supplied canonical analysis. Do not invent private data or new GitHub facts.",
        "Return a constrained renderPlan that chooses from the typed component catalog only; do not generate JSX, CSS, or arbitrary UI.",
        "This is a derived view over the same source of truth, not a new analysis.",
        "Pick 4-6 components. Reorder and rewrite pick reasons/emphasis for the requested audience.",
        "Every renderPlan pick must include display. Set display to null when no copy override is needed.",
        "Use display overrides when the requested lens should visibly change labels or card copy. Display fields are constrained copy only: kicker, title, body, bullets. If display is present, include all four keys and set unused fields to null.",
        "Display overrides must stay grounded in the supplied analysis and must not invent new repos, metrics, dates, claims, or UI components.",
        "Do not include components whose required data would be empty.",
        "Return lensLabel as a concise human-readable label for the active lens. For custom requests, infer it from the user's instruction.",
        "The reply should state that the lens was applied and summarize the meaningful component changes in 2-5 bullets.",
        `Audience lens: ${requestedLabel}. ${lensInstruction(lens)}`,
        "Catalog:\n" + catalogPrompt(),
      ].join("\n"),
      prompt: JSON.stringify(
        {
          lens,
          lensLabel: requestedLabel,
          instruction,
          analysis: result.analysis,
          currentRenderPlan,
          canonicalRenderPlan,
          componentCatalog: CATALOG_DESCRIPTIONS,
        },
        null,
        2,
      ),
      maxOutputTokens: 1600,
    });

    const parsed = LensPlannerSchema.parse(modelResult.output);
    const renderPlan = ensureVisibleDisplayOverrides(
      normaliseRenderPlan({
        analysis: result.analysis,
        renderPlan: parsed.renderPlan,
      }),
      result.analysis,
      parsed.lens,
      parsed.lensLabel,
    );

    return Response.json({
      reply: parsed.reply,
      lens: parsed.lens,
      lensLabel: parsed.lensLabel,
      renderPlan,
      changeLog: comparePlans(currentRenderPlan, renderPlan, parsed.changeSummary),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
