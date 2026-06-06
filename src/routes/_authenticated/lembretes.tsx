import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Bell, MessageCircle, Copy, AlertTriangle, Clock, CheckCircle2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { getSettings } from "@/lib/settings.functions";
import { listReminders, type ReminderItem, type ReminderKind } from "@/lib/reminders.functions";

export const Route = createFileRoute("/_authenticated/lembretes")({
  head: () => ({ meta: [{ title: "Lembretes — CleanOps" }] }),
  component: RemindersPage,
});

const brl = (cents: number) =>
  formatCurrency(cents);

const remindersQuery = queryOptions({ queryKey: ["reminders"], queryFn: () => listReminders() });
const settingsQuery = queryOptions({ queryKey: ["settings"], queryFn: () => getSettings() });

type Filter = "all" | ReminderKind;

const KIND_META: Record<ReminderKind, { label: string; tone: string; Icon: typeof Bell }> = {
  invoice_overdue: { label: "Vencidas", tone: "bg-destructive/15 text-destructive", Icon: AlertTriangle },
  invoice_due_soon: { label: "Vencendo", tone: "bg-amber-500/15 text-amber-600", Icon: Clock },
  job_tomorrow: { label: "Amanhã", tone: "bg-primary/15 text-primary", Icon: CalendarClock },
  job_thank_you: { label: "Agradecer", tone: "bg-emerald-500/15 text-emerald-600", Icon: CheckCircle2 },
};

function buildMessage(item: ReminderItem, companyName: string | null, pixKey: string | null, origin: string): string {
  const company = companyName?.trim() || "nossa equipe";
  const name = item.client_name?.split(" ")[0] ?? "Olá";
  const portalUrl = item.portal_token ? `${origin}/portal/${item.portal_token}` : null;

  switch (item.kind) {
    case "invoice_due_soon": {
      const venc = item.due_date
        ? new Date(item.due_date + "T00:00:00").toLocaleDateString("pt-BR")
        : "";
      const lines = [
        `Oi ${name}! Aqui é ${company}.`,
        `Passando para lembrar da sua fatura *${item.title}*${item.amount_cents != null ? ` no valor de *${brl(item.amount_cents)}*` : ""}, com vencimento em *${venc}*.`,
      ];
      if (pixKey) lines.push(`Chave PIX: ${pixKey}`);
      if (portalUrl) lines.push(`Detalhes e comprovante: ${portalUrl}`);
      lines.push("Qualquer dúvida, é só responder. Obrigado!");
      return lines.join("\n\n");
    }
    case "invoice_overdue": {
      const lines = [
        `Oi ${name}! Aqui é ${company}.`,
        `Identificamos que a fatura *${item.title}*${item.amount_cents != null ? ` (*${brl(item.amount_cents)}*)` : ""} está em aberto desde ${item.due_date ? new Date(item.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "o vencimento"}.`,
        "Pode confirmar o pagamento para a gente regularizar?",
      ];
      if (pixKey) lines.push(`Chave PIX: ${pixKey}`);
      if (portalUrl) lines.push(`Enviar comprovante: ${portalUrl}`);
      return lines.join("\n\n");
    }
    case "job_tomorrow": {
      const when = item.scheduled_at
        ? new Date(item.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
        : "amanhã";
      return [
        `Oi ${name}! Aqui é ${company}.`,
        `Confirmando seu agendamento *${item.title}* para *${when}*.`,
        "Está tudo certo? Se precisar remarcar, é só me avisar por aqui.",
      ].join("\n\n");
    }
    case "job_thank_you": {
      const lines = [
        `Oi ${name}! Aqui é ${company}.`,
        `Muito obrigado pela confiança em escolher a gente hoje para *${item.title}*. Esperamos que tenha ficado tudo ótimo!`,
      ];
      if (portalUrl) lines.push(`Seu portal: ${portalUrl}`);
      lines.push("Se puder, conte para os amigos. Até a próxima!");
      return lines.join("\n\n");
    }
  }
}

function waLink(phone: string | null, message: string) {
  const digits = (phone ?? "").replace(/\D+/g, "");
  const base = digits ? `https://wa.me/${digits}` : `https://wa.me/`;
  return `${base}?text=${encodeURIComponent(message)}`;
}

function RemindersPage() {
  const listFn = useServerFn(listReminders);
  const settingsFn = useServerFn(getSettings);
  const { data: items } = useQuery({ ...remindersQuery, queryFn: () => listFn() });
  const { data: settings } = useQuery({ ...settingsQuery, queryFn: () => settingsFn() });
  const [filter, setFilter] = useState<Filter>("all");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, invoice_overdue: 0, invoice_due_soon: 0, job_tomorrow: 0, job_thank_you: 0 };
    for (const it of items ?? []) {
      c.all += 1;
      c[it.kind] += 1;
    }
    return c;
  }, [items]);

  const visible = (items ?? []).filter((it) => filter === "all" || it.kind === filter);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Atendimento"
        title="Lembretes"
        subtitle="Mensagens prontas para enviar pelo WhatsApp"
      />

      <div className="flex gap-2 overflow-x-auto px-5 pb-3">
        {(
          [
            { id: "all" as const, label: "Todos" },
            { id: "invoice_overdue" as const, label: KIND_META.invoice_overdue.label },
            { id: "invoice_due_soon" as const, label: KIND_META.invoice_due_soon.label },
            { id: "job_tomorrow" as const, label: KIND_META.job_tomorrow.label },
            { id: "job_thank_you" as const, label: KIND_META.job_thank_you.label },
          ]
        ).map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${active ? "bg-primary text-primary-foreground ring-primary" : "bg-secondary text-muted-foreground ring-border"}`}
            >
              {f.label} <span className="opacity-70">({counts[f.id]})</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 px-5 pb-10">
        {visible.length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-border">
            <Bell className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">Nada pendente</p>
            <p className="text-xs text-muted-foreground">Volte mais tarde — novos lembretes aparecem aqui automaticamente.</p>
          </div>
        )}

        {visible.map((item) => {
          const meta = KIND_META[item.kind];
          const Icon = meta.Icon;
          const msg = buildMessage(item, settings?.company_name ?? null, settings?.pix_key ?? null, origin);
          const href = waLink(item.client_phone, msg);
          const hasPhone = !!item.client_phone;
          return (
            <article key={item.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex items-start gap-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${meta.tone}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold">{item.client_name ?? "Sem cliente"}</p>
                    {item.amount_cents != null && (
                      <span className="shrink-0 text-sm font-bold">{brl(item.amount_cents)}</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <pre className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl bg-secondary p-3 text-[12px] leading-relaxed text-foreground/90">{msg}</pre>

              <div className="mt-3 flex gap-2">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white"
                >
                  <MessageCircle className="size-4" />
                  {hasPhone ? "WhatsApp" : "Escolher contato"}
                </a>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(msg);
                      toast.success("Mensagem copiada");
                    } catch {
                      toast.error("Não foi possível copiar");
                    }
                  }}
                  className="grid size-11 place-items-center rounded-xl bg-secondary text-foreground"
                  aria-label="Copiar mensagem"
                >
                  <Copy className="size-4" />
                </button>
              </div>
              {!hasPhone && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Cliente sem telefone cadastrado — você poderá escolher o contato no WhatsApp.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </MobileShell>
  );
}