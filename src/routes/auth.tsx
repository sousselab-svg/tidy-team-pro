import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CleanOps" },
      { name: "description", content: "Access your cleaning operations dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(t("auth.signedUpTitle"), { description: t("auth.signedUpDesc") });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(t("common.error"), {
        description: err instanceof Error ? err.message : t("common.tryAgain"),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(t("auth.googleError"), { description: result.error.message });
      setBusy(false);
      return;
    }
    if (!result.redirected) {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-sm">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Sparkles className="size-4 text-primary" /> {t("auth.title")}
          </Link>
          <LanguageSwitcher compact />
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight">
          {mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.tagline")}</p>

        <div className="mt-6 flex rounded-full bg-secondary p-1 text-xs font-semibold">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-full py-2 ${mode === "signin" ? "bg-background shadow" : "text-muted-foreground"}`}
          >
            {t("auth.signIn")}
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-full py-2 ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}
          >
            {t("auth.signUp")}
          </button>
        </div>

        <form onSubmit={handleEmail} className="mt-5 space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("auth.email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("auth.emailPlaceholder")}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("auth.password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? t("common.wait") : mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> {t("auth.or")} <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-card py-3 text-sm font-bold ring-1 ring-border disabled:opacity-60"
        >
          <GoogleIcon /> {t("auth.continueGoogle")}
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.2-.2-2H12z"
      />
    </svg>
  );
}