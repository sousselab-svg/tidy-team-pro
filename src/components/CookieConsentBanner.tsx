import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "cleanops.cookieConsent.v1";

type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  ts: string;
};

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentChoice) : null;
  } catch {
    return null;
  }
}

function saveConsent(choice: Omit<ConsentChoice, "ts">) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...choice, ts: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
}

export function CookieConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(!getStoredConsent());
  }, []);

  if (!open) return null;

  const handle = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent(choice);
    setOpen(false);
  };

  return (
    <div
      data-testid="cookie-consent-banner"
      className="fixed inset-x-3 bottom-3 z-50 rounded-2xl bg-card p-4 shadow-lg ring-1 ring-border md:left-auto md:right-4 md:w-[380px]"
    >
      <p className="text-sm font-semibold">Cookies e privacidade</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Usamos cookies essenciais para funcionar. Com sua autorização, também
        usamos analytics e comunicações de marketing. Leia nossa{" "}
        <Link to="/privacidade" className="font-semibold text-primary">
          Política
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          data-testid="cookie-accept-all"
          onClick={() => handle({ analytics: true, marketing: true })}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
        >
          Aceitar tudo
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="cookie-essential-only"
            onClick={() => handle({ analytics: false, marketing: false })}
            className="flex-1 rounded-xl bg-muted py-2.5 text-xs font-semibold"
          >
            Só essenciais
          </button>
          <Link
            to="/privacidade"
            className="flex-1 rounded-xl border border-border py-2.5 text-center text-xs font-semibold"
          >
            Personalizar
          </Link>
        </div>
      </div>
    </div>
  );
}