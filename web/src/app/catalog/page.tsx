import Link from "next/link";
import {
  CATALOG_DESCRIPTIONS,
  componentCatalog,
  renderSize,
  renderVariant,
  visualTreatment,
} from "@/lib/catalog";

const componentNotes: Record<string, { data: string; proof: string }> = {
  HeroQuote: {
    data: "oneLineSummary + optional display copy",
    proof: "Best when one finding is strong enough to lead the page.",
  },
  LanguageRing: {
    data: "primaryLanguages",
    proof: "Best when language mix explains the profile rather than just filling space.",
  },
  ActivityHeatmap: {
    data: "activityPattern.weeklyDensity",
    proof: "Best when recency or bursts are part of the story.",
  },
  RepoSpotlight: {
    data: "spotlightRepo",
    proof: "Best when one repo carries the clearest evidence.",
  },
  TopicGraph: {
    data: "inferredTopics",
    proof: "Best when the profile has connected themes across repos.",
  },
  MilestoneTimeline: {
    data: "milestones",
    proof: "Best when the public history has a visible arc.",
  },
  RedFlagCard: {
    data: "redFlags",
    proof: "Only used for honest concerns backed by public data.",
  },
  GreenFlagCard: {
    data: "greenFlags",
    proof: "Best when the analysis finds strengths with evidence.",
  },
  SuperlativeDeck: {
    data: "creativeProfile.superlatives",
    proof: "Best when the profile has memorable, evidence-backed awards.",
  },
  WorkStyleCard: {
    data: "creativeProfile",
    proof: "Best when the personal read is the strongest human hook.",
  },
  InfluenceMap: {
    data: "followers + stars + topics",
    proof: "Best when public reach or topic travel is meaningful.",
  },
};

function ChipList({ label, values }: { label: string; values: readonly string[] }) {
  return (
    <section className="catalog-controls" aria-labelledby={`${label}-heading`}>
      <h2 id={`${label}-heading`}>{label}</h2>
      <div>
        {values.map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
    </section>
  );
}

export default function CatalogPage() {
  const components = componentCatalog.options;

  return (
    <main className="catalog-shell">
      <section className="catalog-hero">
        <p className="eyebrow">Appendix</p>
        <h1>Component Catalog</h1>
        <p>
          The model can choose these components and their display controls. It cannot
          invent new React, CSS, or data slots at render time.
        </p>
        <Link href="/">Back to demo</Link>
      </section>

      <section className="catalog-schema" aria-label="Render plan controls">
        <ChipList label="Variants" values={renderVariant.options} />
        <ChipList label="Sizes" values={renderSize.options} />
        <ChipList label="Visual Treatments" values={visualTreatment.options} />
      </section>

      <section className="catalog-grid" aria-label="Available Wrapped components">
        {components.map((component, index) => {
          const note = componentNotes[component];
          return (
            <article className="catalog-card" key={component}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{component.replace(/([a-z])([A-Z])/g, "$1 $2")}</h2>
              <p>{CATALOG_DESCRIPTIONS[component]}</p>
              <dl>
                <div>
                  <dt>Data slot</dt>
                  <dd>{note.data}</dd>
                </div>
                <div>
                  <dt>Selection logic</dt>
                  <dd>{note.proof}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>
    </main>
  );
}
