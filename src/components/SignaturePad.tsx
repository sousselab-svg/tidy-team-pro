import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PenLine, RotateCcw, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  clearJobSignature,
  getJobSignatureUrl,
  saveJobSignature,
} from "@/lib/signatures.functions";

export function SignaturePad({
  jobId,
  signedAt,
  signedByName,
  hasSignature,
}: {
  jobId: string;
  signedAt: string | null;
  signedByName: string | null;
  hasSignature: boolean;
}) {
  const qc = useQueryClient();
  const save = useServerFn(saveJobSignature);
  const clear = useServerFn(clearJobSignature);
  const getUrl = useServerFn(getJobSignatureUrl);

  const urlQ = useQuery({
    queryKey: ["job-signature", jobId, signedAt],
    queryFn: () => getUrl({ data: { jobId } }),
    enabled: hasSignature,
  });

  const [open, setOpen] = useState(false);

  const saveMut = useMutation({
    mutationFn: (input: { signedByName: string; pngBase64: string }) =>
      save({ data: { jobId, ...input } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["job-signature", jobId] });
      toast.success("Assinatura registrada");
      setOpen(false);
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const clearMut = useMutation({
    mutationFn: () => clear({ data: { jobId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["job-signature", jobId] });
      toast.success("Assinatura removida");
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  return (
    <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center gap-2">
        <PenLine className="size-4 text-primary" />
        <p className="text-sm font-bold">Assinatura digital do cliente</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Comprovante da aceitação do serviço executado.
      </p>

      {hasSignature ? (
        <div className="mt-3">
          <div className="overflow-hidden rounded-xl bg-white p-2 ring-1 ring-border">
            {urlQ.data?.url ? (
              <img
                src={urlQ.data.url}
                alt="Assinatura"
                className="mx-auto h-28 object-contain"
              />
            ) : (
              <div className="grid h-28 place-items-center text-xs text-muted-foreground">
                Carregando…
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-foreground">
            <span className="font-semibold">{signedByName}</span>
            {signedAt && (
              <span className="text-muted-foreground">
                {" · "}
                {formatDateTime(signedAt)}
              </span>
            )}
          </p>
          <button
            onClick={() => {
              if (confirm("Remover assinatura?")) clearMut.mutate();
            }}
            disabled={clearMut.isPending}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" /> Remover assinatura
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
        >
          <PenLine className="size-4" /> Coletar assinatura
        </button>
      )}

      {open && (
        <SignatureModal
          onClose={() => setOpen(false)}
          busy={saveMut.isPending}
          onSave={(payload) => saveMut.mutate(payload)}
        />
      )}
    </section>
  );
}

function SignatureModal({
  onClose,
  onSave,
  busy,
}: {
  onClose: () => void;
  onSave: (p: { signedByName: string; pngBase64: string }) => void;
  busy: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  }

  function end() {
    drawing.current = false;
  }

  function clearPad() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    dirty.current = false;
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Informe o nome de quem assina");
      return;
    }
    if (!dirty.current) {
      toast.error("Assine no quadro acima");
      return;
    }
    const png = canvasRef.current?.toDataURL("image/png");
    if (!png) return;
    onSave({ signedByName: name.trim(), pngBase64: png });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4">
      <div className="m-auto w-full max-w-md rounded-2xl bg-card p-4 ring-1 ring-border">
        <p className="text-sm font-bold">Assine no quadro abaixo</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Use o dedo (toque) ou o mouse.
        </p>
        <div className="mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-border">
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={end}
            style={{ width: "100%", height: 200, touchAction: "none" }}
          />
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome de quem assina"
          className="mt-3 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onClick={clearPad}
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-xs font-semibold"
          >
            <RotateCcw className="size-3.5" /> Limpar
          </button>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy}
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <Check className="size-3.5" /> {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}