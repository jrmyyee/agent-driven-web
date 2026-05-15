"use client";

import { useEffect, useState } from "react";
import { CreativeIntro } from "@/components/CreativeIntro";
import { DecisionLog } from "@/components/DecisionLog";
import { RenderPlannedComponent } from "@/components/registry";
import { WrappedInspectorChat } from "@/components/WrappedInspectorChat";
import type { AnalysedHandle, GitHubAnalysis } from "@/lib/analyser";
import type { ComponentId, RenderPlan } from "@/lib/catalog";
import { LENS_LABELS, type LensApplyResponse, type LensChangeLog, type LensName } from "@/lib/lens";

function wireframeBlocks(component: ComponentId) {
  switch (component) {
    case "HeroQuote":
      return (
        <>
          <span className="wireframe-line wireframe-line-kicker" />
          <span className="wireframe-line wireframe-line-hero" />
          <span className="wireframe-line wireframe-line-hero short" />
        </>
      );
    case "LanguageRing":
      return (
        <div className="wireframe-split">
          <span className="wireframe-ring" />
          <div className="wireframe-stack">
            <span className="wireframe-line" />
            <span className="wireframe-line short" />
            <span className="wireframe-line tiny" />
          </div>
        </div>
      );
    case "ActivityHeatmap":
      return (
        <div className="wireframe-bars" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      );
    case "RepoSpotlight":
      return (
        <>
          <span className="wireframe-line wireframe-line-title" />
          <span className="wireframe-line" />
          <span className="wireframe-line short" />
          <div className="wireframe-metrics">
            <i />
            <i />
          </div>
        </>
      );
    case "TopicGraph":
      return (
        <div className="wireframe-nodes" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      );
    case "MilestoneTimeline":
      return (
        <div className="wireframe-timeline" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      );
    case "RedFlagCard":
    case "GreenFlagCard":
      return (
        <div className="wireframe-bullets" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      );
    case "SuperlativeDeck":
      return (
        <div className="wireframe-deck" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      );
    case "WorkStyleCard":
      return (
        <>
          <span className="wireframe-line wireframe-line-title" />
          <span className="wireframe-line" />
          <span className="wireframe-line" />
          <span className="wireframe-line short" />
        </>
      );
    case "InfluenceMap":
      return (
        <div className="wireframe-metric-grid" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      );
  }
}

function componentLabel(component: ComponentId) {
  return component.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function ConfirmedPlanWireframe({ pick }: { pick: RenderPlan["picks"][number] }) {
  return (
    <article className="wrapped-card confirmed-wireframe-card" aria-label={`${pick.component} slot confirmed`}>
      <span className="confirmed-wireframe-label">{componentLabel(pick.component)}</span>
      <div className="confirmed-wireframe-body">{wireframeBlocks(pick.component)}</div>
    </article>
  );
}

export function WrappedExperience({
  analysis,
  handle,
  initialRenderPlan,
  meta,
}: {
  analysis: GitHubAnalysis;
  handle: string;
  initialRenderPlan: RenderPlan;
  meta: AnalysedHandle["meta"];
}) {
  const [activeRenderPlan, setActiveRenderPlan] = useState(initialRenderPlan);
  const [activeLens, setActiveLens] = useState<LensName | null>(null);
  const [activeLensLabel, setActiveLensLabel] = useState<string | null>(null);
  const [changeLog, setChangeLog] = useState<LensChangeLog | null>(null);
  const [showConfirmedWireframes, setShowConfirmedWireframes] = useState(true);

  useEffect(() => {
    setShowConfirmedWireframes(true);
    const timeout = window.setTimeout(() => setShowConfirmedWireframes(false), 720);
    return () => window.clearTimeout(timeout);
  }, [activeRenderPlan]);

  async function applyLens({
    instruction,
    lens,
    lensLabel,
  }: {
    instruction: string;
    lens: LensName;
    lensLabel: string;
  }): Promise<LensApplyResponse> {
    const response = await fetch("/api/wrapped/lens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        handle,
        lens,
        lensLabel,
        instruction,
        currentRenderPlan: activeRenderPlan,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Lens request failed with ${response.status}`);
    }

    const payload = (await response.json()) as LensApplyResponse;
    setActiveRenderPlan(payload.renderPlan);
    setActiveLens(payload.lens);
    setActiveLensLabel(payload.lensLabel);
    setChangeLog(payload.changeLog);
    return payload;
  }

  function resetLens() {
    setActiveRenderPlan(initialRenderPlan);
    setActiveLens(null);
    setActiveLensLabel(null);
    setChangeLog(null);
  }

  return (
    <main className={`wrapped-shell palette-${analysis.creativeProfile.palette}`}>
      <div className="wrapped-inner">
        <CreativeIntro analysis={analysis} />

        {activeLens ? (
          <section className="lens-status" aria-label="Active derived view">
            <div>
              <span>{activeLensLabel ?? LENS_LABELS[activeLens]} lens active</span>
              <p>{changeLog?.summary ?? "The page is using a derived render plan."}</p>
            </div>
            <button type="button" onClick={resetLens}>
              Reset canonical Wrapped
            </button>
          </section>
        ) : null}

        <DecisionLog
          activeLens={activeLens}
          activeLensLabel={activeLensLabel}
          analysis={analysis}
          changeLog={changeLog}
          meta={meta}
          renderPlan={activeRenderPlan}
        />

        <section
          className="component-grid"
          aria-busy={showConfirmedWireframes}
          aria-label="Personalized GitHub analysis"
        >
          {activeRenderPlan.picks.map((pick) => (
            <div
              className={[
                "planned-slot",
                `slot-${pick.size}`,
                `variant-${pick.variant}`,
                `treatment-${pick.visualTreatment}`,
              ].join(" ")}
              key={pick.component}
            >
              {showConfirmedWireframes ? (
                <ConfirmedPlanWireframe pick={pick} />
              ) : (
                <RenderPlannedComponent analysis={analysis} pick={pick} />
              )}
            </div>
          ))}
        </section>

        <footer className="pipeline-footer">
          <p>
            One upstream product call. Model: {meta.model}. Source: {meta.source}. Latency:{" "}
            {meta.latencyMs}ms.
            {activeLens
              ? ` Derived view: ${activeLensLabel ?? LENS_LABELS[activeLens]} lens over the same analysis.`
              : ""}
          </p>
        </footer>
        <WrappedInspectorChat
          activeLens={activeLens}
          activeLensLabel={activeLensLabel}
          handle={handle}
          onApplyLens={applyLens}
        />
      </div>
    </main>
  );
}
