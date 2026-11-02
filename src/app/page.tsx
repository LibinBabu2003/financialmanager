const features = [
  "Private Telegram webhook shell",
  "Strict user and chat allowlist",
  "No financial writes enabled yet",
  "Health and deployment diagnostics",
];

export default function Home() {
  return (
    <main>
      <section className="card" aria-labelledby="title">
        <p className="eyebrow">Phase 1</p>
        <h1 id="title">Private Finance Manager</h1>
        <p className="lede">
          The hosted foundation is online. Financial storage and calculations remain
          disabled until the secure Phase 2 ledger is deployed.
        </p>
        <ul>
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <p className="status">
          <span aria-hidden="true" /> Foundation ready
        </p>
      </section>
    </main>
  );
}
