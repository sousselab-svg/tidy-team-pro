import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, type LangCode } from "@/lib/i18n";
import { useState } from "react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language.slice(0, 2)) ?? SUPPORTED_LANGUAGES[0];

  function pick(code: LangCode) {
    void i18n.changeLanguage(code);
    try { localStorage.setItem("lang", code); } catch { /* noop */ }
    if (typeof document !== "undefined") document.documentElement.lang = code;
    setOpen(false);
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={t("common.language")}
          className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
        >
          <Globe className="size-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-12 z-50 min-w-[180px] rounded-2xl border border-border bg-card p-1 shadow-lg">
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                  current.code === l.code ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                <span>{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {SUPPORTED_LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => pick(l.code)}
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ring-1 ring-border ${
            current.code === l.code ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
          }`}
        >
          <span className="flex items-center gap-2"><span>{l.flag}</span> {l.label}</span>
          {current.code === l.code && <span className="text-xs">✓</span>}
        </button>
      ))}
    </div>
  );
}