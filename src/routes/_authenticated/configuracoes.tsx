import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { getSettings, saveSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — CleanOps" }] }),
  component: SettingsPage,
});

const settingsQuery = queryOptions({ queryKey: ["settings"], queryFn: () => getSettings() });

function SettingsPage() {
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
      toast.success("Configurações salvas");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  return (
    <MobileShell>
      <PageHeader eyebrow="Empresa" title="Configurações" subtitle="Dados exibidos no portal do cliente" />
      <form
        className="space-y-4 px-5"
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
      >
        <Field label="Nome da empresa" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} />
        <Field label="Chave PIX" value={form.pix_key} onChange={(v) => setForm({ ...form, pix_key: v })} placeholder="email, CPF/CNPJ, celular ou chave aleatória" />
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Instruções de pagamento</label>
          <textarea
            rows={4}
            value={form.pix_instructions}
            onChange={(e) => setForm({ ...form, pix_instructions: e.target.value })}
            placeholder="Ex: Após pagar, envie comprovante pelo portal."
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={mut.isPending}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {mut.isPending ? "Salvando…" : "Salvar"}
        </button>
      </form>
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