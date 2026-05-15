import type { GitHubAnalysis } from "@/lib/analyser";

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function InfluenceMap({
  analysis,
  reason,
}: {
  analysis: GitHubAnalysis;
  reason: string;
}) {
  const repoStars = analysis.spotlightRepo?.stars ?? 0;
  const strongestTopic = analysis.inferredTopics[0];

  return (
    <section className="wrapped-card influence-map" aria-label="Public influence map">
      <p className="card-kicker">Reach map</p>
      <h2>Where the signal travels</h2>
      <div className="influence-orbit" aria-hidden="true">
        <span className="node node-main">@{analysis.handle}</span>
        <span className="node node-followers">{compact(analysis.profile.followers)} followers</span>
        <span className="node node-stars">{compact(repoStars)} repo stars</span>
        <span className="node node-topic">{strongestTopic?.topic ?? "public code"}</span>
      </div>
      <ul className="influence-list">
        <li>
          <strong>{compact(analysis.profile.followers)}</strong>
          <span>followers</span>
        </li>
        <li>
          <strong>{compact(repoStars)}</strong>
          <span>stars on the spotlight repo</span>
        </li>
        <li>
          <strong>{analysis.inferredTopics.length}</strong>
          <span>topics with evidence</span>
        </li>
      </ul>
      <p className="reason">{reason}</p>
    </section>
  );
}
