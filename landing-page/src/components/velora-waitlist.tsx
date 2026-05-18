"use client";

import { FormEvent, useState } from "react";

export function VeloraWaitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEmailValid || isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || result?.ok === false) {
        setError(result?.error ?? "Could not join the waitlist.");
        return;
      }

      setSubmitted(true);
      setEmail("");
    } catch {
      setError("Could not join the waitlist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="waitlist-section motion-reveal" data-duration="2" data-delay="0.1">
      <div className="waitlist-content">
        <div className="waitlist-copy">
          <p>Protocol updates</p>
          <h2>
            Follow the protocol
            <br />
            as the app takes shape.
          </h2>
        </div>
        <div className="waitlist-panel">
          {!submitted ? (
            <form className="waitlist-form" onSubmit={handleSubmit}>
              <label htmlFor="waitlist-email">Email address</label>
              <div className="waitlist-form-row">
                <input
                  id="waitlist-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                />
                <button
                  className="magnet-effect"
                  type="submit"
                  disabled={!isEmailValid || isSubmitting}
                >
                  {isSubmitting ? "Joining" : "Join"}
                </button>
              </div>
              {error ? (
                <p className="waitlist-error" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          ) : (
            <div className="waitlist-success" role="status">
              <span aria-hidden="true" />
              <p>You&apos;re on the list.</p>
            </div>
          )}
          <p>
            A simple update list for release schedules, app progress, and
            notes about predictable token distribution.
          </p>
        </div>
      </div>
    </section>
  );
}
