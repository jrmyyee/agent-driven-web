export function RedFlagCard({ flags, reason }: { flags: string[]; reason: string }) {
  return (
    <section className="wrapped-card" aria-label="Red flags">
      <h2 className="red">Watchouts</h2>
      <ul className="flag-list">
        {flags.map((flag) => (
          <li key={flag}>{flag}</li>
        ))}
      </ul>
      <p className="reason">{reason}</p>
    </section>
  );
}
