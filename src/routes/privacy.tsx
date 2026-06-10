import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CleanOps" },
      {
        name: "description",
        content:
          "How CleanOps collects, uses, stores and protects your personal data.",
      },
      { property: "og:title", content: "Privacy Policy — CleanOps" },
      {
        property: "og:description",
        content:
          "How CleanOps collects, uses, stores and protects your personal data.",
      },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="text-xs font-semibold text-primary">
          ← Back
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Last updated: June 7, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-bold">1. Who we are</h2>
            <p>
              CleanOps ("we", "the app") is an operations platform for
              cleaning and field-service businesses. This Policy describes how
              we handle personal data of app users (admins, operators and end
              customers).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. Data we collect</h2>
            <ul className="list-disc pl-5">
              <li>
                <strong>Account:</strong> name, email, password (hashed) and,
                when applicable, social-provider data (e.g. Google, Apple).
              </li>
              <li>
                <strong>Operational:</strong> clients, quotes, jobs, job
                photos, signatures, notes and receipts that you create.
              </li>
              <li>
                <strong>Location:</strong> when an operator enables tracking
                during a shift, we use the device location for routing and
                job check-in. We do not collect location in the background
                outside of an active shift.
              </li>
              <li>
                <strong>Device:</strong> technical identifiers, app version,
                OS and error logs for diagnostics.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. How we use your data</h2>
            <ul className="list-disc pl-5">
              <li>Operate app features (schedule, billing, team).</li>
              <li>Authenticate users and protect accounts.</li>
              <li>Send operational notifications (in-app and, when enabled, SMS/email).</li>
              <li>Improve the product with aggregated, non-identifying metrics.</li>
              <li>Comply with legal obligations and respond to lawful requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. Sharing</h2>
            <p>
              We do not sell personal data. We share data only with: hosting,
              database and authentication providers; optional providers you
              enable (e.g. Twilio for SMS, Google Maps); and authorities when
              required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. Storage and security</h2>
            <p>
              Data is stored with cloud providers using encryption in transit
              (TLS) and at rest. Row-level security policies isolate each
              account so users only see their own data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. Your rights</h2>
            <p>
              You may request access, correction, export or deletion of your
              data. Write to the support channel inside the app. Deleting your
              account removes the personal data associated with it, subject to
              legal retention obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">7. Children</h2>
            <p>
              CleanOps is not directed to children under 13 and we do not
              knowingly collect data from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">8. Changes</h2>
            <p>
              We may update this Policy. Material changes will be announced
              in-app and/or by email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">9. Contact</h2>
            <p>
              Privacy questions: contact us through the in-app support channel.
            </p>
          </section>
        </div>

        <div className="mt-10 text-xs text-muted-foreground">
          See also our{" "}
          <Link to="/terms" className="font-semibold text-primary">
            Terms of Use
          </Link>
          .
        </div>
      </div>
    </div>
  );
}