import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import {
  createClient as createClientFn,
  deleteClient as deleteClientFn,
  listClients,
  type ClientCategory,
  type ClientRow,
} from "@/lib/clients.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — CleanOps" },
      { name: "description", content: "CRM completo de clientes residenciais e comerciais." },
    ],
  }),
  component: ClientsPage,
});

const clientsQuery = queryOptions({
  queryKey: ["clients"],
  queryFn: () => listClients(),
});

type NewClientPayload = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: ClientCategory;
  notes: string | null;
};

function ClientsPage() {
  const list = useServerFn(listClients);
  const create = useServerFn(createClientFn);
  const del = useServerFn(deleteClientFn);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ClientCategory>("all");

  const { data: clients = [], isLoading } = useQuery({
    ...clientsQuery,
    queryFn: () => list(),
  });

  const createMut = useMutation({
    mutationFn: (input: NewClientPayload) => create({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      toast.success("Cliente cadastrado");
    },
    onError: (e) => toast.error("Erro ao cadastrar", { description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  const filtered = clients.filter((c) => {
    if (filter !== "all" && c.category !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone?.toLowerCase().includes(q) ?? false) ||
      (c.address?.toLowerCase().includes(q) ?? false)
    );
  });

  const total = clients.length;
  const residenciais = clients.filter((c) => c.category === "residential").length;

  return (
    <MobileShell>
      <PageHeader
        eyebrow="CRM"
        title="Clientes"
        subtitle={`${total} cadastros · ${residenciais} residenciais`}
        right={
          <button
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow"
            aria-label="Novo cliente"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      <section className="px-5">
        <label className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou endereço"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: "all", label: "Todos" },
              { id: "residential", label: "Residencial" },
              { id: "commercial", label: "Comercial" },
            ] as const
          ).map((tag) => (
            <button
              key={tag.id}
              onClick={() => setFilter(tag.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === tag.id
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground ring-1 ring-border"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pt-5">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold text-foreground">Nenhum cliente ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Toque em <b>+</b> para cadastrar o primeiro.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((c) => (
              <ClientCard key={c.id} client={c} onDelete={() => deleteMut.mutate(c.id)} />
            ))}
          </ul>
        )}
      </section>

      {open && (
        <NewClientSheet
          onClose={() => setOpen(false)}
          onSubmit={(payload) => createMut.mutate(payload)}
          busy={createMut.isPending}
        />
      )}
    </MobileShell>
  );
}

function ClientCard({ client, onDelete }: { client: ClientRow; onDelete: () => void }) {
  function copyPortal() {
    const url = `${window.location.origin}/portal/${client.portal_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do portal copiado");
  }
  return (
    <li className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-base font-bold text-accent-foreground">
          {client.name
            .split(" ")
            .slice(0, 2)
            .map((s) => s[0])
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">{client.name}</h3>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
              {client.category === "residential" ? "Resid." : "Comerc."}
            </span>
          </div>
          {client.address && (
            <p className="text-xs text-muted-foreground">{client.address}</p>
          )}
          {client.phone && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="size-3" /> {client.phone}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={copyPortal}
            className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground"
            aria-label="Copiar link do portal"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Excluir"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

function NewClientSheet({
  onClose,
  onSubmit,
  busy,
}: {
  onClose: () => void;
  onSubmit: (data: NewClientPayload) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    category: "residential" as ClientCategory,
    notes: "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-10 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Novo cliente</h2>
          <button onClick={onClose} aria-label="Fechar" className="grid size-8 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: form.name.trim(),
              email: form.email.trim() || null,
              phone: form.phone.trim() || null,
              address: form.address.trim() || null,
              category: form.category,
              notes: form.notes.trim() || null,
            });
          }}
          className="mt-4 space-y-3"
        >
          <Field label="Nome" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          </div>
          <Field label="Endereço" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["residential", "commercial"] as const).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`rounded-xl py-2 text-sm font-bold ${
                    form.category === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {cat === "residential" ? "Residencial" : "Comercial"}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={busy || !form.name.trim()}
            className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Salvando…" : "Salvar cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}