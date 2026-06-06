import { createFileRoute } from "@tanstack/react-router";
import { Search, Plus, Star, Phone } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { brl, clients } from "@/lib/mock-data";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — CleanOps" },
      { name: "description", content: "CRM completo de clientes residenciais e comerciais." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const total = clients.length;
  const residenciais = clients.filter((c) => c.type === "Residencial").length;

  return (
    <MobileShell>
      <PageHeader
        eyebrow="CRM"
        title="Clientes"
        subtitle={`${total} cadastros · ${residenciais} residenciais`}
        right={
          <button className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow">
            <Plus className="size-5" />
          </button>
        }
      />

      <section className="px-5">
        <label className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            placeholder="Buscar por nome, telefone ou endereço"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {["Todos", "Residencial", "Comercial", "Recorrentes", "Inativos"].map((tag, i) => (
            <button
              key={tag}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                i === 0
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground ring-1 ring-border"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pt-5">
        <ul className="space-y-3">
          {clients.map((c) => (
            <li key={c.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-base font-bold text-accent-foreground">
                  {c.name.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-base font-semibold text-foreground">{c.name}</h3>
                    <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-foreground">
                      <Star className="size-3.5 fill-[color:var(--warning)] text-[color:var(--warning)]" />
                      {c.rating}.0
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.type} · Último serviço {c.lastService.toLowerCase()}
                  </p>
                  <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" /> {c.phone}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Serviços</p>
                  <p className="text-sm font-bold text-foreground">{c.servicesCount}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total gasto</p>
                  <p className="text-sm font-bold text-foreground">{brl(c.totalSpent)}</p>
                </div>
                <button className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                  Agendar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </MobileShell>
  );
}