import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Copy, FileCheck, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { listClients } from "@/lib/clients.functions";
import {
  cancelInvoice,
  confirmInvoicePayment,
  createInvoice,
  deleteInvoice,
  getProofSignedUrl,
  listInvoices,
  type InvoiceRow,
} from "@/lib/invoices.functions";

export const Route = createFileRoute("/_authenticated/faturamento")({
  head: () => ({ meta: [{ title: "Faturamento — CleanOps" }] }),
  component: BillingPage,
});

const invoicesQuery = queryOptions({ queryKey: ["invoices"], queryFn: () => listInvoices() });
const clientsQuery = queryOptions({ queryKey: ["clients"], queryFn: () => listClients() });

const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const STATUS: Record<InvoiceRow["status"], { label: string; cls: string }> = {
  open: { label: "Em aberto", cls: "bg-[color:var(--info)]/15 text-[color:var(--info)]" },
  paid: { label: "Pago", cls: "bg-[color:var(--success)]/15 text-[color:var(--success)]" },
  cancelled: { label: "Cancelada", cls: "bg-secondary text-muted-foreground" },
};

function BillingPage() {
  const listI = useServerFn(listInvoices);
  const listC = useServerFn(listClients);
  const create = useServerFn(createInvoice);
  const confirm = useServerFn(confirmInvoicePayment);
  const cancel = useServerFn(cancelInvoice);
  const del = useServerFn(deleteInvoice);
  const getUrl = useServerFn(getProofSignedUrl);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: invoices = [] } = useQuery({ ...invoicesQuery, queryFn: () => listI() });
  const { data: clients = [] } = useQuery({ ...clientsQuery, queryFn: () => listC() });

  const createMut = useMutation({
    mutationFn: (input: { client_id: string; title: string; amount_cents: number; due_date: string | null }) =>
      create({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setOpen(false);
      toast.success("Fatura criada");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => confirm({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["pending-proofs-count"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Pagamento confirmado");
    },
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  async function viewProof(path: string) {
    try {
      const { url } = await getUrl({ data: { path } });
      window.open(url, "_blank");
    } catch (e) {
      toast.error("Erro", { description: (e as Error).message });
    }
  }

  function copyPortalLink(token?: string | null) {
    if (!token) return;
    navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
    toast.success("Link copiado");
  }

  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount_cents, 0);
  const openSum = invoices.filter((i) => i.status === "open").reduce((s, i) => s + i.amount_cents, 0);
  const awaitingConfirm = invoices.filter((i) => i.status === "open" && i.payment_proof_path);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Finanças"
        title="Faturamento"
        subtitle={`${brl(paid)} recebido · ${brl(openSum)} em aberto`}
        right={
          <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow">
            <Plus className="size-5" />
          </button>
        }
      />

      {awaitingConfirm.length > 0 && (
        <section className="px-5 pb-3">
          <div className="rounded-2xl bg-[color:var(--warning)]/10 p-4 ring-1 ring-[color:var(--warning)]/30">
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--warning)]">
              {awaitingConfirm.length} comprovante(s) aguardando confirmação
            </p>
          </div>
        </section>
      )}

      <section className="px-5">
        {invoices.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold">Nenhuma fatura ainda</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {invoices.map((inv) => {
              const meta = STATUS[inv.status];
              const hasProof = !!inv.payment_proof_path && inv.status === "open";
              return (
                <li key={inv.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {inv.client?.name ?? "Cliente"}
                      </p>
                      <h3 className="truncate text-base font-semibold">{inv.title}</h3>
                      {inv.due_date && (
                        <p className="text-[11px] text-muted-foreground">
                          Vence {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <p className="text-lg font-bold">{brl(inv.amount_cents)}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyPortalLink(inv.client?.portal_token)}
                        className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground"
                        aria-label="Copiar link"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      {hasProof && (
                        <button
                          onClick={() => viewProof(inv.payment_proof_path!)}
                          className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"
                        >
                          <FileCheck className="size-3" /> Ver comprovante
                        </button>
                      )}
                      {inv.status === "open" && (
                        <button
                          onClick={() => confirmMut.mutate(inv.id)}
                          className="flex items-center gap-1 rounded-full bg-[color:var(--success)] px-3 py-1.5 text-xs font-bold text-white"
                        >
                          <Check className="size-3" /> Confirmar
                        </button>
                      )}
                      {inv.status === "open" && (
                        <button
                          onClick={() => cancelMut.mutate(inv.id)}
                          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Cancelar"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                      {inv.status !== "open" && (
                        <button
                          onClick={() => delMut.mutate(inv.id)}
                          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {open && (
        <NewInvoiceSheet
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          onClose={() => setOpen(false)}
          onSubmit={(payload) => createMut.mutate(payload)}
          busy={createMut.isPending}
        />
      )}
    </MobileShell>
  );
}

function NewInvoiceSheet({
  clients,
  onClose,
  onSubmit,
  busy,
}: {
  clients: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: { client_id: string; title: string; amount_cents: number; due_date: string | null }) => void;
  busy: boolean;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const amountCents = Math.round((Number(amount) || 0) * 100);
  const canSubmit = !!clientId && title.trim() && amountCents > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-10 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Nova fatura</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        {clients.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Cadastre um cliente primeiro.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor (R$)</label>
                <input type="number" step={0.01} min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vencimento</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm" />
              </div>
            </div>
            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={() => onSubmit({ client_id: clientId, title: title.trim(), amount_cents: amountCents, due_date: dueDate || null })}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Salvando…" : "Criar fatura"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}