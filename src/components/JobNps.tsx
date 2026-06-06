import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { createNpsForJob, getNpsForJob } from "@/lib/nps.functions";

export function JobNps({ jobId, jobCompleted }: { jobId: string; jobCompleted: boolean }) {
  const get = useServerFn(getNpsForJob);
  const create = useServerFn(createNpsForJob);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["nps", "job", jobId],
    queryFn: () => get({ data: { jobId } }),
  });

  const createMut = useMutation({
    mutationFn: () => create({ data: { jobId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nps", "job", jobId] });
      qc.invalidateQueries({ queryKey: ["nps-list"] });
      toast.success("Link de avaliação gerado");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const survey = q.data;
  const url = survey && typeof window !== "undefined"
    ? `${window.location.origin}/nps/${survey.token}`
    : "";

  return (
    <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center gap-2">
        <Star className="size-4 text-primary" />
        <p className="text-sm font-bold">Avaliação NPS</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Envie um link para o cliente avaliar o atendimento de 0 a 10.
      </p>

      {!survey ? (
        <button
          type="button"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || !jobCompleted}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Send className="size-4" />
          {createMut.isPending
            ? "Gerando…"
            : jobCompleted
              ? "Gerar link de avaliação"
              : "Disponível após concluir"}
        </button>
      ) : survey.submitted_at ? (
        <div className="mt-3 rounded-xl bg-secondary p-3">
          <p className="text-xs text-muted-foreground">Cliente avaliou em</p>
          <p className="text-sm font-semibold">
            {formatDateTime(survey.submitted_at)}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{survey.score}/10</p>
          {survey.comment && (
            <p className="mt-2 rounded-lg bg-background p-2 text-xs">{survey.comment}</p>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">Aguardando resposta do cliente.</p>
          <div className="flex items-center gap-2 rounded-xl bg-secondary p-2">
            <input
              readOnly
              value={url}
              className="min-w-0 flex-1 bg-transparent text-xs text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast.success("Link copiado");
              }}
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-background"
              aria-label="Copiar"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}