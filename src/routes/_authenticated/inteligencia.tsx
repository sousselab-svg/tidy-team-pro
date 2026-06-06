import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Sparkles, AlertTriangle, RefreshCw, TrendingDown, UserX } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { aiDailySummary, aiRiskScan, type RiskItem } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/inteligencia")({
  head: () => ({ meta: [{ title: "Intelligence — CleanOps" }] }),
  component: IntelligencePage,
});

function IntelligencePage() {
  const summaryFn = useServerFn(aiDailySummary);
  const riskFn = useServerFn(aiRiskScan);

  const summaryMut = useMutation({ mutationFn: () => summaryFn() });
  const risks = useQuery({ queryKey: ["ai-risk-scan"], queryFn: () => riskFn(), staleTime: 5 * 60_000 });

  return (
    <MobileShell>
      <PageHeader
        eyebrow="AI"
        title="Inteligência"
        subtitle="Resumo do dia, riscos de no-show e churn."
      />

      <section className="px-5">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold">Resumo executivo</p>
                <p className="text-[11px] text-muted-foreground">Gerado por IA sob demanda</p>
              </div>
            </div>
            <button
              onClick={() => summaryMut.mutate()}
              disabled={summaryMut.isPending}
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {summaryMut.isPending ? "…" : summaryMut.data ? "Atualizar" : "Gerar"}
            </button>
          </div>

          {summaryMut.error && (
            <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              {(summaryMut.error as Error).message}
            </p>
          )}

          {summaryMut.data && (
            <div className="mt-4 space-y-4 text-sm">
              <p className="leading-relaxed text-foreground">{summaryMut.data.summary}</p>

              {summaryMut.data.highlights.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--success)]">Highlights</p>
                  <ul className="space-y-1">
                    {summaryMut.data.highlights.map((h, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-[color:var(--success)]">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summaryMut.data.risks.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--warning)]">Atenção</p>
                  <ul className="space-y-1">
                    {summaryMut.data.risks.map((r, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-[color:var(--warning)]">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-sm font-bold">Riscos detectados</h2>
          <button
            onClick={() => risks.refetch()}
            disabled={risks.isFetching}
            className="flex items-center gap-1 text-xs font-semibold text-primary disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${risks.isFetching ? "animate-spin" : ""}`} /> Recalcular
          </button>
        </div>

        {risks.isLoading ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Analisando histórico…
          </div>
        ) : (risks.data ?? []).length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
            <p className="text-sm font-semibold">Nenhum risco detectado</p>
            <p className="mt-1 text-xs text-muted-foreground">Histórico saudável nos últimos 180 dias.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {(risks.data ?? []).map((r) => (
              <RiskRow key={`${r.kind}-${r.client_id}-${r.job_id ?? ""}`} item={r} />
            ))}
          </ul>
        )}
      </section>

      <section className="px-5 pt-6 pb-10">
        <Link
          to="/orcamentos"
          className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-border"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
              <Brain className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">AI Quote Draft</p>
              <p className="text-[11px] text-muted-foreground">Descreva o serviço, a IA monta o orçamento</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary">Abrir →</span>
        </Link>
      </section>
    </MobileShell>
  );
}

function RiskRow({ item }: { item: RiskItem }) {
  const isNoShow = item.kind === "no_show";
  const tint = isNoShow ? "var(--warning)" : "var(--destructive)";
  const Icon = isNoShow ? UserX : TrendingDown;
  return (
    <li className="rounded-2xl bg-card p-3 ring-1 ring-border">
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: `color-mix(in oklab, ${tint} 15%, transparent)`, color: tint }}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{item.client_name}</p>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{ backgroundColor: `color-mix(in oklab, ${tint} 15%, transparent)`, color: tint }}
            >
              {isNoShow ? "No-show" : "Churn"} · {item.score}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
          {item.job_id && (
            <Link
              to="/agenda/$jobId"
              params={{ jobId: item.job_id }}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
            >
              Ver agendamento →
            </Link>
          )}
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full"
          style={{ width: `${item.score}%`, backgroundColor: tint }}
        />
      </div>
    </li>
  );
}

// satisfy unused-import lint when AlertTriangle unused elsewhere
void AlertTriangle;