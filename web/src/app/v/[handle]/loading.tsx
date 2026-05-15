export default function WrappedLoading() {
  return (
    <main className="wrapped-shell palette-signal">
      <div className="loading-wrapped" role="status" aria-live="polite">
        <section className="loading-hero" aria-label="Wrapped analysis in progress">
          <div className="loading-copy">
            <p className="eyebrow">Building GitHub Wrapped</p>
            <h1>Assembling the interface from one product analysis.</h1>
            <p>
              Public GitHub signals are being shaped into the same analysis used by the
              human page, the render plan, and the agent-readable surface.
            </p>
          </div>
          <ol className="loading-steps">
            <li>
              <span>01</span>
              <strong>Read public signals</strong>
              <p>Profile, repos, languages, activity, and social proof.</p>
            </li>
            <li>
              <span>02</span>
              <strong>Choose the persona</strong>
              <p>The model finds the strongest narrative before choosing components.</p>
            </li>
            <li>
              <span>03</span>
              <strong>Plan the surface</strong>
              <p>JSON selects typed React components from the constrained catalog.</p>
            </li>
            <li>
              <span>04</span>
              <strong>Expose the intent</strong>
              <p>The same result powers Wrapped, intent JSON, and MCP.</p>
            </li>
          </ol>
        </section>

        <section className="loading-plan-waiting" aria-label="Waiting for confirmed render plan">
          <div className="loading-plan-rail">
            <i />
            <i />
            <i />
          </div>
          <div>
            <p className="eyebrow">No component slots yet</p>
            <h2>The wireframe appears only after the JSON render plan is confirmed.</h2>
            <p>
              Until the model returns selected catalog components, this screen avoids pretending to
              know the final Wrapped shape.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
