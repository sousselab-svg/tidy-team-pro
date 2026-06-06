import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReminderKind =
  | "invoice_due_soon"
  | "invoice_overdue"
  | "job_tomorrow"
  | "job_thank_you";

export type ReminderItem = {
  id: string;
  kind: ReminderKind;
  title: string;
  subtitle: string;
  client_name: string | null;
  client_phone: string | null;
  amount_cents: number | null;
  due_date: string | null;
  scheduled_at: string | null;
  portal_token: string | null;
  days: number; // days until/since (negative = overdue/past)
};

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function endOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

export const listReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReminderItem[]> => {
    const today = new Date();
    const todayYmd = today.toISOString().slice(0, 10);
    const in3 = new Date(today);
    in3.setDate(in3.getDate() + 3);
    const in3Ymd = in3.toISOString().slice(0, 10);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [invDueRes, invOverdueRes, jobsTomorrowRes, jobsCompletedTodayRes] =
      await Promise.all([
        context.supabase
          .from("invoices")
          .select("id, title, amount_cents, due_date, client:clients(name, phone, portal_token)")
          .eq("status", "open")
          .gte("due_date", todayYmd)
          .lte("due_date", in3Ymd)
          .order("due_date", { ascending: true }),
        context.supabase
          .from("invoices")
          .select("id, title, amount_cents, due_date, client:clients(name, phone, portal_token)")
          .eq("status", "open")
          .lt("due_date", todayYmd)
          .order("due_date", { ascending: true }),
        context.supabase
          .from("jobs")
          .select("id, title, address, scheduled_at, status, client:clients(name, phone, portal_token)")
          .gte("scheduled_at", startOfDayISO(tomorrow))
          .lte("scheduled_at", endOfDayISO(tomorrow))
          .neq("status", "cancelled")
          .order("scheduled_at", { ascending: true }),
        context.supabase
          .from("jobs")
          .select("id, title, scheduled_at, updated_at, status, client:clients(name, phone, portal_token)")
          .eq("status", "completed")
          .gte("updated_at", startOfDayISO(today))
          .lte("updated_at", endOfDayISO(today))
          .order("updated_at", { ascending: false }),
      ]);

    const out: ReminderItem[] = [];
    const t0 = new Date(todayYmd + "T00:00:00").getTime();

    for (const r of (invDueRes.data ?? []) as any[]) {
      const days = Math.round((new Date(r.due_date).getTime() - t0) / 86400000);
      out.push({
        id: `inv-due-${r.id}`,
        kind: "invoice_due_soon",
        title: r.title,
        subtitle: days === 0 ? "Vence hoje" : days === 1 ? "Vence amanhã" : `Vence em ${days} dias`,
        client_name: r.client?.name ?? null,
        client_phone: r.client?.phone ?? null,
        amount_cents: r.amount_cents,
        due_date: r.due_date,
        scheduled_at: null,
        portal_token: r.client?.portal_token ?? null,
        days,
      });
    }
    for (const r of (invOverdueRes.data ?? []) as any[]) {
      const days = Math.round((t0 - new Date(r.due_date).getTime()) / 86400000);
      out.push({
        id: `inv-over-${r.id}`,
        kind: "invoice_overdue",
        title: r.title,
        subtitle: days === 1 ? "Vencida há 1 dia" : `Vencida há ${days} dias`,
        client_name: r.client?.name ?? null,
        client_phone: r.client?.phone ?? null,
        amount_cents: r.amount_cents,
        due_date: r.due_date,
        scheduled_at: null,
        portal_token: r.client?.portal_token ?? null,
        days: -days,
      });
    }
    for (const r of (jobsTomorrowRes.data ?? []) as any[]) {
      out.push({
        id: `job-tom-${r.id}`,
        kind: "job_tomorrow",
        title: r.title,
        subtitle: "Serviço amanhã",
        client_name: r.client?.name ?? null,
        client_phone: r.client?.phone ?? null,
        amount_cents: null,
        due_date: null,
        scheduled_at: r.scheduled_at,
        portal_token: r.client?.portal_token ?? null,
        days: 1,
      });
    }
    for (const r of (jobsCompletedTodayRes.data ?? []) as any[]) {
      out.push({
        id: `job-thx-${r.id}`,
        kind: "job_thank_you",
        title: r.title,
        subtitle: "Concluído hoje",
        client_name: r.client?.name ?? null,
        client_phone: r.client?.phone ?? null,
        amount_cents: null,
        due_date: null,
        scheduled_at: r.scheduled_at,
        portal_token: r.client?.portal_token ?? null,
        days: 0,
      });
    }
    return out;
  });