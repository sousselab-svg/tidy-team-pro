import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Gift, Copy, Plus, Check, X } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import {
  listReferrals,
  createReferral,
  markReferralEarned,
  cancelReferral,
  listCredits,
} from "@/lib/referrals.functions";
import { listClients } from "@/lib/clients.functions";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/indicacoes")({
  head: () => ({ meta: [{ title: "Referrals — CleanOps" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const refsFn = useServerFn(listReferrals);
  const clsFn = useServerFn(listClients);
  const credFn = useServerFn(listCredits);
  const create = useServerFn(createReferral);
  const earn = useServerFn(markReferralEarned);
  const cancel = useServerFn(cancelReferral);

  const { data: refs = [] } = useQuery({ queryKey: ["referrals"], queryFn: () => refsFn() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => clsFn() });
  const { data: credits = [] } = useQuery({ queryKey: ["credits"], queryFn: () => credFn() });

  const [open, setOpen] = useState(false);

  const mCreate = useMutation({
    mutationFn: (v: { referrer_client_id: string; referred_name: string; referred_email?: string; credit_cents: number }) =>
      create({ data: v }),
    onSuccess: () => {
      toast.success("Referral added");
      qc.invalidateQueries({ queryKey: ["referrals"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const mEarn = useMutation({
    mutationFn: (id: string) => earn({ data: { id } }),
    onSuccess: () => {
      toast.success("Credit awarded");
      qc.invalidateQueries({ queryKey: ["referrals"] });
      qc.invalidateQueries({ queryKey: ["credits"] });
    },
  });
  const mCancel = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referrals"] }),
  });

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Growth"
        title="Referrals"
        subtitle="Refer-a-friend with account credit"
        right={
          <button
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"
            aria-label="New referral"
          >
            <Plus className="size-4" />
          </button>
        }
      />

      <section className="px-5 pt-2">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Client codes
        </h2>
        <ul className="space-y-2">
          {clients.slice(0, 6).map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-2xl bg-card p-3 ring-1 ring-border"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {(c as { referral_code?: string }).referral_code ?? "—"}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText((c as { referral_code?: string }).referral_code ?? "");
                  toast.success("Code copied");
                }}
                className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground"
                aria-label="Copy"
              >
                <Copy className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {credits.length > 0 && (
        <section className="px-5 pt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Credit balances
          </h2>
          <ul className="space-y-2">
            {credits.map((c) => (
              <li
                key={c.client_id}
                className="flex items-center justify-between rounded-2xl bg-card p-3 ring-1 ring-border"
              >
                <span className="text-sm font-semibold">{c.client?.name ?? "—"}</span>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(c.balance_cents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-5 pt-6 pb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Referrals
        </h2>
        {refs.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Gift className="mx-auto mb-2 size-6" />
            No referrals yet.
          </div>
        )}
        <ul className="space-y-2">
          {refs.map((r) => (
            <li key={r.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{r.referred_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    Referred by {r.referrer?.name ?? "—"} · {formatCurrency(r.credit_cents)}
                  </p>
                </div>
                <span
                  className="rounded-full px-2 py-1 text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--primary) 12%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  {r.status}
                </span>
              </div>
              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => mEarn.mutate(r.id)}
                    className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    <Check className="size-3" /> Mark earned
                  </button>
                  <button
                    onClick={() => mCancel.mutate(r.id)}
                    className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"
                  >
                    <X className="size-3" /> Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {open && (
        <NewModal
          clients={clients}
          onClose={() => setOpen(false)}
          onSubmit={(v) => mCreate.mutate(v)}
          pending={mCreate.isPending}
        />
      )}
    </MobileShell>
  );
}

function NewModal({
  clients,
  onClose,
  onSubmit,
  pending,
}: {
  clients: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (v: {
    referrer_client_id: string;
    referred_name: string;
    referred_email?: string;
    credit_cents: number;
  }) => void;
  pending: boolean;
}) {
  const [ref, setRef] = useState(clients[0]?.id ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [credit, setCredit] = useState("25");

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-[480px] mx-auto rounded-t-3xl bg-card p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">New referral</h2>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Referrer (existing client)
          </span>
          <select value={ref} onChange={(e) => setRef(e.target.value)} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Referred name
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Referred email (optional)
          </span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Credit (USD)
          </span>
          <input value={credit} onChange={(e) => setCredit(e.target.value)} type="number" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" />
        </label>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 rounded-full bg-secondary py-2.5 text-sm font-semibold">
            Cancel
          </button>
          <button
            disabled={pending || !ref || !name}
            onClick={() =>
              onSubmit({
                referrer_client_id: ref,
                referred_name: name,
                referred_email: email || undefined,
                credit_cents: Math.round(Number(credit) * 100),
              })
            }
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Saving…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}