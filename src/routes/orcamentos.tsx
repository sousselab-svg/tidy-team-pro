import { createFileRoute } from "@tanstack/react-router";
import { Plus, FileText, Send } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { brl, quotes, QUOTE_STATUS } from "@/lib/mock-data";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — CleanOps" },
      { name: "description", content: "Crie e envie orçamentos de limpeza em segundos." },
    ],
  }),
  component: QuotesPage,
});

function QuotesPage() {
  const pendingValue = quotes.filter((q) => q.status === "sent").reduce((s, q) => s + q.total, 0);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Vendas"
        title="Orçamentos"
        subtitle={`${brl(pendingValue)} aguardando aprovação`}
        right={
          <button className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow">
            <Plus className="size-5" />
          </button>
        }
      />

      <section className="px-5">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Standard", price: "A partir de R$ 220" },
            { label: "Deep Cleaning", price: "A partir de R$ 480" },
            { label: "Pós-Obra", price: "A partir de R$ 750" },
            { label: "Airbnb", price: "A partir de R$ 180" },
          ].map((t) => (
            <button
              key={t.label}
              className="flex flex-col items-start gap-1 rounded-2xl bg-card p-3 text-left ring-1 ring-border"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
                <FileText className="size-4" />
              </span>
              <p className="text-sm font-bold text-foreground">{t.label}</p>
              <p className="text-[11px] text-muted-foreground">{t.price}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="mb-3 text-sm font-bold text-foreground">Recentes</h2>
        <ul className="space-y-3">
          {quotes.map((q) => {
            const meta = QUOTE_STATUS[q.status];
            return (
              <li key={q.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                      {q.id}
                    </p>
                    <h3 className="truncate text-base font-semibold text-foreground">{q.client}</h3>
                    <p className="text-xs text-muted-foreground">
                      {q.service} · {q.area} m² · {q.rooms} quartos · {q.bathrooms} banheiros
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${meta.bg} ${meta.fg}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">{q.createdAt}</span>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold text-foreground">{brl(q.total)}</p>
                    {q.status === "draft" && (
                      <button className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                        <Send className="size-3" /> Enviar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </MobileShell>
  );
}