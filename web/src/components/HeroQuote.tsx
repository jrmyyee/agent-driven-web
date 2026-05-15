import type { RenderPlanDisplay } from "@/lib/catalog";

export function HeroQuote({
  display,
  summary,
  reason,
}: {
  display?: RenderPlanDisplay | null;
  summary: string;
  reason: string;
}) {
  return (
    <section className="wrapped-card wide hero-quote" aria-label="Standout GitHub finding">
      {display?.kicker ? <p className="card-kicker">{display.kicker}</p> : null}
      <blockquote>{display?.title ?? summary}</blockquote>
      {display?.body ? <p>{display.body}</p> : null}
      <p className="reason">{reason}</p>
    </section>
  );
}
