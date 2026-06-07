import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Check } from "lucide-react";
import { getMyProfile, completeOnboarding } from "@/lib/profile.functions";

const GOAL_OPTIONS = [
  { id: "organize_schedule", label: "Organizar minha agenda" },
  { id: "manage_team", label: "Gerenciar minha equipe" },
  { id: "grow_clients", label: "Conquistar mais clientes" },
  { id: "track_finance", label: "Controlar faturamento" },
  { id: "automate_recurring", label: "Automatizar recorrências" },
  { id: "improve_quality", label: "Melhorar qualidade do serviço" },
];

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const fetchProfile = useServerFn(getMyProfile);
  const completeFn = useServerFn(completeOnboarding);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    retry: 1,
    staleTime: 60_000,
  });

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [goalsOther, setGoalsOther] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      completeFn({
        data: {
          full_name: fullName,
          username,
          goals,
          goals_other: goalsOther || null,
        },
      }),
    onSuccess: () => {
      toast.success("Tudo pronto!");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e) =>
      toast.error("Não foi possível salvar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  if (isLoading || error) return <>{children}</>;
  if (data?.profile?.onboarded_at) return <>{children}</>;

  const toggleGoal = (id: string) =>
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );

  const validUsername = /^[a-zA-Z0-9_.-]{3,30}$/.test(username);
  const canSubmit =
    fullName.trim().length >= 2 && validUsername && goals.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-md px-5 py-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Sparkles className="size-4 text-primary" /> CleanOps
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Bem-vindo! Vamos personalizar sua experiência.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Leva menos de um minuto. Essas informações ajudam a configurar o app
          para você.
        </p>

        <form
          className="mt-7 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Nome completo
            </label>
            <input
              required
              minLength={2}
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex.: Maria Silva"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Nome de usuário
            </label>
            <input
              required
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())
              }
              className="mt-1 w-full rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ex.: maria.silva"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              3–30 caracteres. Letras, números, _ . - permitidos.
            </p>
            {username && !validUsername && (
              <p className="mt-1 text-[11px] text-destructive">
                Use somente letras, números, _ . -
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              O que você busca com o app?
            </p>
            <p className="text-[11px] text-muted-foreground">
              Selecione um ou mais objetivos.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {GOAL_OPTIONS.map((g) => {
                const active = goals.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm ring-1 transition ${
                      active
                        ? "bg-primary/10 ring-primary text-foreground"
                        : "bg-card ring-border text-foreground/90"
                    }`}
                  >
                    <span>{g.label}</span>
                    {active && <Check className="size-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Outro objetivo (opcional)
            </label>
            <textarea
              maxLength={280}
              value={goalsOther}
              onChange={(e) => setGoalsOther(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Conte um pouco mais (opcional)"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || mutation.isPending}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending ? "Salvando..." : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}