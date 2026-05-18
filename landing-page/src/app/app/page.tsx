import Link from "next/link";

export default function AppPage() {
  return (
    <main className="app-entry-page">
      <section className="app-entry-panel">
        <p className="app-entry-kicker">Token Distribution Protocol App</p>
        <h1>Distribution workspace coming next.</h1>
        <p>
          This page is reserved for the app experience where creators will set
          up token distributions, define release schedules, and let recipients
          claim unlocked tokens.
        </p>
        <Link className="app-entry-link" href="/">
          Back to landing
        </Link>
      </section>
    </main>
  );
}
