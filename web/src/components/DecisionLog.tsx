import { CATALOG_DESCRIPTIONS, type RenderPlan } from "@/lib/catalog";
import type { AnalysedHandle, GitHubAnalysis } from "@/lib/analyser";
import { LENS_LABELS, type LensChangeLog, type LensName } from "@/lib/lens";

function scoreFor(analysis: GitHubAnalysis, component: RenderPlan["picks"][number]["component"]) {
  return analysis.interestingnessScore[component];
}

export function DecisionLog({
  activeLens,
  activeLensLabel,
  analysis,
  changeLog,
  meta,
  renderPlan,
}: {
  activeLens?: LensName | null;
  activeLensLabel?: string | null;
  analysis: GitHubAnalysis;
  changeLog?: LensChangeLog | null;
  meta: AnalysedHandle["meta"];
  renderPlan: RenderPlan;
}) {
  return (
    <details className="decision-log" aria-label="Interface decision log">
      <summary>
        <span>How this Wrapped was made</span>
        <strong>{renderPlan.picks.length} selected components</strong>
      </summary>
      <div className="decision-body">
        <header>
          <p className="eyebrow">Interface decision log</p>
          <h2>{analysis.creativeProfile.archetype}</h2>
          <p>
            {renderPlan.layoutRationale}{" "}
            {meta.source === "ai-gateway" ? "Live AI Gateway analysis" : "Deterministic fallback"}.
          </p>
        </header>
        {activeLens ? (
          <section className="decision-lens-note" aria-label="Derived view changes">
            <h3>{activeLensLabel ?? LENS_LABELS[activeLens]} derived view</h3>
            <p>{changeLog?.summary ?? "This view re-composes the page over the same analysis."}</p>
            {changeLog ? (
              <dl className="lens-delta">
                <div>
                  <dt>Added</dt>
                  <dd>{changeLog.added.length > 0 ? changeLog.added.join(", ") : "None"}</dd>
                </div>
                <div>
                  <dt>Removed</dt>
                  <dd>{changeLog.removed.length > 0 ? changeLog.removed.join(", ") : "None"}</dd>
                </div>
                <div>
                  <dt>Retained</dt>
                  <dd>{changeLog.retained.length > 0 ? changeLog.retained.join(", ") : "None"}</dd>
                </div>
              </dl>
            ) : null}
          </section>
        ) : null}
        <ol className="decision-list">
          {renderPlan.picks.map((pick, index) => (
            <li key={pick.component}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{pick.component}</strong>
                <p>{pick.reason}</p>
                <small>
                  {pick.variant}. {pick.size}. {pick.visualTreatment}. Score{" "}
                  {scoreFor(analysis, pick.component)}/10. {CATALOG_DESCRIPTIONS[pick.component]}
                </small>
              </div>
            </li>
          ))}
        </ol>
        {renderPlan.skipped.length > 0 ? (
          <div className="skipped-list">
            <h3>Skipped</h3>
            <ul>
              {renderPlan.skipped.map((item) => (
                <li key={item.component}>
                  <strong>{item.component}</strong>
                  <span>{item.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}
