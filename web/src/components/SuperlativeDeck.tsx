import type { GitHubAnalysis } from "@/lib/analyser";
import type { RenderPlanDisplay } from "@/lib/catalog";

export function SuperlativeDeck({
  display,
  superlatives,
  reason,
}: {
  display?: RenderPlanDisplay | null;
  superlatives: GitHubAnalysis["creativeProfile"]["superlatives"];
  reason: string;
}) {
  const awards = display?.bullets?.length
    ? display.bullets.map((bullet) => ({ title: bullet, reason: "" }))
    : superlatives;

  return (
    <section className="wrapped-card wide superlative-deck" aria-label="GitHub superlatives">
      <header>
        <p className="card-kicker">{display?.kicker ?? "Profile awards"}</p>
        <h2>{display?.title ?? "Most likely to be remembered for"}</h2>
        {display?.body ? <p>{display.body}</p> : null}
      </header>
      <div className="award-track">
        {awards.map((item, index) => (
          <article key={item.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.title}</strong>
            {item.reason ? <p>{item.reason}</p> : null}
          </article>
        ))}
      </div>
      <p className="reason">{reason}</p>
    </section>
  );
}
