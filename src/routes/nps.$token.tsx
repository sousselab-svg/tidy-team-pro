import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Star } from "lucide-react";
import { toast } from "sonner";
import { getNpsByToken, submitNps } from "@/lib/nps.functions";

export const Route = createFileRoute("/nps/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Avalie nosso atendimento" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NpsPage,
});

function NpsPage() {
  const { token } = Route.useParams();
  const fetchNps = useServerFn(getNpsByToken);
  const send = useServerFn(submitNps);
  const qc = useQueryClient();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["nps", token],
    queryFn: () => fetchNps({ data: { token } }),
    retry: false,
  });

  const submitMut = useMutation({
    mutationFn: () =>
      send({ data: { token, score: score!, comment: comment.trim() || null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nps", token] });
      toast.success("Obrigado pelo seu feedback!");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-bold">Link inválido</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta pesquisa não foi encontrada ou expirou.
          </p>
        </div>
      </div>
    );
  }

  const already = !!data.submitted_at;

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-10">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {data.company_name ?? "Avaliação de atendimento"}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Como foi nosso serviço?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.client_name ? `${data.client_name} · ` : ""}
          {data.job_title}
        </p>
      </header>

      {already ? (
        <section className="mt-10 rounded-3xl bg-card p-6 text-center ring-1 ring-border">
          <span className="grid mx-auto size-12 place-items-center rounded-full bg-[color:var(--success)]/15 text-[color:var(--success)]">
            <Check className="size-6" />
          </span>
          <p className="mt-3 text-base font-bold">Recebemos sua avaliação</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua nota: <strong>{data.score}/10</strong>
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Obrigado pelo retorno!</p>
        </section>
      ) : (
        <section className="mt-8">
          <p className="text-center text-sm font-semibold text-foreground">
            Em uma escala de 0 a 10, qual a chance de você nos recomendar?
          </p>

          <div className="mt-5 grid grid-cols-11 gap-1.5">
            {Array.from({ length: 11 }).map((_, i) => {
              const active = score === i;
              const tint =
                i <= 6 ? "var(--destructive)" : i <= 8 ? "var(--warning)" : "var(--success)";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScore(i)}
                  className="grid aspect-square place-items-center rounded-lg text-sm font-bold transition"
                  style={{
                    backgroundColor: active
                      ? tint
                      : `color-mix(in oklab, ${tint} 12%, transparent)`,
                    color: active ? "white" : tint,
                  }}
                >
                  {i}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Nada provável</span>
            <span>Muito provável</span>
          </div>

          <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Conte-nos mais (opcional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="O que mais gostou? O que podemos melhorar?"
            className="mt-2 w-full rounded-xl bg-secondary p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <button
            type="button"
            onClick={() => submitMut.mutate()}
            disabled={score === null || submitMut.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <Star className="size-4" />
            {submitMut.isPending ? "Enviando…" : "Enviar avaliação"}
          </button>
        </section>
      )}
    </div>
  );
}