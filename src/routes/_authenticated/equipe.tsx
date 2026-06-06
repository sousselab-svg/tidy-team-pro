import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MapPin, Plus, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  listTeams,
  removeTeamMember,
  type TeamRow,
} from "@/lib/teams.functions";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Equipe — CleanOps" }] }),
  component: TeamsPage,
});

const teamsQuery = queryOptions({ queryKey: ["teams"], queryFn: () => listTeams() });

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"];

function TeamsPage() {
  const list = useServerFn(listTeams);
  const create = useServerFn(createTeam);
  const del = useServerFn(deleteTeam);
  const addMem = useServerFn(addTeamMember);
  const rmMem = useServerFn(removeTeamMember);
  const qc = useQueryClient();
  const [newTeam, setNewTeam] = useState("");
  const [openMemberFor, setOpenMemberFor] = useState<TeamRow | null>(null);

  const { data: teams = [] } = useQuery({ ...teamsQuery, queryFn: () => list() });

  const createMut = useMutation({
    mutationFn: (name: string) =>
      create({ data: { name, color: COLORS[teams.length % COLORS.length] } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      setNewTeam("");
      toast.success("Equipe criada");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });

  const addMut = useMutation({
    mutationFn: (input: { team_id: string; name: string; phone: string | null; role: string | null }) =>
      addMem({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      setOpenMemberFor(null);
      toast.success("Membro adicionado");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const rmMut = useMutation({
    mutationFn: (id: string) => rmMem({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });

  return (
    <MobileShell>
      <PageHeader eyebrow="Operação" title="Equipes" subtitle={`${teams.length} equipe(s)`} />

      <section className="px-5 pb-2">
        <Link
          to="/equipe/rastrear"
          className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3 ring-1 ring-primary/30"
        >
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">Compartilhar localização</p>
              <p className="text-[11px] text-muted-foreground">Abra no celular para enviar GPS</p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary">Abrir</span>
        </Link>
      </section>

      <section className="px-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTeam.trim()) createMut.mutate(newTeam.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            placeholder="Nome da equipe (ex: Alpha)"
            className="flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!newTeam.trim() || createMut.isPending}
            className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-5" />
          </button>
        </form>
      </section>

      <section className="px-5 pt-5">
        {teams.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold">Nenhuma equipe ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">Crie a primeira acima.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {teams.map((t) => (
              <li key={t.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: t.color ?? "var(--muted-foreground)" }}
                    />
                    <h3 className="truncate text-base font-semibold">{t.name}</h3>
                    <span className="text-xs text-muted-foreground">{t.members.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setOpenMemberFor(t)}
                      className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"
                    >
                      <UserPlus className="size-3" /> Membro
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir equipe "${t.name}"?`)) delMut.mutate(t.id);
                      }}
                      className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                {t.members.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                    {t.members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {[m.role, m.phone].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                        <button
                          onClick={() => rmMut.mutate(m.id)}
                          className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {openMemberFor && (
        <AddMemberSheet
          team={openMemberFor}
          busy={addMut.isPending}
          onClose={() => setOpenMemberFor(null)}
          onSubmit={(p) => addMut.mutate(p)}
        />
      )}
    </MobileShell>
  );
}

function AddMemberSheet({
  team,
  busy,
  onClose,
  onSubmit,
}: {
  team: TeamRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (p: { team_id: string; name: string; phone: string | null; role: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-10 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Novo membro · {team.name}</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Nome" value={name} onChange={setName} />
          <Field label="Telefone" value={phone} onChange={setPhone} placeholder="(11) 9..." />
          <Field label="Função" value={role} onChange={setRole} placeholder="Líder, Auxiliar..." />
          <button
            type="button"
            disabled={!name.trim() || busy}
            onClick={() =>
              onSubmit({
                team_id: team.id,
                name: name.trim(),
                phone: phone.trim() || null,
                role: role.trim() || null,
              })
            }
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Salvando…" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}