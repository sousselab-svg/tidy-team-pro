import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPendingAcceptance,
  acceptCurrentLegalDocs,
  type LegalDoc,
} from "@/lib/legal.functions";

const LABEL: Record<LegalDoc["doc_type"], { name: string; href: string }> = {
  terms: { name: "Termos de Uso", href: "/termos" },
  privacy: { name: "Política de Privacidade", href: "/privacidade" },
};

export function LegalAcceptanceGate({ children }: { children: React.ReactNode }) {
  const fetchPending = useServerFn(getPendingAcceptance);
  const acceptFn = useServerFn(acceptCurrentLegalDocs);
  const qc = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["legal-pending"],
    queryFn: () => fetchPending(),
    retry: 1,
    staleTime: 60_000,
  });

  const accept = useMutation({
    mutationFn: (ids: string[]) => acceptFn({ data: { documentIds: ids } }),
    onSuccess: () => {
      toast.success("Aceite registrado");
      qc.invalidateQueries({ queryKey: ["legal-pending"] });
    },
    onError: (e) =>
      toast.error("Não foi possível registrar o aceite", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  useEffect(() => {
    setAgreed(false);
  }, [data?.pending?.length]);

  if (isLoading || error) return <>{children}</>;
  const pending = data?.pending ?? [];
  if (pending.length === 0) return <>{children}</>;

  const isUpdate = (data?.current?.length ?? 0) > pending.length
    || pending.some((p) => p.version !== "1.0.0");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-6 ring-1 ring-border sm:rounded-3xl">
        <h2 className="text-xl font-bold tracking-tight">
          {isUpdate ? "Atualização dos documentos legais" : "Termos e Privacidade"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isUpdate
            ? "Atualizamos nossos documentos. Para continuar usando o app, revise e aceite as novas versões."
            : "Para continuar, leia e aceite os documentos abaixo."}
        </p>

        <ul className="mt-4 space-y-2">
          {pending.map((doc) => {
            const meta = LABEL[doc.doc_type];
            return (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-xl bg-background px-4 py-3 ring-1 ring-border"
              >
                <div>
                  <div className="text-sm font-semibold">{meta.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Versão {doc.version} ·{" "}
                    {new Date(doc.effective_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <Link
                  to={meta.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-primary"
                >
                  Ler
                </Link>
              </li>
            );
          })}
        </ul>

        <label className="mt-4 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            Li e concordo com{" "}
            {pending.map((p, i) => (
              <span key={p.id}>
                {i > 0 ? " e " : ""}
                <Link
                  to={LABEL[p.doc_type].href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary"
                >
                  {LABEL[p.doc_type].name} v{p.version}
                </Link>
              </span>
            ))}
            .
          </span>
        </label>

        <button
          type="button"
          disabled={!agreed || accept.isPending}
          onClick={() => accept.mutate(pending.map((p) => p.id))}
          className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {accept.isPending ? "Registrando..." : "Aceitar e continuar"}
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          O aceite fica registrado com data, hora e versão.
        </p>
      </div>
    </div>
  );
}