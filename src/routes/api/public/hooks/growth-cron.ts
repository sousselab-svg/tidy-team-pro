import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily cron: generate due recurring jobs + win-back coupons for inactive clients.
 * Idempotent: skips clients that already have an active "sent" coupon.
 */
export const Route = createFileRoute("/api/public/hooks/growth-cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!apiKey || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const todayIso = new Date().toISOString().slice(0, 10);

        // 1) Generate jobs for due recurring schedules
        const { data: due, error: dueErr } = await supabaseAdmin
          .from("recurring_schedules")
          .select("*")
          .eq("active", true)
          .lte("next_run_on", todayIso);
        if (dueErr) {
          return new Response(JSON.stringify({ error: dueErr.message }), { status: 500 });
        }

        let jobsCreated = 0;
        for (const s of due ?? []) {
          const scheduled = new Date(`${s.next_run_on}T${s.time_of_day}`);
          const { error: jobErr } = await supabaseAdmin.from("jobs").insert({
            owner_id: s.owner_id,
            client_id: s.client_id,
            title: s.title,
            address: s.address,
            scheduled_at: scheduled.toISOString(),
            duration_minutes: s.duration_minutes,
            price_cents: s.price_cents,
            team_id: s.team_id,
            notes: s.notes,
          });
          if (jobErr) continue;
          jobsCreated++;
          const next = new Date(scheduled);
          if (s.frequency === "weekly") next.setDate(next.getDate() + 7);
          else if (s.frequency === "biweekly") next.setDate(next.getDate() + 14);
          else next.setMonth(next.getMonth() + 1);
          await supabaseAdmin
            .from("recurring_schedules")
            .update({
              next_run_on: next.toISOString().slice(0, 10),
              last_generated_at: new Date().toISOString(),
            })
            .eq("id", s.id);
        }

        // 2) Generate win-back coupons for inactive clients (per company)
        const { data: settingsList } = await supabaseAdmin
          .from("company_settings")
          .select("owner_id, reactivation_days, reactivation_discount_cents");

        let couponsCreated = 0;
        for (const cfg of settingsList ?? []) {
          const days = cfg.reactivation_days ?? 60;
          const discount = cfg.reactivation_discount_cents ?? 1500;
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);

          const { data: clients } = await supabaseAdmin
            .from("clients")
            .select("id")
            .eq("owner_id", cfg.owner_id);

          for (const c of clients ?? []) {
            const { data: lastJob } = await supabaseAdmin
              .from("jobs")
              .select("scheduled_at")
              .eq("client_id", c.id)
              .neq("status", "cancelled")
              .order("scheduled_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            const last = lastJob?.scheduled_at ? new Date(lastJob.scheduled_at) : null;
            if (last && last >= cutoff) continue;

            // already have an unredeemed coupon?
            const { data: existing } = await supabaseAdmin
              .from("reactivation_coupons")
              .select("id")
              .eq("client_id", c.id)
              .eq("status", "sent")
              .maybeSingle();
            if (existing) continue;

            const code = `WB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            const expires = new Date();
            expires.setDate(expires.getDate() + 30);
            await supabaseAdmin.from("reactivation_coupons").insert({
              owner_id: cfg.owner_id,
              client_id: c.id,
              code,
              discount_cents: discount,
              expires_on: expires.toISOString().slice(0, 10),
              status: "sent",
            });
            couponsCreated++;
          }
        }

        return new Response(
          JSON.stringify({ ok: true, jobsCreated, couponsCreated }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});