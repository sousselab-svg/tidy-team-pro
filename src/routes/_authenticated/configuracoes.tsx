import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { getSettings, saveSettings } from "@/lib/settings.functions";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Settings — CleanOps" }] }),
  component: SettingsPage,
});

const settingsQuery = queryOptions({ queryKey: ["settings"], queryFn: () => getSettings() });

function SettingsPage() {
  const { t } = useTranslation();
  const get = useServerFn(getSettings);
  const save = useServerFn(saveSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ ...settingsQuery, queryFn: () => get() });

  const [form, setForm] = useState({
    company_name: "",
    pix_key: "",
    pix_instructions: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        company_name: data.company_name ?? "",
        pix_key: data.pix_key ?? "",
        pix_instructions: data.pix_instructions ?? "",
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () =>
      save({
        data: {
          company_name: form.company_name.trim() || null,
          pix_key: form.pix_key.trim() || null,
          pix_instructions: form.pix_instructions.trim() || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success(t("settings.saved"));
    },
    onError: (e) => toast.error(t("common.error"), { description: e.message }),
  });

  return (
    <MobileShell>
      <PageHeader eyebrow={t("settings.eyebrow")} title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <section className="px-5 pb-4">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.language")}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("settings.languageHint")}</p>
        <LanguageSwitcher />
      </section>
      <form
        className="space-y-4 px-5"
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
      >
        <Field label={t("settings.companyName")} value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} />
        <Field label={t("settings.paymentKey")} value={form.pix_key} onChange={(v) => setForm({ ...form, pix_key: v })} placeholder={t("settings.paymentKeyPlaceholder")} />
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.paymentInstructions")}</label>
          <textarea
            rows={4}
            value={form.pix_instructions}
            onChange={(e) => setForm({ ...form, pix_instructions: e.target.value })}
            placeholder={t("settings.paymentInstructionsPlaceholder")}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={mut.isPending}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {mut.isPending ? t("common.saving") : t("common.save")}
        </button>
      </form>

      <section className="px-5 pt-6">
        <Link
          to="/equipe"
          className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-border"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-secondary text-foreground">
              <Users className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">{t("settings.teamMembers")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.teamMembersHint")}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary">{t("common.open")}</span>
        </Link>
      </section>
    </MobileShell>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}