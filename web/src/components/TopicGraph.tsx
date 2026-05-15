import type { GitHubAnalysis } from "@/lib/analyser";

export function TopicGraph({
  topics,
  reason,
}: {
  topics: GitHubAnalysis["inferredTopics"];
  reason: string;
}) {
  return (
    <section className="wrapped-card" aria-label="Inferred topics">
      <h2>Topic graph</h2>
      <ul className="topic-list">
        {topics.map((topic) => (
          <li key={topic.topic}>
            <strong>{topic.topic}</strong> <span className="muted">{topic.strength}/10</span>
          </li>
        ))}
      </ul>
      {topics[0] ? <p>{topics[0].evidence}</p> : null}
      <p className="reason">{reason}</p>
    </section>
  );
}
