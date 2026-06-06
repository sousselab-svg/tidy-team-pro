import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DashboardJob = {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  address: string | null;
  price_cents: number;
  client_name: string | null;
};

export type DashboardStats = {
  todayJobsTotal: number;
  todayJobsCompleted: number;
  todayJobsActive: number;
  todayRevenueCents: number;
  monthRevenueCents: number;
  openInvoicesCount: number;
  openInvoicesSumCents: number;
  pendingQuotesCount: number;
  pendingProofsCount: number;
  upcomingJobs: DashboardJob[];
  todayJobs: DashboardJob[];
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardStats> => {
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const monthStart = startOfMonth(now).toISOString();

    const [todayJobsRes, upcomingRes, paidMonthRes, openInvRes, pendingQuotesRes, pendingProofsRes] =
      await Promise.all([
        context.supabase
          .from("jobs")
          .select("id, title, scheduled_at, status, address, price_cents, client:clients(name)")
          .gte("scheduled_at", todayStart)
          .lte("scheduled_at", todayEnd)
          .order("scheduled_at", { ascending: true }),
        context.supabase
          .from("jobs")
          .select("id, title, scheduled_at, status, address, price_cents, client:clients(name)")
          .gt("scheduled_at", todayEnd)
          .neq("status", "cancelled")
          .order("scheduled_at", { ascending: true })
          .limit(5),
        context.supabase
          .from("invoices")
          .select("amount_cents, paid_at")
          .eq("status", "paid")
          .gte("paid_at", monthStart),
        context.supabase
          .from("invoices")
          .select("amount_cents")
          .eq("status", "open"),
        context.supabase
          .from("quotes")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent"),
        context.supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
          .not("payment_proof_path", "is", null),
      ]);

    if (todayJobsRes.error) throw new Error(todayJobsRes.error.message);
    if (upcomingRes.error) throw new Error(upcomingRes.error.message);
    if (paidMonthRes.error) throw new Error(paidMonthRes.error.message);
    if (openInvRes.error) throw new Error(openInvRes.error.message);

    const mapJob = (j: {
      id: string;
      title: string;
      scheduled_at: string;
      status: string;
      address: string | null;
      price_cents: number;
      client?: { name: string } | null;
    }): DashboardJob => ({
      id: j.id,
      title: j.title,
      scheduled_at: j.scheduled_at,
      status: j.status,
      address: j.address,
      price_cents: j.price_cents,
      client_name: j.client?.name ?? null,
    });

    const todayJobs = (todayJobsRes.data ?? []).map((j) => mapJob(j as never));
    const upcomingJobs = (upcomingRes.data ?? []).map((j) => mapJob(j as never));
    const todayCompleted = todayJobs.filter((j) => j.status === "completed");
    const todayActive = todayJobs.filter((j) => j.status === "on_way" || j.status === "in_progress");
    const todayRevenueCents = todayCompleted.reduce((s, j) => s + j.price_cents, 0);
    const monthRevenueCents = (paidMonthRes.data ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const openInvoices = openInvRes.data ?? [];

    return {
      todayJobsTotal: todayJobs.length,
      todayJobsCompleted: todayCompleted.length,
      todayJobsActive: todayActive.length,
      todayRevenueCents,
      monthRevenueCents,
      openInvoicesCount: openInvoices.length,
      openInvoicesSumCents: openInvoices.reduce((s, r) => s + (r.amount_cents ?? 0), 0),
      pendingQuotesCount: pendingQuotesRes.count ?? 0,
      pendingProofsCount: pendingProofsRes.count ?? 0,
      upcomingJobs,
      todayJobs,
    };
  });

export const getPendingProofsCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ count: number }> => {
    const { count, error } = await context.supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .not("payment_proof_path", "is", null);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });