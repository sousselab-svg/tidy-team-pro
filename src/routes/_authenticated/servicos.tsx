import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Tag, Clock, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { listServices, upsertService, deleteService, type ServiceItem } from "@/lib/services.functions";

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => ({ meta: [{ title: "Catálogo de Serviços — CleanOps" }] }),
  component: ServicesPage,
});

const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const servicesQuery = queryOptions({ queryKey: ["services"], queryFn: () => listServices() });

function ServicesPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listServices);
  const fnUpsert = useServerFn(upsertService);
  const fnDel = useServerFn(deleteService);
  const { data, isLoading } = useQuery({ ...servicesQuery, queryFn: () => fnList() });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<ServiceItem> | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return data ?? [];
    return (data ?? []).filter(
      (x) =>
        x.name.toLowerCase().includes(s) ||
        x.category?.toLowerCase().includes(s) ||
        x.description?.toLowerCase().includes(s),
    );
  }, [data, search]);

  const upsertMut = useMutation({
    mutationFn: (input: Parameters<typeof upsertService>[0]["data"]) => fnUpsert({ data: input }),
    onSuccess: () => {
      toast.success("Serviço salvo");
      qc.invalidateQueries({ queryKey: ["services"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => fnDel({ data: { id } }),
    onSuccess: () => {
      toast.success("Serviço excluído");
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Cadastros"
        title="Catálogo de serviços"
        subtitle="Modelos com preço e duração padrão"
        right={
          <button
            onClick={() =>
              setEditing({ name: "", default_price_cents: 0, default_duration_minutes: 60, active: true })
            }
            aria-label="Novo serviço"
            className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus className="size-4" />
          </button>
        }
      />

      <div className="px-5 space-y-4">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, categoria…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
            <p className="text-sm font-semibold">Nenhum serviço cadastrado</p>
            <p className="mt-1 text-xs text-muted-foreground">Crie modelos reutilizáveis para acelerar orçamentos.</p>
          </div>
        )}

        <ul className="space-y-2">
          {filtered.map((s) => (
            <li
              key={s.id}
              className={`rounded-xl border border-border bg-card p-3 ${!s.active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {s.category && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                        <Tag className="size-3" /> {s.category}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" /> {s.default_duration_minutes} min
                    </span>
                    <span className="font-bold text-foreground">{brl(s.default_price_cents)}</span>
                  </div>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() =>
                      upsertMut.mutate({
                        id: s.id,
                        name: s.name,
                        description: s.description,
                        default_price_cents: s.default_price_cents,
                        default_duration_minutes: s.default_duration_minutes,
                        category: s.category,
                        active: !s.active,
                      })
                    }
                    aria-label={s.active ? "Desativar" : "Ativar"}
                    className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground"
                  >
                    {s.active ? <Power className="size-4" /> : <PowerOff className="size-4" />}
                  </button>
                  <button
                    onClick={() => setEditing(s)}
                    aria-label="Editar"
                    className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir "${s.name}"?`)) delMut.mutate(s.id);
                    }}
                    aria-label="Excluir"
                    className="grid size-8 place-items-center rounded-full bg-destructive/15 text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editing && (
        <ServiceEditor
          initial={editing}
          saving={upsertMut.isPending}
          onClose={() => setEditing(null)}
          onSave={(payload) => upsertMut.mutate(payload)}
        />
      )}
    </MobileShell>
  );
}

function ServiceEditor({
  initial,
  saving,
  onClose,
  onSave,
}: {
  initial: Partial<ServiceItem>;
  saving: boolean;
  onClose: () => void;
  onSave: (p: {
    id?: string;
    name: string;
    description: string | null;
    default_price_cents: number;
    default_duration_minutes: number;
    category: string | null;
    active: boolean;
  }) => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [priceReal, setPriceReal] = useState(((initial.default_price_cents ?? 0) / 100).toFixed(2));
  const [duration, setDuration] = useState(String(initial.default_duration_minutes ?? 60));
  const [active, setActive] = useState(initial.active ?? true);

  function submit() {
    if (!name.trim()) {
      toast.error("Informe o nome");
      return;
    }
    onSave({
      id: initial.id,
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      default_price_cents: Math.round(Number(priceReal.replace(",", ".") || "0") * 100),
      default_duration_minutes: Math.max(1, Math.round(Number(duration) || 0)),
      active,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-card p-5 sm:rounded-3xl">
        <h2 className="text-base font-bold">{initial.id ? "Editar serviço" : "Novo serviço"}</h2>

        <div className="mt-4 space-y-3">
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ex.: Limpeza pós-obra"
            />
          </Field>
          <Field label="Categoria">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ex.: Residencial"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)">
              <input
                inputMode="decimal"
                value={priceReal}
                onChange={(e) => setPriceReal(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
              />
            </Field>
            <Field label="Duração (min)">
              <input
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
              />
            </Field>
          </div>
          <Field label="Descrição">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="O que está incluído neste serviço"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-secondary py-2.5 text-sm font-semibold text-muted-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}