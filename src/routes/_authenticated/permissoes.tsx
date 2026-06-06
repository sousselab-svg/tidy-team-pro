import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { getMyContext } from "@/lib/team-users.functions";
import {
  getPermissionsMatrix,
  setPermission,
  PERMISSION_KEYS,
  PERMISSION_META,
  type PermissionKey,
} from "@/lib/permissions.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({
    meta: [
      { title: "Permissões — CleanOps" },
      { name: "description", content: "Defina o que cada papel pode fazer." },
    ],
  }),
  component: PermissoesPage,
});

function PermissoesPage() {
  const navigate = useNavigate();
  const meFn = useServerFn(getMyContext);
  const listFn = useServerFn(getPermissionsMatrix);
  const setFn = useServerFn(setPermission);
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["my-context"],
    queryFn: () => meFn(),
    staleTime: 60_000,
    retry: false,
  });
  const isOperator = me?.role === "operator";

  useEffect(() => {
    if (isOperator) navigate({ to: "/agenda", replace: true });
  }, [isOperator, navigate]);

  const { data: matrix, isLoading } = useQuery({
    queryKey: ["permissions-matrix"],
    queryFn: () => listFn(),
    enabled: !isOperator,
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

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Equipe"
        title="Permissões"
        subtitle="Defina o que cada papel pode executar"
      />

      <section className="px-5 pb-8">
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
                <li
                  key={key}
                  className="rounded-2xl border border-border bg-card p-4"
                >
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
                      onClick={() =>
                        mutation.mutate({ permission: key, allowed: !allowed })
                      }
                      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                      style={{
                        backgroundColor: allowed
                          ? "var(--primary)"
                          : "var(--muted)",
                      }}
                    >
                      <span
                        className="absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform"
                        style={{ transform: allowed ? "translateX(22px)" : "translateX(2px)" }}
                      />
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: "color-mix(in oklab, var(--success) 15%, transparent)",
                        color: "var(--success)",
                      }}
                    >
                      Admin: permitido
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: allowed
                          ? "color-mix(in oklab, var(--success) 15%, transparent)"
                          : "color-mix(in oklab, var(--muted-foreground) 15%, transparent)",
                        color: allowed ? "var(--success)" : "var(--muted-foreground)",
                      }}
                    >
                      Operador: {allowed ? "permitido" : "bloqueado"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </MobileShell>
  );
}