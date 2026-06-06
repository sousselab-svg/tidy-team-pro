import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NpsSurvey = {
  id: string;
  job_id: string;
  client_id: string | null;
  token: string;
  score: number | null;
  comment: string | null;
  sent_at: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type NpsSurveyWithJob = NpsSurvey & {
  job_title: string | null;
  client_name: string | null;
};

export type NpsPublic = {
  id: string;
  score: number | null;
  submitted_at: string | null;
  job_title: string;
  company_name: string | null;
  client_name: string | null;
};

const TokenSchema = z.string().uuid();

/** Owner: ensure a survey exists for a given completed job, return token. */
export const createNpsForJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string }) =>
    z.object({ jobId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<NpsSurvey> => {
    const { data: job, error: jErr } = await context.supabase
      .from("jobs")
      .select("id, client_id")
      .eq("id", data.jobId)
      .maybeSingle();
    if (jErr) throw new Error(jErr.message);
    if (!job) throw new Error("Serviço não encontrado");

    const { data: existing, error: exErr } = await context.supabase
      .from("nps_surveys")
      .select("*")
      .eq("job_id", data.jobId)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (existing) return existing as NpsSurvey;

    const { data: created, error } = await context.supabase
      .from("nps_surveys")
      .insert({
        owner_id: context.userId,
        job_id: data.jobId,
        client_id: job.client_id,
        sent_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return created as NpsSurvey;
  });

/** Owner: get survey attached to a job (or null). */
export const getNpsForJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string }) =>
    z.object({ jobId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<NpsSurvey | null> => {
    const { data: row, error } = await context.supabase
      .from("nps_surveys")
      .select("*")
      .eq("job_id", data.jobId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as NpsSurvey | null) ?? null;
  });

/** Owner: list all surveys with job/client info. */
export const listNps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NpsSurveyWithJob[]> => {
    const { data, error } = await context.supabase
      .from("nps_surveys")
      .select("*, jobs(title), clients(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    type Row = NpsSurvey & {
      jobs: { title: string } | null;
      clients: { name: string } | null;
    };
    return ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      job_id: r.job_id,
      client_id: r.client_id,
      token: r.token,
      score: r.score,
      comment: r.comment,
      sent_at: r.sent_at,
      submitted_at: r.submitted_at,
      created_at: r.created_at,
      job_title: r.jobs?.title ?? null,
      client_name: r.clients?.name ?? null,
    }));
  });

/** Public: fetch survey by token. */
export const getNpsByToken = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ token: TokenSchema }).parse(raw))
  .handler(async ({ data }): Promise<NpsPublic> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("nps_surveys")
      .select("id, score, submitted_at, owner_id, job_id, client_id")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Pesquisa não encontrada");

    const [jobRes, companyRes, clientRes] = await Promise.all([
      supabaseAdmin.from("jobs").select("title").eq("id", row.job_id).maybeSingle(),
      supabaseAdmin
        .from("company_settings")
        .select("company_name")
        .eq("owner_id", row.owner_id)
        .maybeSingle(),
      row.client_id
        ? supabaseAdmin.from("clients").select("name").eq("id", row.client_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    return {
      id: row.id,
      score: row.score,
      submitted_at: row.submitted_at,
      job_title: jobRes.data?.title ?? "Serviço",
      company_name: companyRes.data?.company_name ?? null,
      client_name: (clientRes.data as { name: string } | null)?.name ?? null,
    };
  });

/** Public: submit response. */
export const submitNps = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        token: TokenSchema,
        score: z.number().int().min(0).max(10),
        comment: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: fErr } = await supabaseAdmin
      .from("nps_surveys")
      .select("id, submitted_at")
      .eq("token", data.token)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!row) throw new Error("Pesquisa não encontrada");
    if (row.submitted_at) throw new Error("Resposta já enviada");

    const { error } = await supabaseAdmin
      .from("nps_surveys")
      .update({
        score: data.score,
        comment: data.comment?.trim() || null,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });