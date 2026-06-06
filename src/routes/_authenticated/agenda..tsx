
function ChecklistSection({ jobId, initial }: { jobId: string; initial: ChecklistItem[] }) {
  const qc = useQueryClient();
  const save = useServerFn(updateJobChecklist);
  const [items, setItems] = useState<ChecklistItem[]>(initial);
  const [draft, setDraft] = useState("");

  useEffect(() => setItems(initial), [jobId]);

  const mut = useMutation({
    mutationFn: (next: ChecklistItem[]) => save({ data: { id: jobId, checklist: next } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  function commit(next: ChecklistItem[]) {
    setItems(next);
    mut.mutate(next);
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label) return;
    commit([...items, { id: crypto.randomUUID().slice(0, 8), label, done: false }]);
    setDraft("");
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Checklist
        </p>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {doneCount}/{items.length}
        </span>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((it, idx) => (
            <li key={it.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = [...items];
                  next[idx] = { ...it, done: !it.done };
                  commit(next);
                }}
                className={`grid size-6 shrink-0 place-items-center rounded-md ring-1 ${
                  it.done
                    ? "bg-[color:var(--success)] text-white ring-[color:var(--success)]"
                    : "bg-secondary text-muted-foreground ring-border"
                }`}
                aria-label={it.done ? "Desmarcar" : "Marcar"}
              >
                {it.done && <Check className="size-3.5" />}
              </button>
              <span
                className={`flex-1 text-sm ${it.done ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {it.label}
              </span>
              <button
                type="button"
                onClick={() => commit(items.filter((_, i) => i !== idx))}
                className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remover"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addItem} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Adicionar etapa…"
          className="flex-1 rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Adicionar"
        >
          <CheckSquare className="size-4" />
        </button>
      </form>
    </section>
  );
}
