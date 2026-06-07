
-- Legal documents (versioned)
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('terms','privacy')),
  version text NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  summary text,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_type, version)
);

GRANT SELECT ON public.legal_documents TO authenticated, anon;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads legal documents"
  ON public.legal_documents FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unique partial index: only one current per doc_type
CREATE UNIQUE INDEX legal_documents_one_current_per_type
  ON public.legal_documents (doc_type) WHERE is_current = true;

-- Acceptances
CREATE TABLE public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('terms','privacy')),
  version text NOT NULL,
  document_id uuid NOT NULL REFERENCES public.legal_documents(id) ON DELETE RESTRICT,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_id)
);

GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own acceptances"
  ON public.legal_acceptances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user creates own acceptances"
  ON public.legal_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_legal_acceptances_updated_at
  BEFORE UPDATE ON public.legal_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial versions
INSERT INTO public.legal_documents (doc_type, version, effective_at, summary, is_current)
VALUES
  ('terms',   '1.0.0', now(), 'Versão inicial dos Termos de Uso.', true),
  ('privacy', '1.0.0', now(), 'Versão inicial da Política de Privacidade.', true);
