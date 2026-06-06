import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MonthlyPoint = { month: string; revenue_cents: number; jobs: number };
export type StatusBreakdown = { status: string; count: number };
export type TopClient = { client_id: string; name: string; revenue_cents: number; jobs: number };
export type ReportsData = {
  rangeStart: string;
  rangeEnd: string;
  totalRevenueCents: number;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  avgTicketCents: number;
  invoicesPaidCents: number;
  invoicesOpenCents: number;
  invoicesOverdueCents: number;
  monthly: MonthlyPoint[];
  status: StatusBreakdown[];
  topClients: TopClient[];
};

function monthsBack(n: number): { start: Date; end: Date; keys: string[] } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const start = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return { start, end, keys };
}

export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { months?: number } | undefined) => ({ months: Math.min(Math.max(data?.months ?? 6, 1), 24) }))
  .handler(async ({ data, context }): Promise<ReportsData> => {
    const { start, end, keys } = monthsBack(data.months);
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const todayIso = new Date().toISOString().slice(0, 10);

    const [jobsRes, invPaidRes, invOpenRes] = await Promise.all([
      context.supabase
        .from("jobs")
        .select("id, status, price_cents, scheduled_at, client_id, client:clients(name)")
        .gte("scheduled_at", startIso)
        .lt("scheduled_at", endIso),
      context.supabase
        .from("invoices")
        .select("amount_cents, paid_at")
        .eq("status", "paid")
        .gte("paid_at", startIso)
        .lt("paid_at", endIso),
      context.supabase
        .from("invoices")
        .select("amount_cents, due_date, status")
        .eq("status", "open"),
    ]);
    if (jobsRes.error) throw new Error(jobsRes.error.message);
    if (invPaidRes.error) throw new Error(invPaidRes.error.message);
    if (invOpenRes.error) throw new Error(invOpenRes.error.message);

    const jobs = jobsRes.data ?? [];
    const completed = jobs.filter((j) => j.status === "completed");
    const cancelled = jobs.filter((j) => j.status === "cancelled");
    const totalRevenueCents = completed.reduce((s, j) => s + (j.price_cents ?? 0), 0);
    const avgTicketCents = completed.length ? Math.round(totalRevenueCents / completed.length) : 0;

    // Monthly buckets (revenue from completed jobs by scheduled_at month)
    const monthlyMap = new Map<string, MonthlyPoint>();
    for (const k of keys) monthlyMap.set(k, { month: k, revenue_cents: 0, jobs: 0 });
    for (const j of jobs) {
      const d = new Date(j.scheduled_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const point = monthlyMap.get(k);
      if (!point) continue;
      point.jobs += 1;
      if (j.status === "completed") point.revenue_cents += j.price_cents ?? 0;
    }

    // Status breakdown
    const statusMap = new Map<string, number>();
    for (const j of jobs) statusMap.set(j.status, (statusMap.get(j.status) ?? 0) + 1);
    const status: StatusBreakdown[] = Array.from(statusMap.entries())
      .map(([s, c]) => ({ status: s, count: c }))
      .sort((a, b) => b.count - a.count);

    // Top clients
    const clientMap = new Map<string, TopClient>();
    for (const j of completed) {
      if (!j.client_id) continue;
      const name = (j as unknown as { client?: { name?: string } }).client?.name ?? "—";
      const prev = clientMap.get(j.client_id) ?? { client_id: j.client_id, name, revenue_cents: 0, jobs: 0 };
      prev.revenue_cents += j.price_cents ?? 0;
      prev.jobs += 1;
      clientMap.set(j.client_id, prev);
    }
    const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.revenue_cents - a.revenue_cents)
      .slice(0, 10);

    const invoicesPaidCents = (invPaidRes.data ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const openInv = invOpenRes.data ?? [];
    const invoicesOpenCents = openInv.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const invoicesOverdueCents = openInv
      .filter((r) => r.due_date && r.due_date < todayIso)
      .reduce((s, r) => s + (r.amount_cents ?? 0), 0);

    return {
      rangeStart: startIso,
      rangeEnd: endIso,
      totalRevenueCents,
      totalJobs: jobs.length,
      completedJobs: completed.length,
      cancelledJobs: cancelled.length,
      avgTicketCents,
      invoicesPaidCents,
      invoicesOpenCents,
      invoicesOverdueCents,
      monthly: Array.from(monthlyMap.values()),
      status,
      topClients,
    };
  });