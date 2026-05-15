import type { GitHubAnalysis } from "@/lib/analyser";

export function LanguageRing({
  languages,
  reason,
}: {
  languages: GitHubAnalysis["primaryLanguages"];
  reason: string;
}) {
  return (
    <section className="wrapped-card" aria-label="Primary languages">
      <h2>Language signal</h2>
      <ul className="language-list">
        {languages.map((language) => (
          <li className="language-row" key={language.lang}>
            <header>
              <strong>{language.lang}</strong>
              <span>
                {language.pct}% across {language.repoCount} repo
                {language.repoCount === 1 ? "" : "s"}
              </span>
            </header>
            <div className="bar" aria-hidden="true">
              <span style={{ width: `${language.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="reason">{reason}</p>
    </section>
  );
}
