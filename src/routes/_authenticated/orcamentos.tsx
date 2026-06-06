import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, FileCheck, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { listClients } from "@/lib/clients.functions";
import {
  createQuote,
  deleteQuote,
  listQuotes,
  sendQuote,
  type QuoteItem,
  type QuoteRow,
} from "@/lib/quotes.functions";
import { createInvoiceFromQuote } from "@/lib/invoices.functions";
import { listServices, type ServiceItem } from "@/lib/services.functions";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — CleanOps" }] }),
  component: QuotesPage,
});

const quotesQuery = queryOptions({ queryKey: ["quotes"], queryFn: () => listQuotes() });
const clientsQuery = queryOptions({ queryKey: ["clients"], queryFn: () => listClients() });
const servicesQueryOpts = queryOptions({
  queryKey: ["services", "active"],
  queryFn: () => listServices({ data: { onlyActive: true } }),
});

const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const STATUS_META: Record<QuoteRow["status"], { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-secondary text-muted-foreground" },
  sent: { label: "Enviado", cls: "bg-[color:var(--info)]/15 text-[color:var(--info)]" },
  approved: { label: "Aprovado", cls: "bg-[color:var(--success)]/15 text-[color:var(--success)]" },
  rejected: { label: "Rejeitado", cls: "bg-destructive/15 text-destructive" },
};

function QuotesPage() {
  const listQ = useServerFn(listQuotes);
  const listC = useServerFn(listClients);
  const create = useServerFn(createQuote);
  const send = useServerFn(sendQuote);
  const del = useServerFn(deleteQuote);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: quotes = [] } = useQuery({ ...quotesQuery, queryFn: () => listQ() });
  const { data: clients = [] } = useQuery({ ...clientsQuery, queryFn: () => listC() });
  const listS = useServerFn(listServices);
  const { data: services = [] } = useQuery({
    ...servicesQueryOpts,
    queryFn: () => listS({ data: { onlyActive: true } }),
  });

  const createMut = useMutation({
    mutationFn: (input: { client_id: string; title: string; items: QuoteItem[]; valid_until: string | null; notes: string | null }) =>
      create({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      setOpen(false);
      toast.success("Orçamento criado");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const sendMut = useMutation({
    mutationFn: (id: string) => send({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Orçamento marcado como enviado");
    },
  });

  const genInvoice = useServerFn(createInvoiceFromQuote);
  const genInvoiceMut = useMutation({
    mutationFn: (quoteId: string) => genInvoice({ data: { quoteId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Fatura gerada", { description: "Veja em Finanças" });
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  function copyPortalLink(token?: string | null) {
    if (!token) return;
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do portal copiado");
  }

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Vendas"
        title="Orçamentos"
        subtitle={`${quotes.length} no total`}
        right={
          <button
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow"
            aria-label="Novo"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      <section className="px-5">
        {quotes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold">Nenhum orçamento ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">Toque em + para criar.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {quotes.map((q) => {
              const meta = STATUS_META[q.status];
              return (
                <li key={q.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {q.client?.name ?? "Cliente"}
                      </p>
                      <h3 className="truncate text-base font-semibold">{q.title}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <p className="text-lg font-bold">{brl(q.total_cents)}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyPortalLink(q.client?.portal_token)}
                        className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground"
                        aria-label="Copiar link"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      {q.status === "draft" && (
                        <button
                          onClick={() => sendMut.mutate(q.id)}
                          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                        >
                          <Send className="size-3" /> Enviar
                        </button>
                      )}
                      {q.status === "approved" && (
                        <button
                          onClick={() => genInvoiceMut.mutate(q.id)}
                          disabled={genInvoiceMut.isPending}
                          className="flex items-center gap-1 rounded-full bg-[color:var(--success)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          <FileCheck className="size-3" /> Gerar fatura
                        </button>
                      )}
                      <button
                        onClick={() => delMut.mutate(q.id)}
                        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {open && (
        <NewQuoteSheet
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          services={services}
          onClose={() => setOpen(false)}
          onSubmit={(payload) => createMut.mutate(payload)}
          busy={createMut.isPending}
        />
      )}
    </MobileShell>
  );
}

function NewQuoteSheet({
  clients,
  services,
  onClose,
  onSubmit,
  busy,
}: {
  clients: { id: string; name: string }[];
  services: ServiceItem[];
  onClose: () => void;
  onSubmit: (data: { client_id: string; title: string; items: QuoteItem[]; valid_until: string | null; notes: string | null }) => void;
  busy: boolean;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([{ description: "", qty: 1, unit_price_cents: 0 }]);
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  const total = items.reduce((s, it) => s + Math.round(it.qty * it.unit_price_cents), 0);
  const canSubmit = !!clientId && title.trim().length > 0 && items.every((i) => i.description.trim() && i.qty > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur">
      <div className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-card p-5 pb-10 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Novo orçamento</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        {clients.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Cadastre um cliente primeiro em Clientes.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Input label="Título" value={title} onChange={setTitle} />

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Itens</label>
              {items.map((it, idx) => (
                <div key={idx} className="space-y-1.5">
                  {services.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        const s = services.find((x) => x.id === e.target.value);
                        if (!s) return;
                        const next = [...items];
                        next[idx] = {
                          ...it,
                          description: s.name,
                          unit_price_cents: s.default_price_cents,
                        };
                        setItems(next);
                      }}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground"
                    >
                      <option value="">— do catálogo —</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {(s.default_price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="grid grid-cols-12 gap-2">
                  <input
                    placeholder="Descrição"
                    value={it.description}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...it, description: e.target.value };
                      setItems(next);
                    }}
                    className="col-span-6 rounded-xl bg-secondary px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={it.qty}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...it, qty: Number(e.target.value) };
                      setItems(next);
                    }}
                    className="col-span-2 rounded-xl bg-secondary px-2 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="R$"
                    value={(it.unit_price_cents / 100) || ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...it, unit_price_cents: Math.round(Number(e.target.value) * 100) };
                      setItems(next);
                    }}
                    className="col-span-3 rounded-xl bg-secondary px-2 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.length > 1 ? items.filter((_, i) => i !== idx) : items)}
                    className="col-span-1 grid place-items-center rounded-xl bg-secondary text-muted-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems([...items, { description: "", qty: 1, unit_price_cents: 0 }])}
                className="w-full rounded-xl border-2 border-dashed border-border py-2 text-xs font-semibold text-muted-foreground"
              >
                + Adicionar item
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Validade</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm"
                />
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="mt-1 text-xl font-bold">{brl(total)}</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm"
              />
            </div>

            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={() =>
                onSubmit({
                  client_id: clientId,
                  title: title.trim(),
                  items,
                  valid_until: validUntil || null,
                  notes: notes.trim() || null,
                })
              }
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Salvando…" : "Criar orçamento"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}