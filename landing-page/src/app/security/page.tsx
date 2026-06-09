import Link from "next/link";

const metrics = [
  { label: "Anchor integration tests", value: "23", detail: "passing on local validator" },
  { label: "Rust unit tests", value: "13", detail: "pure contract logic" },
  { label: "Rust line coverage", value: "91.52%", detail: "cargo llvm-cov" },
  { label: "Devnet smoke test", value: "Passed", detail: "post-deploy verification" },
];

const reviewItems = [
  "Signer authority checks across create, withdraw, milestone release, and cancel.",
  "PDA seed uniqueness for stream configuration and token vault custody.",
  "Checked arithmetic for vesting, claimed amounts, unlocked amounts, and cancellation splits.",
  "Token account owner and mint validation before vault transfers.",
  "Reentrancy risk reviewed against Solana atomic execution and SPL Token CPI boundaries.",
];

const integrationTests = [
  "create_stream locks tokens in the PDA vault",
  "withdraw rejects unavailable claims",
  "cliff and cliff-linear boundary behavior",
  "partial, full, and repeated withdrawal paths",
  "milestone release and expiry checks",
  "cancel before cliff, mid-stream, after full vest, and already-cancelled states",
  "non-cancellable, neither-authority, and either-authority cancellation rules",
];

const smokeEvidence = [
  "Non-cancellable stream rejected cancel with CancellationDisabled.",
  "CancelAuthority::Neither rejected cancel with Unauthorized.",
  "CancelAuthority::Either allowed recipient cancellation.",
  "Cancelled vault ended at zero after locked tokens returned correctly.",
];

export default function SecurityPage() {
  return (
    <main className="security-page">
      <section className="security-band">
        <div>
          <Link className="security-back-link" href="/#security">
            Back to security
          </Link>
          <p className="security-kicker">Protocol verification</p>
          <h2>Security evidence for the current devnet program.</h2>
        </div>
        <p>
          The current Velora backend has been checked through Anchor
          integration tests, Rust unit coverage, a code-derived security checklist, and a
          devnet smoke test after redeployment.
        </p>
      </section>

      <section className="security-metrics" aria-label="Verification metrics">
        {metrics.map((metric) => (
          <article className="security-metric" key={metric.label}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.detail}</span>
          </article>
        ))}
      </section>

      <section className="security-grid">
        <SecurityPanel title="Security checklist" items={reviewItems} />
        <SecurityPanel title="Integration coverage" items={integrationTests} />
      </section>

      <section className="security-band">
        <div>
          <p className="security-kicker">Fixed and deployed</p>
          <h2>Cancellation authority is enforced on-chain.</h2>
        </div>
        <p>
          Week 7 review found that stream cancellation settings were stored but not fully enforced
          by the on-chain cancel instruction. The deployed program now rejects non-cancellable
          streams, rejects neither-authority cancellation, and allows recipient cancellation only
          when the stream uses either-authority rules.
        </p>
      </section>

      <section className="security-grid">
        <SecurityPanel title="Devnet smoke evidence" items={smokeEvidence} />
        <article className="security-panel">
          <h2>Deployment evidence</h2>
          <dl className="security-evidence-list">
            <div>
              <dt>Program id</dt>
              <dd>Fwboky3ufxoT43egazAymFmjyAtJVDJLVJs977oLSN4V</dd>
            </div>
            <div>
              <dt>Deploy signature</dt>
              <dd>278UTLxQtV54qDWJMj8N7RYgDnWBKpz67yDjRFxVzdFQAiVVGSTSXbTpr98YPeinA8FQmTy5k3kPWxrAvvjuz28b</dd>
            </div>
            <div>
              <dt>IDL account</dt>
              <dd>4eTqNL3oeBeh42APfXHFbdu28BSZJWpAsQ9EaCJ79KGe</dd>
            </div>
          </dl>
        </article>
      </section>
    </main>
  );
}

function SecurityPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="security-panel">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
