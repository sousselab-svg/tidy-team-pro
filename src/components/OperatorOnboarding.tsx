import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, CheckCircle2, ClipboardCheck, PenLine, X } from "lucide-react";
import { getMyContext } from "@/lib/team-users.functions";

const STORAGE_KEY = "fs.operator-onboarded.v1";

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Faça check-in ao chegar",
    body:
      "Abra o job na sua agenda e toque em Iniciar. Isso registra o horário e avisa a empresa que você chegou.",
  },
  {
    icon: Camera,
    title: "Tire fotos do antes e depois",
    body:
      "Use o botão de câmera no job para anexar provas do serviço. As fotos ficam salvas mesmo se você estiver offline.",
  },
  {
    icon: PenLine,
    title: "Colete a assinatura no fim",
    body:
      "Ao finalizar, peça a assinatura do cliente na tela. É a confirmação oficial do serviço executado.",
  },
] as const;

export function OperatorOnboarding() {
  const ctxFn = useServerFn(getMyContext);
  const { data: me } = useQuery({
    queryKey: ["my-context"],
    queryFn: () => ctxFn(),
    staleTime: 60_000,
    retry: false,
  });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (me?.role !== "operator") return;
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") setOpen(true);
    } catch {
      /* storage unavailable — skip */
    }
  }, [me?.role]);

  if (!open) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/50 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-[420px] rounded-t-3xl bg-card p-6 pb-8 ring-1 ring-border sm:rounded-3xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-primary">
          Boas-vindas · {step + 1}/{STEPS.length}
        </div>

        <div className="mt-5 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="size-7" />
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.body}</p>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 24 : 8,
                backgroundColor:
                  i === step ? "var(--primary)" : "color-mix(in oklab, var(--muted-foreground) 30%, transparent)",
              }}
            />
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-xl bg-secondary py-3 text-sm font-bold text-foreground"
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            {isLast ? (
              <>
                <CheckCircle2 className="size-4" /> Começar
              </>
            ) : (
              "Próximo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
