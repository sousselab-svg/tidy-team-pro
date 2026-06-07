/**
 * Smoke test sem browser para o fluxo LGPD/GDPR.
 *
 * Como rodar:
 *   bun run e2e/smoke-lgpd.ts
 *
 * Requer no .env.e2e:
 *   E2E_BASE_URL, E2E_EMAIL, E2E_PASSWORD,
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.E2E_BASE_URL?.replace(/\/$/, "") ?? "";
const SUPA_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPA_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const EMAIL = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

if (!BASE || !SUPA_URL || !SUPA_KEY || !EMAIL || !PASSWORD) {
  console.error("Missing env vars. See e2e/README.md");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY);

async function login(): Promise<string> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (error || !data.session) throw new Error(error?.message ?? "login failed");
  return data.session.access_token;
}

async function callFn(name: string, token: string, payload?: unknown) {
  // TanStack server fn endpoint
  const url = `${BASE}/_serverFn/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: payload === undefined ? "{}" : JSON.stringify(payload),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

function ok(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`✅ ${label}`);
  } else {
    console.error(`❌ ${label}`, extra ?? "");
    process.exitCode = 1;
  }
}

async function main() {
  console.log(`→ Logging in as ${EMAIL}`);
  const token = await login();
  ok("login", !!token);

  // getMyConsent
  const consent = await callFn("getMyConsent", token);
  ok(
    "consent: GET ok",
    consent.status === 200 && typeof consent.body?.policy_version === "string",
    consent,
  );

  // updateMyConsent
  const upd = await callFn("updateMyConsent", token, {
    data: { analytics: true, marketing: false, functional: true },
  });
  ok("consent: UPDATE ok", upd.status === 200 && upd.body?.ok === true, upd);

  // export
  const exp1 = await callFn("exportMyDataNow", token);
  ok(
    "export: first call returns user_id payload",
    exp1.status === 200 && exp1.body?.user_id,
    exp1,
  );

  // export rate-limit (second within window must fail)
  const exp2 = await callFn("exportMyDataNow", token);
  ok(
    "export: rate-limited on 2nd call",
    exp2.status >= 400 || /limite/i.test(JSON.stringify(exp2.body)),
    exp2,
  );

  // request deletion (returns confirmUrl)
  const del = await callFn("createDataRequest", token, {
    data: { kind: "deletion" },
  });
  ok(
    "deletion: returns confirmUrl",
    del.status === 200 && typeof del.body?.confirmUrl === "string",
    del,
  );

  // confirm via public fn (no auth required)
  const tokenMatch = (del.body?.confirmUrl ?? "").match(
    /confirmar-exclusao\/([0-9a-f-]{36})/i,
  );
  if (tokenMatch) {
    const conf = await callFn("confirmDeletionRequest", token, {
      data: { token: tokenMatch[1] },
    });
    ok(
      "deletion: confirmation accepted",
      conf.status === 200 && conf.body?.ok === true,
      conf,
    );
  } else {
    ok("deletion: confirmation token parsed", false, del);
  }

  process.exit(process.exitCode ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});