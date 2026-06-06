import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type JobPhoto = {
  id: string;
  job_id: string;
  kind: "before" | "after";
  path: string;
  caption: string | null;
  created_at: string;
  url?: string;
};

export const listJobPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ jobId: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("job_photos")
      .select("id, job_id, kind, path, caption, created_at")
      .eq("job_id", data.jobId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const out: JobPhoto[] = [];
    for (const r of rows ?? []) {
      const { data: signed } = await context.supabase.storage
        .from("job-photos")
        .createSignedUrl(r.path, 60 * 30);
      out.push({ ...(r as JobPhoto), url: signed?.signedUrl });
    }
    return out;
  });

export const createJobPhotoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        jobId: z.string().uuid(),
        kind: z.enum(["before", "after"]),
        ext: z.string().regex(/^[a-zA-Z0-9]{1,5}$/),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const path = `${context.userId}/${data.jobId}/${data.kind}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${data.ext.toLowerCase()}`;
    const { data: signed, error } = await context.supabase.storage
      .from("job-photos")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token };
  });

export const saveJobPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        jobId: z.string().uuid(),
        kind: z.enum(["before", "after"]),
        path: z.string().min(1).max(500),
        caption: z.string().max(200).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("job_photos").insert({
      owner_id: context.userId,
      job_id: data.jobId,
      kind: data.kind,
      path: data.path,
      caption: data.caption ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteJobPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: row, error: fErr } = await context.supabase
      .from("job_photos")
      .select("path")
      .eq("id", data.id)
      .single();
    if (fErr) throw new Error(fErr.message);
    await context.supabase.storage.from("job-photos").remove([row.path]);
    const { error } = await context.supabase.from("job_photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });