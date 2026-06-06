import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Send, Check, X } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import {
  listInactiveClients,
  listCoupons,
  generateCouponForClient,
  updateCouponStatus,
} from "@/lib/reactivation.functions";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reativacao")({
  head: () => ({ meta: [{ title: "Win-back — CleanOps" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const inFn = useServerFn(listInactiveClients);
  const cpFn = useServerFn(listCoupons);
  const gen = useServerFn(generateCouponForClient);
  const upd = useServerFn(updateCouponStatus);

  const { data: inactive = [] } = useQuery({
    queryKey: ["inactive-clients"],
    queryFn: () => inFn(),
  });
  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => cpFn(),
  });

  const mGen = useMutation({
    mutationFn: (client_id: string) => gen({ data: { client_id } }),
    onSuccess: () => {
      toast.success("Coupon generated");
      qc.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const mStatus = useMutation({
    mutationFn: (v: { id: string; status: "redeemed" | "cancelled" }) =>
      upd({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Growth"
        title="Win-back"
        subtitle="Re-engage clients who went quiet"
      />

      <section className="px-5 pt-2">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Inactive clients
        </h2>
        {inactive.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 size-6" />
            All your clients are active. 🎉
          </div>
        )}
        <ul className="space-y-2">
          {inactive.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-2xl bg-card p-3 ring-1 ring-border"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.last_job_at
                    ? `Last job ${formatDate(new Date(c.last_job_at))}`
                    : "No jobs yet"}
                </p>
              </div>
              <button
                onClick={() => mGen.mutate(c.id)}
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Send className="size-3" /> Coupon
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 pt-6 pb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Coupons
        </h2>
        <ul className="space-y-2">
          {coupons.map((c) => (
            <li key={c.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{c.client?.name ?? "—"}</p>
                  <p className="font-mono text-xs text-primary">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(c.discount_cents)} · expires {c.expires_on}
                  </p>
                </div>
                <span
                  className="rounded-full px-2 py-1 text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--primary) 12%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  {c.status}
                </span>
              </div>
              {c.status === "sent" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => mStatus.mutate({ id: c.id, status: "redeemed" })}
                    className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    <Check className="size-3" /> Redeemed
                  </button>
                  <button
                    onClick={() => mStatus.mutate({ id: c.id, status: "cancelled" })}
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
    </MobileShell>
  );
}