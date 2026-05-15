import type { GitHubAnalysis } from "@/lib/analyser";
import type { RenderPlanDisplay } from "@/lib/catalog";

export function WorkStyleCard({
  display,
  profile,
  reason,
}: {
  display?: RenderPlanDisplay | null;
  profile: GitHubAnalysis["creativeProfile"];
  reason: string;
}) {
  return (
    <section className="wrapped-card work-style-card" aria-label="Inferred work style">
      <p className="card-kicker">{display?.kicker ?? "Work style"}</p>
      <h2>{display?.title ?? profile.motif}</h2>
      <p className="work-read">{display?.body ?? profile.personalRead}</p>
      {display?.bullets?.length ? (
        <ul className="flag-list">
          {display.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
      <div className="energy-meter" aria-label={`Energy ${profile.energy} out of 10`}>
        <span style={{ width: `${profile.energy * 10}%` }} />
      </div>
      <p className="reason">{reason}</p>
    </section>
  );
}
