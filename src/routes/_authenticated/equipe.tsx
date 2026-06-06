import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, Link2, Link2Off, MapPin, Plus, Trash2, UserPlus, X } from "lucide-react";
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
import {
  getMyContext,
  linkOperator,
  listOrgMembers,
  unlinkOperator,
} from "@/lib/team-users.functions";

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
  const meFn = useServerFn(getMyContext);
  const linkFn = useServerFn(linkOperator);
  const unlinkFn = useServerFn(unlinkOperator);
  const listOrg = useServerFn(listOrgMembers);
  const qc = useQueryClient();
  const [newTeam, setNewTeam] = useState("");
  const [openMemberFor, setOpenMemberFor] = useState<TeamRow | null>(null);
  const [linkFor, setLinkFor] = useState<{ id: string; name: string } | null>(null);

  const { data: teams = [] } = useQuery({ ...teamsQuery, queryFn: () => list() });
  const { data: me } = useQuery({ queryKey: ["my-context"], queryFn: () => meFn(), staleTime: 60_000 });
  const isAdmin = me?.isAdmin ?? true;
  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members"],
    queryFn: () => listOrg(),
    enabled: isAdmin,
  });

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

  const linkMut = useMutation({
    mutationFn: (input: { email: string; team_member_id: string }) => linkFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["org-members"] });
      setLinkFor(null);
      toast.success("Operador vinculado");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const unlinkMut = useMutation({
    mutationFn: (user_id: string) => unlinkFn({ data: { user_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["org-members"] });
      toast.success("Acesso removido");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
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
                          {m.user_id && (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--success)]">
                              <KeyRound className="size-3" /> Operador vinculado
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            m.user_id ? (
                              <button
                                onClick={() => {
                                  if (confirm("Remover acesso de operador deste membro?"))
                                    unlinkMut.mutate(m.user_id!);
                                }}
                                className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Desvincular"
                              >
                                <Link2Off className="size-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setLinkFor({ id: m.id, name: m.name })}
                                className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                aria-label="Vincular operador"
                              >
                                <Link2 className="size-3.5" />
                              </button>
                            )
                          )}
                          <button
                            onClick={() => rmMut.mutate(m.id)}
                            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
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

      {linkFor && (
        <LinkOperatorSheet
          memberName={linkFor.name}
          busy={linkMut.isPending}
          onClose={() => setLinkFor(null)}
          onSubmit={(email) => linkMut.mutate({ email, team_member_id: linkFor.id })}
        />
      )}

      {isAdmin && orgMembers.length > 0 && (
        <section className="px-5 pt-7">
          <h2 className="mb-3 text-sm font-bold">Operadores com acesso</h2>
          <ul className="space-y-2">
            {orgMembers.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.team_member_name ?? "—"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.email ?? m.user_id}</p>
                </div>
                <span className="rounded-full bg-[color:var(--success)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--success)]">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </section>
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

function LinkOperatorSheet({
  memberName,
  busy,
  onClose,
  onSubmit,
}: {
  memberName: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-10 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Vincular operador · {memberName}</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Peça para o operador criar uma conta em <strong>/auth</strong> com o email abaixo, depois confirme aqui.
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Email da conta do operador" value={email} onChange={setEmail} placeholder="operador@exemplo.com" />
          <button
            type="button"
            disabled={!email.trim() || busy}
            onClick={() => onSubmit(email.trim())}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Vinculando…" : "Vincular"}
          </button>
        </div>
      </div>
    </div>
  );
}