import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAi(opts: {
  system: string;
  user: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  };
  if (opts.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: opts.jsonSchema.name, schema: opts.jsonSchema.schema, strict: true },
    };
  }
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI rate limit. Tente em alguns segundos.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

// ============== 1. AI Quote Draft ==============

const DraftInput = z.object({
  description: z.string().min(5).max(2000),
});

export type AiQuoteDraft = {
  title: string;
  items: { description: string; qty: number; unit_price_cents: number }[];
  notes: string;
};

export const aiDraftQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DraftInput.parse(raw))
  .handler(async ({ data, context }): Promise<AiQuoteDraft> => {
    const { data: catalog } = await context.supabase
      .from("service_catalog")
      .select("name, default_price_cents, default_duration_minutes, category")
      .eq("active", true)
      .limit(50);
    const catalogStr = (catalog ?? [])
      .map((s) => `- ${s.name} (${s.category ?? "—"}) ~$${(s.default_price_cents / 100).toFixed(2)} / ${s.default_duration_minutes}min`)
      .join("\n") || "(catálogo vazio — invente itens razoáveis)";

    const content = await callAi({
      system:
        "Você é um assistente de orçamentos para uma empresa de limpeza/serviços nos EUA. Recebe a descrição em texto livre do cliente e gera itens estruturados. Use os preços do catálogo quando aplicável (USD em centavos). Seja objetivo. Responda APENAS JSON válido.",
      user: `CATÁLOGO:\n${catalogStr}\n\nDESCRIÇÃO DO SERVIÇO:\n${data.description}\n\nGere um título curto, 1-6 itens com qty e unit_price_cents (USD em centavos), e uma nota breve para o cliente.`,
      jsonSchema: {
        name: "quote_draft",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["title", "items", "notes"],
          properties: {
            title: { type: "string" },
            notes: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["description", "qty", "unit_price_cents"],
                properties: {
                  description: { type: "string" },
                  qty: { type: "number" },
                  unit_price_cents: { type: "integer" },
                },
              },
            },
          },
        },
      },
    });
    try {
      const parsed = JSON.parse(content) as AiQuoteDraft;
      return {
        title: String(parsed.title ?? "").slice(0, 200),
        notes: String(parsed.notes ?? "").slice(0, 2000),
        items: (parsed.items ?? []).slice(0, 10).map((it) => ({
          description: String(it.description).slice(0, 200),
          qty: Math.max(0.01, Number(it.qty) || 1),
          unit_price_cents: Math.max(0, Math.round(Number(it.unit_price_cents) || 0)),
        })),
      };
    } catch {
      throw new Error("Resposta da IA inválida. Tente reformular.");
    }
  });

// ============== 2. Daily AI Summary ==============

export type AiDailySummary = {
  summary: string;
  highlights: string[];
  risks: string[];
  generated_at: string;
};

function startEnd(d: Date) {
  const s = new Date(d); s.setHours(0, 0, 0, 0);
  const e = new Date(d); e.setHours(23, 59, 59, 999);
  return { s: s.toISOString(), e: e.toISOString() };
}

export const aiDailySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiDailySummary> => {
    const now = new Date();
    const { s, e } = startEnd(now);
    const [{ data: jobs }, { data: invoices }] = await Promise.all([
      context.supabase
        .from("jobs")
        .select("title, status, scheduled_at, price_cents, address, team_name")
        .gte("scheduled_at", s)
        .lte("scheduled_at", e)
        .order("scheduled_at", { ascending: true }),
      context.supabase
        .from("invoices")
        .select("status, amount_cents, due_date")
        .in("status", ["open", "pending_review"]),
    ]);

    const jobsStr = (jobs ?? [])
      .map((j) => `- ${new Date(j.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ${j.title} [${j.status}] $${(j.price_cents / 100).toFixed(0)} ${j.team_name ?? ""} ${j.address ?? ""}`)
      .join("\n") || "(sem jobs hoje)";
    const openSum = (invoices ?? []).reduce((s2, i) => s2 + (i.amount_cents ?? 0), 0);

    const content = await callAi({
      system: "Você é o chief of staff de uma empresa de serviços. Gere um briefing executivo, curto, acionável, em português. Responda APENAS JSON.",
      user: `Data: ${now.toLocaleDateString("pt-BR")}\n\nJOBS DE HOJE:\n${jobsStr}\n\nFATURAS EM ABERTO: ${invoices?.length ?? 0} = $${(openSum / 100).toFixed(2)}\n\nGere: summary (2-3 frases), highlights (até 4 bullets curtos), risks (até 4 bullets curtos com ações sugeridas).`,
      jsonSchema: {
        name: "daily_summary",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["summary", "highlights", "risks"],
          properties: {
            summary: { type: "string" },
            highlights: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
          },
        },
      },
    });
    try {
      const parsed = JSON.parse(content) as Omit<AiDailySummary, "generated_at">;
      return {
        summary: String(parsed.summary ?? "").slice(0, 1000),
        highlights: (parsed.highlights ?? []).slice(0, 6).map((h) => String(h).slice(0, 200)),
        risks: (parsed.risks ?? []).slice(0, 6).map((r) => String(r).slice(0, 200)),
        generated_at: new Date().toISOString(),
      };
    } catch {
      throw new Error("Resposta da IA inválida.");
    }
  });

// ============== 3. Risk Scan (no-show + churn) ==============

export type RiskItem = {
  kind: "no_show" | "churn";
  client_id: string;
  client_name: string;
  score: number; // 0-100
  reason: string;
  job_id?: string | null;
};

export const aiRiskScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RiskItem[]> => {
    const now = new Date();
    const in72h = new Date(now.getTime() + 72 * 3600 * 1000).toISOString();
    const ago180d = new Date(now.getTime() - 180 * 24 * 3600 * 1000).toISOString();

    const [{ data: upcoming }, { data: allJobs }, { data: clients }] = await Promise.all([
      context.supabase
        .from("jobs")
        .select("id, title, scheduled_at, client_id, status")
        .gte("scheduled_at", now.toISOString())
        .lte("scheduled_at", in72h),
      context.supabase
        .from("jobs")
        .select("client_id, status, scheduled_at")
        .gte("scheduled_at", ago180d),
      context.supabase.from("clients").select("id, name, created_at"),
    ]);

    const clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]));
    const items: RiskItem[] = [];

    // No-show risk: based on past cancelled rate per client
    const stats = new Map<string, { total: number; cancelled: number; completed: number; last?: string }>();
    for (const j of allJobs ?? []) {
      if (!j.client_id) continue;
      const s = stats.get(j.client_id) ?? { total: 0, cancelled: 0, completed: 0 };
      s.total++;
      if (j.status === "cancelled") s.cancelled++;
      if (j.status === "completed") {
        s.completed++;
        if (!s.last || j.scheduled_at > s.last) s.last = j.scheduled_at;
      }
      stats.set(j.client_id, s);
    }

    for (const j of upcoming ?? []) {
      if (!j.client_id) continue;
      const s = stats.get(j.client_id);
      if (!s || s.total < 2) continue;
      const rate = s.cancelled / s.total;
      if (rate >= 0.25) {
        items.push({
          kind: "no_show",
          client_id: j.client_id,
          client_name: clientMap.get(j.client_id) ?? "Cliente",
          score: Math.round(Math.min(100, rate * 120)),
          reason: `${s.cancelled}/${s.total} jobs cancelados — confirme presença por SMS.`,
          job_id: j.id,
        });
      }
    }

    // Churn: completed job >= 60d ago and no future booking
    const futureClients = new Set((upcoming ?? []).map((j) => j.client_id).filter(Boolean));
    const sixtyDaysAgo = now.getTime() - 60 * 24 * 3600 * 1000;
    for (const [cid, s] of stats.entries()) {
      if (futureClients.has(cid)) continue;
      if (!s.last || s.completed === 0) continue;
      const lastTs = new Date(s.last).getTime();
      const days = Math.floor((now.getTime() - lastTs) / (24 * 3600 * 1000));
      if (lastTs < sixtyDaysAgo) {
        items.push({
          kind: "churn",
          client_id: cid,
          client_name: clientMap.get(cid) ?? "Cliente",
          score: Math.min(100, 40 + Math.floor(days / 6)),
          reason: `Sem jobs há ${days} dias. Ofereça um win-back.`,
        });
      }
    }

    items.sort((a, b) => b.score - a.score);
    return items.slice(0, 20);
  });