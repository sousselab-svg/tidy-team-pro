import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Repeat, Plus, Play, Trash2 } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import {
  listRecurring,
  createRecurring,
  deleteRecurring,
  updateRecurring,
  runRecurringNow,
  type Frequency,
} from "@/lib/recurring.functions";
import { listClients } from "@/lib/clients.functions";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/recorrencia")({
  head: () => ({ meta: [{ title: "Recurring services — CleanOps" }] }),
  component: Page,
});

const listQ = queryOptions({ queryKey: ["recurring"], queryFn: () => listRecurring() });
const clientsQ = queryOptions({ queryKey: ["clients"], queryFn: () => listClients() });

function Page() {
  const qc = useQueryClient();
  const list = useServerFn(listRecurring);
  const cls = useServerFn(listClients);
  const create = useServerFn(createRecurring);
  const del = useServerFn(deleteRecurring);
  const upd = useServerFn(updateRecurring);
  const run = useServerFn(runRecurringNow);
  const { data: rows = [] } = useQuery({ ...listQ, queryFn: () => list() });
  const { data: clients = [] } = useQuery({ ...clientsQ, queryFn: () => cls() });
  const [open, setOpen] = useState(false);

  const mCreate = useMutation({
    mutationFn: (v: Parameters<typeof create>[0]) => create(v),
    onSuccess: () => {
      toast.success("Recurring schedule created");
      qc.invalidateQueries({ queryKey: ["recurring"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const mRun = useMutation({
    mutationFn: (id: string) => run({ data: { id } }),
    onSuccess: () => {
      toast.success("Job generated");
      qc.invalidateQueries({ queryKey: ["recurring"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
  const mToggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => upd({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Growth"
        title="Recurring services"
        subtitle="Auto-generate jobs on a schedule"
        right={
          <button
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"
            aria-label="New schedule"
          >
            <Plus className="size-4" />
          </button>
        }
      />
      <div className="px-5 pb-6 space-y-3">
        {rows.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Repeat className="mx-auto mb-2 size-6" />
            No recurring schedules yet.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-primary font-bold">
                  {r.frequency}
                </p>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.client?.name}</p>
              </div>
              <span className="text-xs font-semibold">{formatCurrency(r.price_cents)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Next: {r.next_run_on} at {r.time_of_day}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => mRun.mutate(r.id)}
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Play className="size-3" /> Run now
              </button>
              <button
                onClick={() => mToggle.mutate({ id: r.id, active: !r.active })}
                className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"
              >
                {r.active ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => mDel.mutate(r.id)}
                className="ml-auto grid size-8 place-items-center rounded-full bg-destructive/15 text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <CreateModal
          clients={clients}
          onClose={() => setOpen(false)}
          onSubmit={(v) => mCreate.mutate(v)}
          pending={mCreate.isPending}
        />
      )}
    </MobileShell>
  );
}

function CreateModal({
  clients,
  onClose,
  onSubmit,
  pending,
}: {
  clients: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (v: {
    client_id: string;
    title: string;
    price_cents: number;
    duration_minutes: number;
    frequency: Frequency;
    time_of_day: string;
    next_run_on: string;
    active: boolean;
  }) => void;
  pending: boolean;
}) {
  const [client_id, setClient] = useState(clients[0]?.id ?? "");
  const [title, setTitle] = useState("Standard cleaning");
  const [price, setPrice] = useState("120");
  const [duration, setDuration] = useState("90");
  const [frequency, setFreq] = useState<Frequency>("weekly");
  const [time, setTime] = useState("09:00");
  const today = new Date().toISOString().slice(0, 10);
  const [next, setNext] = useState(today);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-[480px] mx-auto rounded-t-3xl bg-card p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">New recurring schedule</h2>
        <Field label="Client">
          <select
            value={client_id}
            onChange={(e) => setClient(e.target.value)}
            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Price (USD)">
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" />
          </Field>
          <Field label="Duration (min)">
            <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" />
          </Field>
        </div>
        <Field label="Frequency">
          <select
            value={frequency}
            onChange={(e) => setFreq(e.target.value as Frequency)}
            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Next date">
            <input type="date" value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" />
          </Field>
          <Field label="Time">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" />
          </Field>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 rounded-full bg-secondary py-2.5 text-sm font-semibold">
            Cancel
          </button>
          <button
            disabled={pending || !client_id}
            onClick={() =>
              onSubmit({
                client_id,
                title,
                price_cents: Math.round(Number(price) * 100),
                duration_minutes: Number(duration),
                frequency,
                time_of_day: time,
                next_run_on: next,
                active: true,
              })
            }
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}