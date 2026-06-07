import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";

export type LegalDocType = "terms" | "privacy";

export type LegalDoc = {
  id: string;
  doc_type: LegalDocType;
  version: string;
  effective_at: string;
  summary: string | null;
};

export type PendingAcceptance = {
  pending: LegalDoc[];
  current: LegalDoc[];
};

export const getCurrentLegalDocs = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("legal_documents")
      .select("id, doc_type, version, effective_at, summary")
      .eq("is_current", true)
      .order("doc_type");
    if (error) throw error;
    return { docs: (data ?? []) as LegalDoc[] };
  },
);

export const getPendingAcceptance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PendingAcceptance> => {
    const { supabase, userId } = context;
    const { data: current, error: e1 } = await supabase
      .from("legal_documents")
      .select("id, doc_type, version, effective_at, summary")
      .eq("is_current", true);
    if (e1) throw e1;
    const currents = (current ?? []) as LegalDoc[];
    if (currents.length === 0) return { pending: [], current: [] };

    const { data: accepted, error: e2 } = await supabase
      .from("legal_acceptances")
      .select("document_id")
      .eq("user_id", userId)
      .in(
        "document_id",
        currents.map((c) => c.id),
      );
    if (e2) throw e2;
    const acceptedIds = new Set((accepted ?? []).map((a) => a.document_id));
    const pending = currents.filter((c) => !acceptedIds.has(c.id));
    return { pending, current: currents };
  });

export const acceptCurrentLegalDocs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { documentIds: string[] }) => {
    if (!Array.isArray(data?.documentIds) || data.documentIds.length === 0) {
      throw new Error("documentIds required");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const userAgent = getRequestHeader("user-agent") ?? null;

    const { data: docs, error: e1 } = await supabase
      .from("legal_documents")
      .select("id, doc_type, version, is_current")
      .in("id", data.documentIds);
    if (e1) throw e1;
    const valid = (docs ?? []).filter((d) => d.is_current);
    if (valid.length === 0) return { accepted: 0 };

    const rows = valid.map((d) => ({
      user_id: userId,
      doc_type: d.doc_type,
      version: d.version,
      document_id: d.id,
      user_agent: userAgent,
    }));

    const { error: e2 } = await supabase
      .from("legal_acceptances")
      .upsert(rows, { onConflict: "user_id,document_id", ignoreDuplicates: true });
    if (e2) throw e2;
    return { accepted: rows.length };
  });

export const getMyAcceptances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("legal_acceptances")
      .select("id, doc_type, version, accepted_at, document_id")
      .eq("user_id", userId)
      .order("accepted_at", { ascending: false });
    if (error) throw error;
    return { acceptances: data ?? [] };
  });