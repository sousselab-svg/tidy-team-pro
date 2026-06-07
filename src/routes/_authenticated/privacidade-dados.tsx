import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { Switch } from "@/components/ui/switch";
import {
  getMyConsent,
  updateMyConsent,
  listMyDataRequests,
  createDataRequest,
  cancelDataRequest,
  exportMyDataNow,
  type DSRKind,
} from "@/lib/lgpd.functions";

export const Route = createFileRoute("/_authenticated/privacidade-dados")({
  head: () => ({
    meta: [{ title: "Privacidade e Dados (LGPD/GDPR) — CleanOps" }],
  }),
  component: PrivacyDataPage,
});

const KIND_LABEL: Record<DSRKind, string> = {
  export: "Exportar meus dados",
  deletion: "Excluir minha conta e dados",
  rectification: "Corrigir meus dados",
};

function PrivacyDataPage() {
  const qc = useQueryClient();
  const getConsent = useServerFn(getMyConsent);
  const saveConsent = useServerFn(updateMyConsent);
  const listReqs = useServerFn(listMyDataRequests);
  const createReq = useServerFn(createDataRequest);
  const cancelReq = useServerFn(cancelDataRequest);
  const exportNow = useServerFn(exportMyDataNow);

  const consentQ = useQuery({ queryKey: ["lgpd-consent"], queryFn: () => getConsent() });
  const reqsQ = useQuery({ queryKey: ["lgpd-reqs"], queryFn: () => listReqs() });

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [functional, setFunctional] = useState(true);

  useEffect(() => {
    if (consentQ.data) {
      setAnalytics(consentQ.data.analytics);
      setMarketing(consentQ.data.marketing);
      setFunctional(consentQ.data.functional);
    }
  }, [consentQ.data]);

  const saveMut = useMutation({
    mutationFn: () => saveConsent({ data: { analytics, marketing, functional } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lgpd-consent"] });
      toast.success("Preferências salvas");
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const reqMut = useMutation({
    mutationFn: (kind: DSRKind) => createReq({ data: { kind } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lgpd-reqs"] });
      toast.success("Solicitação registrada");
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelReq({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lgpd-reqs"] });
      toast.success("Solicitação cancelada");
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const exportMut = useMutation({
    mutationFn: () => exportNow(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cleanops-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      qc.invalidateQueries({ queryKey: ["lgpd-reqs"] });
      toast.success("Dados exportados");
    },
    onError: (e) => toast.error("Erro ao exportar", { description: (e as Error).message }),
  });

  const requests = reqsQ.data?.requests ?? [];

  return (
    <MobileShell>
      <PageHeader
        eyebrow="LGPD · GDPR"
        title="Privacidade e Dados"
        subtitle="Controle seus consentimentos e exerça seus direitos sobre seus dados pessoais."
      />

      <section className="px-5 pb-4">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Consentimentos
        </h2>
        <div className="space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border">
          <Row
            title="Essenciais (funcional)"
            desc="Necessário para autenticação e funcionamento do app. Não pode ser desativado."
            checked={functional}
            disabled
            onChange={setFunctional}
          />
          <Row
            title="Analytics"
            desc="Métricas anônimas para melhorar o produto."
            checked={analytics}
            onChange={setAnalytics}
          />
          <Row
            title="Marketing"
            desc="Comunicações de novidades, dicas e promoções."
            checked={marketing}
            onChange={setMarketing}
          />
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saveMut.isPending ? "Salvando..." : "Salvar preferências"}
          </button>
          {consentQ.data?.updated_at && (
            <p className="text-center text-[11px] text-muted-foreground">
              Última atualização:{" "}
              {new Date(consentQ.data.updated_at).toLocaleString("pt-BR")} · versão{" "}
              {consentQ.data.policy_version}
            </p>
          )}
        </div>
      </section>

      <section className="px-5 pb-4">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Seus direitos
        </h2>
        <div className="space-y-2">
          <ActionCard
            title="Exportar meus dados"
            desc="Baixe agora um arquivo JSON com todos os seus dados pessoais e operacionais."
            cta={exportMut.isPending ? "Gerando..." : "Baixar JSON"}
            onClick={() => exportMut.mutate()}
            disabled={exportMut.isPending}
          />
          <ActionCard
            title="Corrigir meus dados"
            desc="Solicite a correção de informações pessoais imprecisas."
            cta="Solicitar"
            onClick={() => reqMut.mutate("rectification")}
            disabled={reqMut.isPending}
          />
          <ActionCard
            title="Excluir minha conta"
            desc="Solicita a exclusão da conta e dos dados pessoais, respeitando obrigações legais de retenção."
            cta="Solicitar exclusão"
            destructive
            onClick={() => {
              if (
                confirm(
                  "Confirma a solicitação de exclusão? Sua conta e dados serão removidos após análise.",
                )
              ) {
                reqMut.mutate("deletion");
              }
            }}
            disabled={reqMut.isPending}
          />
        </div>
      </section>

      <section className="px-5 pb-8">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Histórico de solicitações
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            Nenhuma solicitação até o momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-border"
              >
                <div>
                  <div className="text-sm font-semibold">{KIND_LABEL[r.kind]}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(r.requested_at).toLocaleString("pt-BR")} · {r.status}
                  </div>
                </div>
                {r.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => cancelMut.mutate(r.id)}
                    className="text-xs font-semibold text-destructive"
                  >
                    Cancelar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">
          Veja também{" "}
          <Link to="/privacidade" className="font-semibold text-primary">
            Política de Privacidade
          </Link>{" "}
          e{" "}
          <Link to="/termos" className="font-semibold text-primary">
            Termos de Uso
          </Link>
          .
        </p>
      </section>
    </MobileShell>
  );
}

function Row({
  title,
  desc,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function ActionCard({
  title,
  desc,
  cta,
  onClick,
  disabled,
  destructive,
}: {
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={
          "mt-3 w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 " +
          (destructive
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground")
        }
      >
        {cta}
      </button>
    </div>
  );
}