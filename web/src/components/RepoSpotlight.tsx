import type { GitHubAnalysis } from "@/lib/analyser";
import type { RenderPlanDisplay } from "@/lib/catalog";

export function RepoSpotlight({
  display,
  repo,
  reason,
}: {
  display?: RenderPlanDisplay | null;
  repo: NonNullable<GitHubAnalysis["spotlightRepo"]>;
  reason: string;
}) {
  return (
    <section className="wrapped-card" aria-label="Repository spotlight">
      <h2>{display?.kicker ?? "Repo spotlight"}</h2>
      <h3>{display?.title ?? repo.name}</h3>
      <p>{display?.body ?? repo.oneLine}</p>
      {display?.bullets?.length ? (
        <ul className="flag-list">
          {display.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : (
        <p>{repo.why}</p>
      )}
      <p className="muted">{repo.stars} stars</p>
      <p className="reason">{reason}</p>
    </section>
  );
}
