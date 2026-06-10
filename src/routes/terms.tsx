import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — CleanOps" },
      {
        name: "description",
        content: "Terms and conditions for using the CleanOps app.",
      },
      { property: "og:title", content: "Terms of Use — CleanOps" },
      {
        property: "og:description",
        content: "Terms and conditions for using the CleanOps app.",
      },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="text-xs font-semibold text-primary">
          ← Back
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Terms of Use</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Last updated: June 7, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-bold">1. Acceptance</h2>
            <p>
              By creating an account or using CleanOps you agree to these
              Terms of Use and to our{" "}
              <Link to="/privacy" className="font-semibold text-primary">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. Account and responsibilities</h2>
            <ul className="list-disc pl-5">
              <li>You are responsible for keeping your credentials secure.</li>
              <li>
                Content you create (clients, schedule, photos, amounts) is
                your responsibility regarding accuracy, legality and usage
                rights.
              </li>
              <li>
                Operators added to your team act under the responsibility of
                the account administrator.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5">
              <li>Use the app for unlawful or fraudulent activity.</li>
              <li>Attempt to bypass authentication, RLS or other security mechanisms.</li>
              <li>Upload content that is offensive, defamatory or that violates third-party rights.</li>
              <li>Reverse-engineer or resell the service without authorization.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. Plans and payments</h2>
            <p>
              Paid features, when available, are offered at prices disclosed
              at the time of purchase. Recurring charges renew automatically
              until cancellation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. Intellectual property</h2>
            <p>
              The CleanOps software, brand and visual identity are owned by
              their holders. We grant you a limited, non-exclusive, revocable
              license to use the app under these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. Suspension and termination</h2>
            <p>
              We may suspend or terminate accounts that violate these Terms,
              create a security risk or breach applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">7. Limitation of liability</h2>
            <p>
              CleanOps is provided "as is". We are not liable for indirect
              losses, lost profits or third-party provider downtime. Our
              maximum liability is capped at the amount paid for the service
              in the previous 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">8. Changes</h2>
            <p>
              We may update these Terms at any time. Continued use after an
              update means acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">9. Governing law</h2>
            <p>
              These Terms are governed by the laws applicable to the service
              provider's domicile, without prejudice to consumer-protection
              rules applicable to the user.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}