import type { GitHubAnalysis } from "@/lib/analyser";

export function MilestoneTimeline({
  milestones,
  reason,
}: {
  milestones: GitHubAnalysis["milestones"];
  reason: string;
}) {
  return (
    <section className="wrapped-card wide" aria-label="GitHub milestones">
      <h2>Timeline</h2>
      <ol className="timeline-list">
        {milestones.map((milestone) => (
          <li key={`${milestone.date}-${milestone.event}`}>
            <strong>{milestone.date}</strong> <span>{milestone.event}</span>
          </li>
        ))}
      </ol>
      <p className="reason">{reason}</p>
    </section>
  );
}
