import { formatCurrency, formatDate, formatDateTime, formatTime, formatMonthShort } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { listNps, type NpsSurveyWithJob } from "@/lib/nps.functions";

export const Route = createFileRoute("/_authenticated/nps")({
  head: () => ({ meta: [{ title: "Reviews — CleanOps" }] }),
  component: NpsPage,
});

function NpsPage() {
  const { t } = useTranslation();
  const fn = useServerFn(listNps);
  const { data, isLoading } = useQuery({ queryKey: ["nps-list"], queryFn: () => fn() });

  const rows = data ?? [];
  const answered = rows.filter((r) => r.score !== null);
  const promoters = answered.filter((r) => (r.score ?? 0) >= 9).length;
  const detractors = answered.filter((r) => (r.score ?? 0) <= 6).length;
  const passives = answered.length - promoters - detractors;
  const nps =
    answered.length > 0
      ? Math.round(((promoters - detractors) / answered.length) * 100)
      : 0;

  return (
    <MobileShell>
      <PageHeader
        eyebrow={t("nps.eyebrow")}
        title={t("nps.title")}
        subtitle={`${answered.length} / ${rows.length}`}
        right={
          <Link
            to="/"
            className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </Link>
        }
      />

      <section className="px-5">
        <div className="rounded-3xl bg-foreground p-5 text-background shadow-lg">
          <p className="text-xs font-medium uppercase tracking-widest opacity-70">NPS Score</p>
          <p className="mt-1 text-5xl font-bold tracking-tight">
            {isLoading ? "…" : nps}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-[color:var(--success)]">{promoters}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Promotores</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-lg font-bold text-[color:var(--warning)]">{passives}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Neutros</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[color:var(--destructive)]">{detractors}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Detratores</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="mb-3 text-sm font-bold">Respostas</h2>
        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma pesquisa enviada ainda. Conclua um serviço para gerar o link.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <NpsRow key={r.id} row={r} />
            ))}
          </ul>
        )}
      </section>
    </MobileShell>
  );
}

function NpsRow({ row }: { row: NpsSurveyWithJob }) {
  const submitted = !!row.submitted_at;
  const url = typeof window !== "undefined" ? `${window.location.origin}/nps/${row.token}` : "";
  const scoreTint =
    row.score == null
      ? "var(--muted-foreground)"
      : row.score >= 9
        ? "var(--success)"
        : row.score >= 7
          ? "var(--warning)"
          : "var(--destructive)";

  return (
    <li className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{row.job_title ?? "Serviço"}</p>
          <p className="truncate text-xs text-muted-foreground">{row.client_name ?? "—"}</p>
        </div>
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold"
          style={{
            backgroundColor: `color-mix(in oklab, ${scoreTint} 15%, transparent)`,
            color: scoreTint,
          }}
        >
          {row.score ?? "—"}
        </span>
      </div>
      {row.comment && (
        <p className="mt-3 flex gap-2 rounded-xl bg-secondary p-3 text-xs text-foreground">
          <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
          <span>{row.comment}</span>
        </p>
      )}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {submitted
            ? `Respondido em ${formatDate(row.submitted_at!)}`
            : `Enviado em ${formatDate(row.sent_at ?? row.created_at)}`}
        </span>
        {!submitted && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("Link copiado");
            }}
            className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 font-semibold"
          >
            <Copy className="size-3" /> Copiar link
          </button>
        )}
      </div>
    </li>
  );
}