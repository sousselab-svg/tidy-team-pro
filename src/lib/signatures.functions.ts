import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_BYTES = 1_500_000;

export const saveJobSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        jobId: z.string().uuid(),
        signedByName: z.string().min(1).max(120),
        pngBase64: z.string().min(1).max(2_500_000),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const clean = data.pngBase64.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(clean, "base64");
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
      throw new Error("Assinatura inválida");
    }
    const path = `${context.userId}/${data.jobId}/signature-${Date.now()}.png`;
    const { error: upErr } = await context.supabase.storage
      .from("job-photos")
      .upload(path, buffer, { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { error } = await context.supabase
      .from("jobs")
      .update({
        signature_path: path,
        signed_by_name: data.signedByName,
        signed_at: new Date().toISOString(),
      })
      .eq("id", data.jobId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getJobSignatureUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ jobId: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("jobs")
      .select("signature_path")
      .eq("id", data.jobId)
      .single();
    if (error) throw new Error(error.message);
    if (!row.signature_path) return { url: null };
    const { data: signed, error: sErr } = await context.supabase.storage
      .from("job-photos")
      .createSignedUrl(row.signature_path, 60 * 30);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl };
  });

export const clearJobSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ jobId: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: row } = await context.supabase
      .from("jobs")
      .select("signature_path")
      .eq("id", data.jobId)
      .single();
    if (row?.signature_path) {
      await context.supabase.storage.from("job-photos").remove([row.signature_path]);
    }
    const { error } = await context.supabase
      .from("jobs")
      .update({ signature_path: null, signed_by_name: null, signed_at: null })
      .eq("id", data.jobId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });