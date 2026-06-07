import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { confirmDeletionRequest } from "@/lib/lgpd.functions";

export const Route = createFileRoute("/confirmar-exclusao/$token")({
  head: () => ({
    meta: [{ title: "Confirmar exclusão de conta — CleanOps" }],
  }),
  component: ConfirmDeletionPage,
});

function ConfirmDeletionPage() {
  const { token } = Route.useParams();
  const confirm = useServerFn(confirmDeletionRequest);
  const mut = useMutation({ mutationFn: () => confirm({ data: { token } }) });

  useEffect(() => {
    mut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 ring-1 ring-border">
        <h1 className="text-lg font-bold">Exclusão de conta</h1>
        {mut.isPending && (
          <p className="mt-2 text-sm text-muted-foreground">Confirmando...</p>
        )}
        {mut.isSuccess && (
          <p className="mt-2 text-sm">
            {mut.data?.alreadyConfirmed
              ? "Sua solicitação já estava confirmada."
              : "Solicitação de exclusão confirmada. Vamos processá-la em breve."}
          </p>
        )}
        {mut.isError && (
          <p className="mt-2 text-sm text-destructive">
            {(mut.error as Error).message}
          </p>
        )}
        <Link
          to="/"
          className="mt-4 inline-flex w-full justify-center rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
        >
          Voltar
        </Link>
      </div>
    </div>
  );
}