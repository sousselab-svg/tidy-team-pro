import { formatCurrency, formatDate, formatDateTime, formatTime, formatMonthShort } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Calendar, Check, Copy, FileText, MapPin, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  approveQuote,
  getPortalData,
  rejectQuote,
  submitPaymentProof,
  type PortalInvoice,
  type PortalQuote,
} from "@/lib/portal.functions";

export const Route = createFileRoute("/portal/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Portal do cliente" }, { name: "robots", content: "noindex" }] }),
  component: PortalPage,
});

const brl = (cents: number) =>
  formatCurrency(cents);

function PortalPage() {
  const { token } = Route.useParams();
  const fetchData = useServerFn(getPortalData);
  const approve = useServerFn(approveQuote);
  const reject = useServerFn(rejectQuote);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", token],
    queryFn: () => fetchData({ data: { token } }),
    retry: false,
  });

  const approveMut = useMutation({
    mutationFn: (quoteId: string) => approve({ data: { token, quoteId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", token] });
      toast.success("Orçamento aprovado");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const rejectMut = useMutation({
    mutationFn: (quoteId: string) => reject({ data: { token, quoteId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", token] });
      toast.success("Orçamento recusado");
    },
  });

  if (isLoading) {
    return <Shell><p className="px-5 py-10 text-center text-sm text-muted-foreground">Carregando…</p></Shell>;
  }
  if (error || !data) {
    return (
      <Shell>
        <div className="px-5 py-16 text-center">
          <p className="text-lg font-bold">Link inválido</p>
          <p className="mt-2 text-sm text-muted-foreground">Peça um novo link à empresa.</p>
        </div>
      </Shell>
    );
  }

  const { client, company, upcomingJobs, pendingQuotes, openInvoices } = data;
  const quotesToReview = pendingQuotes.filter((q) => q.status === "sent");

  return (
    <Shell>
      <header className="px-5 pt-10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {company.company_name ?? "Portal do cliente"}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Olá, {client.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acompanhe seus serviços, orçamentos e faturas.</p>
      </header>

      <Section icon={<Calendar className="size-4" />} title="Próximos serviços">
        {upcomingJobs.length === 0 ? (
          <Empty text="Nenhum serviço agendado." />
        ) : (
          <ul className="space-y-3">
            {upcomingJobs.map((j) => (
              <li key={j.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {formatDateTime(j.scheduled_at)}
                </p>
                <h3 className="mt-1 text-base font-semibold">{j.title}</h3>
                {j.address && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {j.address}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">{j.duration_minutes} min · {j.status}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<FileText className="size-4" />} title="Orçamentos">
        {pendingQuotes.length === 0 ? (
          <Empty text="Nenhum orçamento." />
        ) : (
          <ul className="space-y-3">
            {pendingQuotes.map((q) => (
              <QuoteCard
                key={q.id}
                quote={q}
                onApprove={() => approveMut.mutate(q.id)}
                onReject={() => rejectMut.mutate(q.id)}
                actionable={q.status === "sent"}
                busy={approveMut.isPending || rejectMut.isPending}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<Wallet className="size-4" />} title="Faturas">
        {openInvoices.length === 0 ? (
          <Empty text="Nenhuma fatura." />
        ) : (
          <ul className="space-y-3">
            {openInvoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                pixKey={company.pix_key}
                pixInstructions={company.pix_instructions}
                token={token}
              />
            ))}
          </ul>
        )}
      </Section>

      <p className="px-5 pb-10 pt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        {company.company_name ?? "CleanOps"} · Portal privado
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[480px]">{children}</div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 pb-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-accent text-accent-foreground">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function QuoteCard({
  quote,
  onApprove,
  onReject,
  actionable,
  busy,
}: {
  quote: PortalQuote;
  onApprove: () => void;
  onReject: () => void;
  actionable: boolean;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const statusMeta =
    quote.status === "approved"
      ? { label: "Aprovado", cls: "bg-[color:var(--success)]/15 text-[color:var(--success)]" }
      : quote.status === "rejected"
        ? { label: "Recusado", cls: "bg-destructive/15 text-destructive" }
        : { label: "Aguardando", cls: "bg-[color:var(--info)]/15 text-[color:var(--info)]" };
  return (
    <li className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-base font-semibold">{quote.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusMeta.cls}`}>{statusMeta.label}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{quote.items.length} item(ns) · Total {brl(quote.total_cents)}</p>
      <button onClick={() => setOpen((v) => !v)} className="mt-2 text-xs font-semibold text-primary">
        {open ? "Ocultar detalhes" : "Ver detalhes"}
      </button>
      {open && (
        <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
          {quote.items.map((it, idx) => (
            <li key={idx} className="flex justify-between gap-2">
              <span className="truncate">{it.description} × {it.qty}</span>
              <span className="shrink-0 font-semibold">{brl(Math.round(it.qty * it.unit_price_cents))}</span>
            </li>
          ))}
          {quote.notes && <li className="pt-2 italic text-muted-foreground">{quote.notes}</li>}
        </ul>
      )}
      {actionable && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <button
            disabled={busy}
            onClick={onReject}
            className="flex-1 rounded-xl bg-secondary py-2 text-xs font-bold text-muted-foreground disabled:opacity-50"
          >
            Recusar
          </button>
          <button
            disabled={busy}
            onClick={onApprove}
            className="flex-1 rounded-xl bg-[color:var(--success)] py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <Check className="mr-1 inline size-3" /> Aprovar
          </button>
        </div>
      )}
    </li>
  );
}

function InvoiceCard({
  invoice,
  pixKey,
  pixInstructions,
  token,
}: {
  invoice: PortalInvoice;
  pixKey: string | null;
  pixInstructions: string | null;
  token: string;
}) {
  const submit = useServerFn(submitPaymentProof);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 5 * 1024 * 1024) throw new Error("Arquivo maior que 5MB");
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) {
        bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)));
      }
      const b64 = btoa(bin);
      return submit({
        data: {
          token,
          invoiceId: invoice.id,
          fileBase64: b64,
          contentType: file.type as "image/png" | "image/jpeg" | "image/webp" | "application/pdf",
          fileName: file.name,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", token] });
      toast.success("Comprovante enviado! Aguardando confirmação.");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const isPaid = invoice.status === "paid";
  const waitingConfirm = invoice.status === "open" && !!invoice.payment_proof_path;

  return (
    <li className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{invoice.title}</h3>
          {invoice.due_date && (
            <p className="text-[11px] text-muted-foreground">Vence {formatDate(invoice.due_date)}</p>
          )}
        </div>
        <p className="shrink-0 text-lg font-bold">{brl(invoice.amount_cents)}</p>
      </div>

      {isPaid ? (
        <p className="mt-3 rounded-xl bg-[color:var(--success)]/10 px-3 py-2 text-xs font-semibold text-[color:var(--success)]">
          ✓ Pago em {invoice.confirmed_at ? formatDate(invoice.confirmed_at) : ""}
        </p>
      ) : waitingConfirm ? (
        <p className="mt-3 rounded-xl bg-[color:var(--warning)]/10 px-3 py-2 text-xs font-semibold text-[color:var(--warning)]">
          ⏳ Comprovante recebido, aguardando confirmação.
        </p>
      ) : (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-3 w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"
          >
            {open ? "Fechar pagamento" : "Pagar via PIX"}
          </button>
          {open && (
            <div className="mt-3 space-y-3 rounded-xl bg-secondary p-3">
              {pixKey ? (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chave PIX</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 truncate rounded-md bg-card px-2 py-1.5 text-xs">{pixKey}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pixKey);
                          toast.success("Chave copiada");
                        }}
                        className="grid size-8 place-items-center rounded-md bg-card"
                        aria-label="Copiar"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  {pixInstructions && <p className="text-[11px] text-muted-foreground">{pixInstructions}</p>}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">A empresa ainda não configurou a chave PIX. Entre em contato.</p>
              )}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) mut.mutate(f);
                  }}
                />
                <button
                  type="button"
                  disabled={mut.isPending}
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background disabled:opacity-50"
                >
                  <Upload className="size-3.5" />
                  {mut.isPending ? "Enviando…" : "Enviar comprovante"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
}
