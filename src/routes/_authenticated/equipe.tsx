import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, Link2, Link2Off, MapPin, Plus, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  listTeams,
  moveTeamMember,
  removeTeamMember,
  type TeamRow,
} from "@/lib/teams.functions";
import {
  getMyContext,
  inviteOperator,
  listOrgMembers,
  unlinkOperator,
} from "@/lib/team-users.functions";
import {
  getPermissionsMatrix,
  setPermission,
  PERMISSION_KEYS,
  PERMISSION_META,
  type PermissionKey,
} from "@/lib/permissions.functions";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Equipe — CleanOps" }] }),
  component: TeamsPage,
});

const teamsQuery = queryOptions({ queryKey: ["teams"], queryFn: () => listTeams() });

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"];

type TabId = "staff" | "teams" | "roles";

function TeamsPage() {
  const [tab, setTab] = useState<TabId>("staff");
  const meFn = useServerFn(getMyContext);
  const { data: me } = useQuery({ queryKey: ["my-context"], queryFn: () => meFn(), staleTime: 60_000 });
  const isAdmin = me?.isAdmin ?? true;

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Operação"
        title="Equipe"
        subtitle="Funcionários, equipes e permissões"
      />

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

      <div className="sticky top-0 z-10 mt-3 bg-background/95 px-5 pb-3 pt-2 backdrop-blur">
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
          {(
            [
              { id: "staff" as const, label: "Funcionários" },
              { id: "teams" as const, label: "Equipes" },
              { id: "roles" as const, label: "Perfis" },
            ]
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`rounded-lg py-2 text-xs font-bold transition ${active ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "staff" && <StaffTab isAdmin={isAdmin} />}
      {tab === "teams" && <TeamsTab isAdmin={isAdmin} />}
      {tab === "roles" && <RolesTab isAdmin={isAdmin} />}
    </MobileShell>
  );
}

function StaffTab({ isAdmin }: { isAdmin: boolean }) {
  const listOrg = useServerFn(listOrgMembers);
  const unlinkFn = useServerFn(unlinkOperator);
  const inviteFn = useServerFn(inviteOperator);
  const list = useServerFn(listTeams);
  const qc = useQueryClient();
  const [linkFor, setLinkFor] = useState<{ id: string; name: string } | null>(null);

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members"],
    queryFn: () => listOrg(),
    enabled: isAdmin,
  });
  const { data: teams = [] } = useQuery({ ...teamsQuery, queryFn: () => list() });

  const unlinkedMembers = teams.flatMap((t) =>
    t.members.filter((m) => !m.user_id).map((m) => ({ ...m, team_name: t.name })),
  );

  const unlinkMut = useMutation({
    mutationFn: (user_id: string) => unlinkFn({ data: { user_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-members"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Acesso removido");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const linkMut = useMutation({
    mutationFn: (input: { email: string; team_member_id: string }) => inviteFn({ data: input }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["org-members"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      setLinkFor(null);
      toast.success(res?.invited ? "Convite enviado por email" : "Operador vinculado");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <section className="px-5 pt-2">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Com acesso ({orgMembers.length})
        </h2>
        {orgMembers.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
            <p className="text-sm font-semibold">Nenhum operador vinculado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vincule um membro de equipe a uma conta abaixo.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {orgMembers.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-2 rounded-2xl bg-card p-3 ring-1 ring-border"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.team_member_name ?? "—"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.email ?? m.user_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[color:var(--success)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--success)]">
                    {m.role}
                  </span>
                  {isAdmin && m.role !== "admin" && (
                    <button
                      onClick={() => {
                        if (confirm("Remover acesso deste operador?")) unlinkMut.mutate(m.user_id);
                      }}
                      className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Desvincular"
                    >
                      <Link2Off className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
        <section className="px-5 pt-6 pb-10">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Sem acesso ({unlinkedMembers.length})
          </h2>
          {unlinkedMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Todos os membros já estão vinculados — adicione novos na aba Equipes.
            </p>
          ) : (
            <ul className="space-y-2">
              {unlinkedMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-card p-3 ring-1 ring-border"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {m.team_name} · {[m.role, m.phone].filter(Boolean).join(" · ") || "sem contato"}
                    </p>
                  </div>
                  <button
                    onClick={() => setLinkFor({ id: m.id, name: m.name })}
                    className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    <Link2 className="size-3" /> Vincular
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {linkFor && (
        <LinkOperatorSheet
          memberName={linkFor.name}
          busy={linkMut.isPending}
          onClose={() => setLinkFor(null)}
          onSubmit={(email) => linkMut.mutate({ email, team_member_id: linkFor.id })}
        />
      )}
    </>
  );
}

function TeamsTab({ isAdmin }: { isAdmin: boolean }) {
  const list = useServerFn(listTeams);
  const create = useServerFn(createTeam);
  const del = useServerFn(deleteTeam);
  const addMem = useServerFn(addTeamMember);
  const rmMem = useServerFn(removeTeamMember);
  const moveMem = useServerFn(moveTeamMember);
  const qc = useQueryClient();
  const [newTeam, setNewTeam] = useState("");
  const [openMemberFor, setOpenMemberFor] = useState<TeamRow | null>(null);
  const [moveFor, setMoveFor] = useState<{ id: string; name: string; team_id: string } | null>(null);

  const { data: teams = [] } = useQuery({ ...teamsQuery, queryFn: () => list() });

  const createMut = useMutation({
    mutationFn: (name: string) =>
      create({ data: { name, color: COLORS[teams.length % COLORS.length] } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      setNewTeam("");
      toast.success("Equipe criada");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
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
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const rmMut = useMutation({
    mutationFn: (id: string) => rmMem({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });

  const moveMut = useMutation({
    mutationFn: (input: { id: string; team_id: string }) => moveMem({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      setMoveFor(null);
      toast.success("Membro movido");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <section className="px-5 pt-2">
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

      <section className="px-5 pt-5 pb-10">
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
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{m.name}</p>
                            <StatusBadge active={!!m.user_id} />
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {[m.role, m.phone].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {isAdmin && teams.length > 1 && (
                            <button
                              onClick={() =>
                                setMoveFor({ id: m.id, name: m.name, team_id: t.id })
                              }
                              className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              aria-label="Mover de equipe"
                              title="Mover para outra equipe"
                            >
                              <Link2 className="size-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Remover ${m.name} da equipe?`)) rmMut.mutate(m.id);
                            }}
                            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remover membro"
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

      {moveFor && (
        <MoveMemberSheet
          memberName={moveFor.name}
          currentTeamId={moveFor.team_id}
          teams={teams}
          busy={moveMut.isPending}
          onClose={() => setMoveFor(null)}
          onSubmit={(team_id) => moveMut.mutate({ id: moveFor.id, team_id })}
        />
      )}
    </>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--success)]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--success)]">
        <KeyRound className="size-2.5" /> Ativo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
      Pendente
    </span>
  );
}

function MoveMemberSheet({
  memberName,
  currentTeamId,
  teams,
  busy,
  onClose,
  onSubmit,
}: {
  memberName: string;
  currentTeamId: string;
  teams: TeamRow[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (team_id: string) => void;
}) {
  const others = teams.filter((t) => t.id !== currentTeamId);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-10 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Mover · {memberName}</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Escolha a nova equipe:</p>
        <ul className="mt-3 space-y-2">
          {others.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSubmit(t.id)}
                className="flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-3 text-left text-sm font-semibold hover:bg-secondary/80 disabled:opacity-50"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color ?? "var(--muted-foreground)" }}
                />
                {t.name}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {t.members.length} membros
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RolesTab({ isAdmin }: { isAdmin: boolean }) {
  const listFn = useServerFn(getPermissionsMatrix);
  const setFn = useServerFn(setPermission);
  const qc = useQueryClient();

  const { data: matrix, isLoading } = useQuery({
    queryKey: ["permissions-matrix"],
    queryFn: () => listFn(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: (vars: { permission: PermissionKey; allowed: boolean }) =>
      setFn({ data: { role: "operator", permission: vars.permission, allowed: vars.allowed } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissions-matrix"] });
      toast.success("Permissões atualizadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <section className="px-5 pt-4 pb-10">
        <p className="text-sm text-muted-foreground">Apenas admin pode editar permissões.</p>
      </section>
    );
  }

  return (
    <section className="px-5 pt-2 pb-10">
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/20">
        <ShieldCheck className="size-5 text-primary" />
        <p className="text-xs text-muted-foreground">
          Admins têm acesso total. Marque as ações permitidas aos operadores.
        </p>
      </div>
      {isLoading || !matrix ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="space-y-3">
          {PERMISSION_KEYS.map((key) => {
            const meta = PERMISSION_META[key];
            const allowed = matrix.operator[key];
            return (
              <li key={key} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{meta.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowed}
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ permission: key, allowed: !allowed })}
                    className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                    style={{ backgroundColor: allowed ? "var(--primary)" : "var(--muted)" }}
                  >
                    <span
                      className="absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform"
                      style={{ transform: allowed ? "translateX(22px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
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
          Enviamos um convite por email com um link para o operador definir a senha e entrar. Se a conta já existir, vinculamos direto.
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Email da conta do operador" value={email} onChange={setEmail} placeholder="operador@exemplo.com" />
          <button
            type="button"
            disabled={!email.trim() || busy}
            onClick={() => onSubmit(email.trim())}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Enviar convite"}
          </button>
        </div>
      </div>
    </div>
  );
}