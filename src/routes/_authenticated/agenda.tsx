import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { NotificationsBell } from "@/components/NotificationsBell";
import { listClients, type ClientRow } from "@/lib/clients.functions";
import {
  createJob as createJobFn,
  listJobs,
  type JobRow,
  type JobStatus,
} from "@/lib/jobs.functions";
import { listServices, type ServiceItem } from "@/lib/services.functions";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatLongDate, formatTime, formatWeekdayShort } from "@/lib/format";
import { readCache, writeCache, useOnlineStatus } from "@/lib/offline";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Schedule — CleanOps" },
      { name: "description", content: "Your team's daily schedule." },
    ],
  }),
  component: AgendaPage,
});

const STATUS_COLOR: Record<JobStatus, string> = {
  scheduled: "var(--muted-foreground)",
  on_way: "var(--warning)",
  in_progress: "var(--info)",
  completed: "var(--success)",
  cancelled: "var(--destructive)",
};

function AgendaPage() {
  const { t } = useTranslation();
  const list = useServerFn(listJobs);
  const create = useServerFn(createJobFn);
  const listC = useServerFn(listClients);
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const jobsQ = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const data = await list();
      writeCache("jobs", data);
      return data;
    },
    initialData: () => readCache<JobRow[]>("jobs"),
    // When offline, don't keep retrying in the background
    retry: online,
    networkMode: "always",
  });
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: () => listC() });
  const listS = useServerFn(listServices);
  const servicesQ = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => listS({ data: { onlyActive: true } }),
  });

  const dayJobs = useMemo(() => {
    const start = new Date(day);
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    return (jobsQ.data ?? []).filter((j) => {
      const d = new Date(j.scheduled_at);
      return d >= start && d < end;
    });
  }, [jobsQ.data, day]);

  const createMut = useMutation({
    mutationFn: (input: CreateJobPayload) => create({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setOpen(false);
      toast.success(t("agenda.bookedToast"));
    },
    onError: (e) => toast.error(t("common.error"), { description: e.message }),
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayLabel = formatLongDate(day);

  return (
    <MobileShell>
      <PageHeader
        eyebrow={t("agenda.eyebrow")}
        title={capitalize(dayLabel)}
        subtitle={t("agenda.jobsCount", { count: dayJobs.length })}
        right={
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <button
              onClick={() => setOpen(true)}
              className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow"
              aria-label={t("agenda.newJob")}
            >
              <Plus className="size-5" />
            </button>
          </div>
        }
      />

      <section className="px-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekDays.map((d) => {
            const active = d.getTime() === day.getTime();
            return (
              <button
                key={d.toISOString()}
                onClick={() => setDay(d)}
                className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 ${
                  active ? "bg-foreground text-background" : "bg-card text-muted-foreground ring-1 ring-border"
                }`}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {formatWeekdayShort(d).slice(0, 3)}
                </span>
                <span className="text-base font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-5 pt-6">
        {jobsQ.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : dayJobs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold text-foreground">{t("agenda.empty")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("agenda.emptyHint")}</p>
          </div>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-border pl-5">
            {dayJobs.map((job) => (
              <JobItem key={job.id} job={job} />
            ))}
          </ol>
        )}
      </section>

      {open && (
        <NewJobSheet
          clients={clientsQ.data ?? []}
          services={servicesQ.data ?? []}
          defaultDay={day}
          onClose={() => setOpen(false)}
          onSubmit={(payload) => createMut.mutate(payload)}
          busy={createMut.isPending}
        />
      )}
    </MobileShell>
  );
}

function JobItem({ job }: { job: JobRow }) {
  const { t } = useTranslation();
  const color = STATUS_COLOR[job.status];
  const label = t(`status.${job.status}` as const);
  const time = formatTime(job.scheduled_at);
  return (
    <li className="relative">
      <span
        className="absolute -left-[27px] top-3 grid size-4 place-items-center rounded-full ring-4 ring-background"
        style={{ backgroundColor: color }}
      />
      <Link
        to="/agenda/$jobId"
        params={{ jobId: job.id }}
        className="block rounded-2xl bg-card p-4 ring-1 ring-border transition active:scale-[.99]"
      >
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-sm font-bold text-foreground">{time}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`,
              color,
            }}
          >
            {label}
          </span>
        </div>
        <h3 className="mt-1 text-base font-semibold text-foreground">{job.title}</h3>
        {job.client?.name && (
          <p className="text-sm text-muted-foreground">{job.client.name}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {job.address && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" /> {job.address}
            </span>
          )}
          <span className="ml-auto font-semibold text-foreground">{formatCurrency(job.price_cents)}</span>
        </div>
      </Link>
    </li>
  );
}

type CreateJobPayload = {
  client_id: string | null;
  title: string;
  address: string | null;
  scheduled_at: string;
  duration_minutes: number;
  price_cents: number;
  team_name: string | null;
  notes: null;
};

function NewJobSheet({
  clients,
  services,
  defaultDay,
  onClose,
  onSubmit,
  busy,
}: {
  clients: ClientRow[];
  services: ServiceItem[];
  defaultDay: Date;
  onClose: () => void;
  onSubmit: (data: CreateJobPayload) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const defaultDate = `${defaultDay.getFullYear()}-${pad(defaultDay.getMonth() + 1)}-${pad(defaultDay.getDate())}`;
  const [form, setForm] = useState({
    client_id: clients[0]?.id ?? "",
    title: t("agenda.defaultTitle"),
    address: clients[0]?.address ?? "",
    date: defaultDate,
    time: "09:00",
    duration_minutes: 90,
    price: "0",
    team_name: "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-10 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("agenda.sheetTitle")}</h2>
          <button onClick={onClose} aria-label={t("common.close")} className="grid size-8 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const dt = new Date(`${form.date}T${form.time}:00`);
            const cents = Math.round(parseFloat(form.price.replace(",", ".") || "0") * 100);
            onSubmit({
              client_id: form.client_id || null,
              title: form.title.trim(),
              address: form.address.trim() || null,
              scheduled_at: dt.toISOString(),
              duration_minutes: form.duration_minutes,
              price_cents: cents,
              team_name: form.team_name.trim() || null,
              notes: null,
            });
          }}
          className="mt-4 space-y-3"
        >
          {clients.length === 0 ? (
            <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
              {t("agenda.addClientFirst")}
            </p>
          ) : (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("agenda.client")}
              </label>
              <select
                value={form.client_id}
                onChange={(e) => {
                  const c = clients.find((x) => x.id === e.target.value);
                  setForm({ ...form, client_id: e.target.value, address: c?.address ?? form.address });
                }}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t("agenda.noClient")}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {services.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("agenda.fromCatalog")}
              </label>
              <select
                value=""
                onChange={(e) => {
                  const s = services.find((x) => x.id === e.target.value);
                  if (!s) return;
                  setForm({
                    ...form,
                    title: s.name,
                    duration_minutes: s.default_duration_minutes,
                    price: (s.default_price_cents / 100).toFixed(2),
                  });
                }}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t("agenda.pickFromCatalog")}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {formatCurrency(s.default_price_cents)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("agenda.service")}</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("agenda.date")}</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("agenda.time")}</label>
              <input
                required
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("agenda.duration")}</label>
              <input
                type="number"
                min={15}
                step={15}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) || 90 })}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("agenda.price")} (USD)</label>
              <input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                inputMode="decimal"
                placeholder="0"
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("agenda.address")}</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("agenda.team")}</label>
            <input
              value={form.team_name}
              onChange={(e) => setForm({ ...form, team_name: e.target.value })}
              placeholder={t("agenda.teamPlaceholder")}
              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !form.title.trim()}
            className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("agenda.book")}
          </button>
        </form>
      </div>
    </div>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}