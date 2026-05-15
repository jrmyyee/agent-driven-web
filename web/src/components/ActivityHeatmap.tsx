import type { GitHubAnalysis } from "@/lib/analyser";
import type { CSSProperties } from "react";

export function ActivityHeatmap({
  activity,
  reason,
}: {
  activity: GitHubAnalysis["activityPattern"];
  reason: string;
}) {
  return (
    <section className="wrapped-card" aria-label="Recent activity pattern">
      <h2>Recent activity</h2>
      <div className="heatmap" aria-label={`Twelve week activity: ${activity.weeklyDensity.join(", ")}`}>
        {activity.weeklyDensity.map((density, index) => (
          <span
            aria-hidden="true"
            className="heat-cell"
            key={`${density}-${index}`}
            style={{ "--density": `${Math.max(8, density * 10)}%` } as CSSProperties}
          />
        ))}
      </div>
      <p>{activity.interpretation}</p>
      <p className="reason">{reason}</p>
    </section>
  );
}
