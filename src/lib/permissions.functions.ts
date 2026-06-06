import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PERMISSION_KEYS = [
  "jobs.create",
  "jobs.edit",
  "jobs.cancel",
  "quotes.approve",
  "reports.access",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_META: Record<PermissionKey, { label: string; description: string }> = {
  "jobs.create": { label: "Criar jobs", description: "Agendar novos serviços" },
  "jobs.edit": { label: "Editar jobs", description: "Alterar dados de serviços existentes" },
  "jobs.cancel": { label: "Cancelar jobs", description: "Marcar serviços como cancelados" },
  "quotes.approve": { label: "Aprovar orçamentos", description: "Aprovar ou rejeitar orçamentos" },
  "reports.access": { label: "Acessar relatórios", description: "Ver relatórios e BI" },
};

const ROLES = ["admin", "operator"] as const;
export type RoleKey = (typeof ROLES)[number];

export type PermissionMatrix = Record<RoleKey, Record<PermissionKey, boolean>>;

function defaultMatrix(): PermissionMatrix {
  return {
    admin: PERMISSION_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as Record<PermissionKey, boolean>,
    ),
    operator: PERMISSION_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: false }),
      {} as Record<PermissionKey, boolean>,
    ),
  };
}

export const getPermissionsMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PermissionMatrix> => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("org_owner_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const orgOwnerId = roleRow?.org_owner_id ?? context.userId;

    const { data, error } = await context.supabase
      .from("role_permissions")
      .select("role, permission, allowed")
      .eq("org_owner_id", orgOwnerId);
    if (error) throw new Error(error.message);

    const matrix = defaultMatrix();
    for (const row of data ?? []) {
      const r = row.role as RoleKey;
      const p = row.permission as PermissionKey;
      if (r in matrix && PERMISSION_KEYS.includes(p)) {
        matrix[r][p] = !!row.allowed;
      }
    }
    // Admins always have everything.
    matrix.admin = PERMISSION_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as Record<PermissionKey, boolean>,
    );
    return matrix;
  });

export const setPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        role: z.enum(["operator"]),
        permission: z.enum(PERMISSION_KEYS),
        allowed: z.boolean(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role, org_owner_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const orgOwnerId = roleRow?.org_owner_id ?? context.userId;
    const isAdmin = !roleRow || roleRow.role === "admin";
    if (!isAdmin) throw new Error("Apenas admin pode alterar permissões");

    const { error } = await context.supabase
      .from("role_permissions")
      .upsert(
        {
          org_owner_id: orgOwnerId,
          role: data.role,
          permission: data.permission,
          allowed: data.allowed,
        },
        { onConflict: "org_owner_id,role,permission" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });