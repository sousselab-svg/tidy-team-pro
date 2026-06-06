import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { listClients } from "@/lib/clients.functions";
import {
  deleteJob as deleteJobFn,
  getJob,
  updateJob as updateJobFn,
  updateJobChecklist,
  type ChecklistItem,
  type JobRow,
  type JobStatus,
} from "@/lib/jobs.functions";
import { listTeams } from "@/lib/teams.functions";

export const Route = createFileRoute("/_authenticated/agenda/$jobId")({
  head: () => ({ meta: [{ title: "Serviço — CleanOps" }] }),
  component: JobDetailPage,
});

const STATUS_META: Record<JobStatus, { label: string; color: string; next?: JobStatus }> = {
  scheduled: { label: "Agendado", color: "var(--muted-foreground)", next: "on_way" },
  on_way: { label: "A caminho", color: "var(--warning)", next: "in_progress" },
  in_progress: { label: "Em andamento", color: "var(--info)", next: "completed" },
  completed: { label: "Concluído", color: "var(--success)" },
  cancelled: { label: "Cancelado", color: "var(--destructive)" },
};

const FLOW: JobStatus[] = ["scheduled", "on_way", "in_progress", "completed"];

type JobPatch = {
  client_id?: string | null;
  title?: string;
  address?: string | null;
  scheduled_at?: string;
  duration_minutes?: number;
  price_cents?: number;
  team_name?: string | null;
  team_id?: string | null;
  notes?: string | null;
  status?: JobStatus;
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();

  const get = useServerFn(getJob);
  const update = useServerFn(updateJobFn);
  const del = useServerFn(deleteJobFn);
  const listC = useServerFn(listClients);
  const listT = useServerFn(listTeams);

  const [editing, setEditing] = useState(false);

  const jobQ = useQuery({ queryKey: ["job", jobId], queryFn: () => get({ data: { id: jobId } }) });
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: () => listC(), enabled: editing });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: () => listT() });

  const updateMut = useMutation({
    mutationFn: (patch: JobPatch) => update({ data: { id: jobId, patch } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      router.invalidate();
      toast.success("Serviço atualizado");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: () => del({ data: { id: jobId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Serviço excluído");
      navigate({ to: "/agenda" });
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  if (jobQ.isLoading)
    return (
      <MobileShell>
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
      </MobileShell>
    );

  const job = jobQ.data;
  if (!job)
    return (
      <MobileShell>
        <div className="p-8 text-center text-sm text-muted-foreground">
          Serviço não encontrado.
          <button
            onClick={() => navigate({ to: "/agenda" })}
            className="mt-4 block w-full rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground"
          >
            Voltar à agenda
          </button>
        </div>
      </MobileShell>
    );

  const meta = STATUS_META[job.status];
  const dt = new Date(job.scheduled_at);

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-5 py-4 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/agenda" })}
          className="grid size-10 place-items-center rounded-full bg-secondary"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </button>
        <button
          onClick={() => setEditing((v) => !v)}
          className="grid size-10 place-items-center rounded-full bg-secondary"
          aria-label={editing ? "Cancelar" : "Editar"}
        >
          {editing ? <X className="size-5" /> : <Pencil className="size-5" />}
        </button>
      </header>

      {editing ? (
        <EditForm
          job={job}
          clients={clientsQ.data ?? []}
          busy={updateMut.isPending}
          onSave={(patch) => updateMut.mutate(patch, { onSuccess: () => setEditing(false) })}
        />
      ) : (
        <article className="px-5 pb-10">
          <span
            className="inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `color-mix(in oklab, ${meta.color} 15%, transparent)`,
              color: meta.color,
            }}
          >
            {meta.label}
          </span>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{job.title}</h1>
          {job.client?.name && (
            <p className="text-sm text-muted-foreground">{job.client.name}</p>
          )}

          <StatusFlow status={job.status} />

          <dl className="mt-6 space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border">
            <Row
              icon={<Calendar className="size-4" />}
              label="Quando"
              value={`${dt.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })} · ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
            />
            <Row
              icon={<MapPin className="size-4" />}
              label="Endereço"
              value={job.address || "—"}
            />
            <Row
              icon={<Users className="size-4" />}
              label="Equipe"
              value={job.team?.name || job.team_name || "Não atribuída"}
            />
            <Row
              icon={<span className="font-bold">$</span>}
              label="Valor"
              value={brl(job.price_cents)}
            />
            <Row
              icon={<span className="font-bold">⏱</span>}
              label="Duração"
              value={`${job.duration_minutes} min`}
            />
            {job.notes && (
              <Row icon={<Phone className="size-4" />} label="Notas" value={job.notes} />
            )}
          </dl>

          <ChecklistSection jobId={job.id} initial={job.checklist ?? []} />

          <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Equipe responsável</p>
            <select
              value={job.team_id ?? ""}
              onChange={(e) => updateMut.mutate({ team_id: e.target.value || null })}
              className="mt-2 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— sem equipe —</option>
              {(teamsQ.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </section>

          <div className="mt-5 space-y-2">
            {meta.next && (
              <button
                onClick={() => updateMut.mutate({ status: meta.next })}
                disabled={updateMut.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                <Check className="size-4" />
                Avançar para "{STATUS_META[meta.next!].label}"
              </button>
            )}
            {job.address && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-bold text-foreground"
              >
                <Navigation className="size-4" />
                Abrir rota
              </a>
            )}
            {job.status !== "cancelled" && job.status !== "completed" && (
              <button
                onClick={() => {
                  if (confirm("Cancelar este serviço?")) updateMut.mutate({ status: "cancelled" });
                }}
                className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground"
              >
                Cancelar serviço
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Excluir definitivamente? Esta ação não pode ser desfeita."))
                  deleteMut.mutate();
              }}
              disabled={deleteMut.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              Excluir
            </button>
          </div>
        </article>
      )}
    </MobileShell>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-7 place-items-center rounded-full bg-secondary text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function StatusFlow({ status }: { status: JobStatus }) {
  if (status === "cancelled") return null;
  const currentIdx = FLOW.indexOf(status);
  return (
    <ol className="mt-5 flex items-center justify-between gap-1">
      {FLOW.map((s, i) => {
        const done = i <= currentIdx;
        return (
          <li key={s} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={`grid size-7 place-items-center rounded-full text-[10px] font-bold ${
                done
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground ring-1 ring-border"
              }`}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className="text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {STATUS_META[s].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toLocalInputs(iso: string) {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function EditForm({
  job,
  clients,
  busy,
  onSave,
}: {
  job: JobRow;
  clients: { id: string; name: string; address: string | null }[];
  busy: boolean;
  onSave: (patch: {
    client_id?: string | null;
    title?: string;
    address?: string | null;
    scheduled_at?: string;
    duration_minutes?: number;
    price_cents?: number;
    team_name?: string | null;
    notes?: string | null;
  }) => void;
}) {
  const init = toLocalInputs(job.scheduled_at);
  const [form, setForm] = useState({
    client_id: job.client_id ?? "",
    title: job.title,
    address: job.address ?? "",
    date: init.date,
    time: init.time,
    duration_minutes: job.duration_minutes,
    price: (job.price_cents / 100).toString().replace(".", ","),
    team_name: job.team_name ?? "",
    notes: job.notes ?? "",
  });

  useEffect(() => {
    const reset = toLocalInputs(job.scheduled_at);
    setForm({
      client_id: job.client_id ?? "",
      title: job.title,
      address: job.address ?? "",
      date: reset.date,
      time: reset.time,
      duration_minutes: job.duration_minutes,
      price: (job.price_cents / 100).toString().replace(".", ","),
      team_name: job.team_name ?? "",
      notes: job.notes ?? "",
    });
  }, [job]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dt = new Date(`${form.date}T${form.time}:00`);
        onSave({
          client_id: form.client_id || null,
          title: form.title.trim(),
          address: form.address.trim() || null,
          scheduled_at: dt.toISOString(),
          duration_minutes: form.duration_minutes,
          price_cents: Math.round(parseFloat(form.price.replace(",", ".") || "0") * 100),
          team_name: form.team_name.trim() || null,
          notes: form.notes.trim() || null,
        });
      }}
      className="space-y-3 px-5 pb-10"
    >
      <Field label="Cliente">
        <select
          value={form.client_id}
          onChange={(e) => {
            const c = clients.find((x) => x.id === e.target.value);
            setForm({ ...form, client_id: e.target.value, address: c?.address ?? form.address });
          }}
          className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">— sem cliente —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Serviço">
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Data">
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Hora">
          <input
            required
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Duração (min)">
          <input
            type="number"
            min={15}
            step={15}
            value={form.duration_minutes}
            onChange={(e) =>
              setForm({ ...form, duration_minutes: Number(e.target.value) || 90 })
            }
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Valor (R$)">
          <input
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            inputMode="decimal"
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </div>
      <Field label="Endereço">
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>
      <Field label="Equipe">
        <input
          value={form.team_name}
          onChange={(e) => setForm({ ...form, team_name: e.target.value })}
          placeholder="ex.: Alpha"
          className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>
      <Field label="Notas">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>
      <button
        type="submit"
        disabled={busy || !form.title.trim()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        <Save className="size-4" />
        {busy ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ChecklistSection({ jobId, initial }: { jobId: string; initial: ChecklistItem[] }) {
  const qc = useQueryClient();
  const save = useServerFn(updateJobChecklist);
  const [items, setItems] = useState<ChecklistItem[]>(initial);
  const [draft, setDraft] = useState("");

  useEffect(() => setItems(initial), [jobId]);

  const mut = useMutation({
    mutationFn: (next: ChecklistItem[]) => save({ data: { id: jobId, checklist: next } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  function commit(next: ChecklistItem[]) {
    setItems(next);
    mut.mutate(next);
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label) return;
    commit([...items, { id: crypto.randomUUID().slice(0, 8), label, done: false }]);
    setDraft("");
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Checklist</p>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {doneCount}/{items.length}
        </span>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((it, idx) => (
            <li key={it.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = [...items];
                  next[idx] = { ...it, done: !it.done };
                  commit(next);
                }}
                className={`grid size-6 shrink-0 place-items-center rounded-md ring-1 ${
                  it.done
                    ? "bg-[color:var(--success)] text-white ring-[color:var(--success)]"
                    : "bg-secondary text-muted-foreground ring-border"
                }`}
                aria-label={it.done ? "Desmarcar" : "Marcar"}
              >
                {it.done && <Check className="size-3.5" />}
              </button>
              <span
                className={`flex-1 text-sm ${it.done ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {it.label}
              </span>
              <button
                type="button"
                onClick={() => commit(items.filter((_, i) => i !== idx))}
                className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remover"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addItem} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Adicionar etapa…"
          className="flex-1 rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Adicionar"
        >
          <CheckSquare className="size-4" />
        </button>
      </form>
    </section>
  );
}