import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Esqueci minha senha — CleanOps" },
      { name: "description", content: "Recupere o acesso à sua conta CleanOps." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("E-mail enviado", {
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      });
    } catch (err) {
      toast.error(t("common.error"), {
        description: err instanceof Error ? err.message : t("common.tryAgain"),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-sm">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Sparkles className="size-4 text-primary" /> CleanOps
        </Link>

        <h1 className="mt-8 text-3xl font-bold tracking-tight">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-card p-5 ring-1 ring-border">
            <p className="text-sm">
              Enviamos um link para <strong>{email}</strong>. Verifique também a caixa de spam.
            </p>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="voce@empresa.com"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Enviando…" : "Enviar link"}
            </button>
            <Link
              to="/auth"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
            >
              <ArrowLeft className="size-3" /> Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}