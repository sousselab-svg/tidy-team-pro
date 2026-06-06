import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createJobPhotoUploadUrl,
  deleteJobPhoto,
  listJobPhotos,
  saveJobPhoto,
  type JobPhoto,
} from "@/lib/job-photos.functions";

export function JobPhotos({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listJobPhotos);
  const createUrl = useServerFn(createJobPhotoUploadUrl);
  const save = useServerFn(saveJobPhoto);
  const del = useServerFn(deleteJobPhoto);

  const q = useQuery({ queryKey: ["job-photos", jobId], queryFn: () => list({ data: { jobId } }) });

  const beforeInput = useRef<HTMLInputElement>(null);
  const afterInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const [preview, setPreview] = useState<JobPhoto | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-photos", jobId] });
      setPreview(null);
      toast.success("Foto excluída");
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  async function handleFile(kind: "before" | "after", file: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande", { description: "Máx 10MB" });
      return;
    }
    setUploading(kind);
    try {
      const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "jpg";
      const { path, token } = await createUrl({ data: { jobId, kind, ext } });
      const { error } = await supabase.storage
        .from("job-photos")
        .uploadToSignedUrl(path, token, file, { contentType: file.type || "image/jpeg" });
      if (error) throw error;
      await save({ data: { jobId, kind, path } });
      qc.invalidateQueries({ queryKey: ["job-photos", jobId] });
      toast.success(kind === "before" ? "Foto 'antes' enviada" : "Foto 'depois' enviada");
    } catch (e) {
      toast.error("Falha no envio", { description: (e as Error).message });
    } finally {
      setUploading(null);
    }
  }

  const photos = q.data ?? [];
  const before = photos.filter((p) => p.kind === "before");
  const after = photos.filter((p) => p.kind === "after");

  return (
    <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center gap-2">
        <Camera className="size-4 text-primary" />
        <p className="text-sm font-bold">Fotos antes & depois</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Registre o estado do local para comprovar o resultado.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <PhotoColumn
          label="Antes"
          photos={before}
          onPick={() => beforeInput.current?.click()}
          uploading={uploading === "before"}
          onPreview={setPreview}
        />
        <PhotoColumn
          label="Depois"
          photos={after}
          onPick={() => afterInput.current?.click()}
          uploading={uploading === "after"}
          onPreview={setPreview}
        />
      </div>

      <input
        ref={beforeInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile("before", f);
          e.target.value = "";
        }}
      />
      <input
        ref={afterInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile("after", f);
          e.target.value = "";
        }}
      />

      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Excluir esta foto?")) delMut.mutate(preview.id);
              }}
              className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground"
            >
              <Trash2 className="size-4" /> Excluir
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center">
            {preview.url && (
              <img
                src={preview.url}
                alt={preview.kind}
                className="max-h-full max-w-full rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
          <p className="text-center text-xs text-white/70">Toque fora para fechar</p>
        </div>
      )}
    </section>
  );
}

function PhotoColumn({
  label,
  photos,
  onPick,
  uploading,
  onPreview,
}: {
  label: string;
  photos: JobPhoto[];
  onPick: () => void;
  uploading: boolean;
  onPreview: (p: JobPhoto) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPreview(p)}
            className="aspect-square overflow-hidden rounded-lg bg-secondary"
          >
            {p.url && (
              <img src={p.url} alt={label} className="size-full object-cover" loading="lazy" />
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="grid aspect-square place-items-center rounded-lg border border-dashed border-border bg-secondary/40 text-muted-foreground disabled:opacity-50"
        >
          {uploading ? (
            <span className="text-[10px] font-semibold">Enviando…</span>
          ) : (
            <ImagePlus className="size-5" />
          )}
        </button>
      </div>
    </div>
  );
}