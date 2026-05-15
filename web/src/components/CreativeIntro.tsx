import type { CSSProperties } from "react";
import type { GitHubAnalysis } from "@/lib/analyser";

function motionDots(count: number) {
  return Array.from({ length: count }, (_, index) => <i key={index} style={{ "--i": index } as CSSProperties} />);
}

export function CreativeIntro({ analysis }: { analysis: GitHubAnalysis }) {
  const profile = analysis.creativeProfile;
  const style = {
    "--energy": profile.energy,
    "--energy-alpha": Math.min(0.92, 0.46 + profile.energy * 0.045),
    "--tempo": `${Math.max(5, 11 - profile.energy * 0.5)}s`,
    "--stat-count": profile.statSpin.length,
  } as CSSProperties;

  return (
    <section className={`creative-intro ${profile.animationPreset}`} style={style}>
      <div className="motion-stage" aria-hidden="true">
        <div className="orbit-field">{motionDots(18)}</div>
        <div className="pulse-field">{motionDots(24)}</div>
        <div className="cascade-field">{motionDots(9)}</div>
      </div>

      <div className="intro-copy">
        <p className="eyebrow">GitHub Wrapped for @{analysis.handle}</p>
        <div className="intro-lockup">
          {analysis.avatarUrl ? (
            <img className="intro-avatar" src={analysis.avatarUrl} alt={`${analysis.handle} avatar`} />
          ) : (
            <div className="intro-avatar" aria-hidden="true" />
          )}
          <div>
            <h1>{profile.archetype}</h1>
            <p className="intro-name">{analysis.displayName ?? analysis.handle}</p>
          </div>
        </div>
        <p className="intro-read">{profile.personalRead}</p>
      </div>

      <div className="intro-meta" aria-label="Personal GitHub highlights">
        <div className="motif-panel">
          <span>Motif</span>
          <strong>{profile.motif}</strong>
        </div>
        {profile.statSpin.map((stat) => (
          <article className="spin-tile" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.interpretation}</p>
          </article>
        ))}
      </div>

      {profile.superlatives.length > 0 ? (
        <div className="superlative-track" aria-label="Profile superlatives">
          {profile.superlatives.map((item) => (
            <p key={item.title}>
              <span>{item.title}</span>
              {item.reason}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
