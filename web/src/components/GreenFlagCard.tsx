import type { RenderPlanDisplay } from "@/lib/catalog";

export function GreenFlagCard({
  display,
  flags,
  reason,
}: {
  display?: RenderPlanDisplay | null;
  flags: string[];
  reason: string;
}) {
  const items = display?.bullets?.length ? display.bullets : flags;

  return (
    <section className="wrapped-card" aria-label="Green flags">
      {display?.kicker ? <p className="card-kicker">{display.kicker}</p> : null}
      <h2 className="green">{display?.title ?? "Green flags"}</h2>
      {display?.body ? <p>{display.body}</p> : null}
      <ul className="flag-list">
        {items.map((flag) => (
          <li key={flag}>{flag}</li>
        ))}
      </ul>
      <p className="reason">{reason}</p>
    </section>
  );
}
