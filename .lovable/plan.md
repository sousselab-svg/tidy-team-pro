
## Portal do Cliente — Escopo

Página pública acessível por link único e permanente por cliente, sem login. Cliente vê próximos serviços, aprova orçamentos pendentes e "paga" faturas anexando comprovante PIX. Empresa confirma manualmente.

## Banco (1 migration)

**Novas tabelas (todas com owner_id + RLS por dono):**
- `company_settings` — `owner_id` (PK), `company_name`, `pix_key`, `pix_instructions`, `logo_url`
- `quotes` — orçamento ligado a `client_id`. Campos: `title`, `items` (jsonb: [{desc, qty, unit_price_cents}]), `total_cents`, `status` (draft/sent/approved/rejected), `valid_until`, `notes`, `approved_at`
- `invoices` — fatura ligada a `client_id`, opcional `quote_id`/`job_id`. Campos: `title`, `amount_cents`, `status` (open/paid/overdue/cancelled), `due_date`, `paid_at`, `payment_proof_path` (Storage), `confirmed_at`
- `clients` — adicionar coluna `portal_token` (uuid único, gerado automaticamente em insert via default + para registros antigos)

**Storage bucket público de leitura controlada:** `payment-proofs` (privado; URLs assinadas via server fn).

**Acesso público sem auth:** o portal lê/escreve usando `supabaseAdmin` dentro de server functions públicas que recebem `portal_token` como chave e fazem filtro `WHERE clients.portal_token = $1`. Sem bearer token. Todas as queries escopadas por token.

## Server functions

**Internas (_authenticated, com requireSupabaseAuth):**
- `src/lib/quotes.functions.ts` — list, create, update, delete, send (marca status=sent)
- `src/lib/invoices.functions.ts` — list, create, updateStatus (open/paid/cancelled), confirmPayment (admin confirma comprovante), getProofSignedUrl
- `src/lib/settings.functions.ts` — getSettings, upsertSettings
- `src/lib/clients.functions.ts` — adicionar `getPortalLink(clientId)` que retorna URL completa

**Públicas (sem requireSupabaseAuth, usando supabaseAdmin):**
- `src/lib/portal.functions.ts`:
  - `getPortalData({ token })` → { client, company, upcomingJobs, pendingQuotes, openInvoices }
  - `approveQuote({ token, quoteId })` → valida que quote.client.portal_token === token, status=sent → approved
  - `submitPaymentProof({ token, invoiceId, fileBase64, contentType })` → upload no bucket, set `payment_proof_path`, status fica `open` até dono confirmar
- Validação Zod estrita + limites (tamanho de arquivo, mime image/pdf only)

## Rotas

**Públicas:**
- `src/routes/portal.$token.tsx` — SSR off, layout mobile, 3 seções (Próximos serviços, Orçamentos para aprovar, Faturas em aberto). Sem head com dados sensíveis.

**Internas (_authenticated):**
- `src/routes/_authenticated/orcamentos.tsx` — substitui mock atual. Lista + form criar (cliente, itens, total, validade), botão "enviar" (gera link), aprovar/rejeitar interno
- `src/routes/_authenticated/faturamento.tsx` — substitui mock. Lista, criar fatura (linkada a quote/job opcional), banner com comprovantes pendentes de confirmação, ação "Confirmar pagamento"
- `src/routes/_authenticated/configuracoes.tsx` — empresa + PIX (chave, instruções)
- `src/routes/_authenticated/clientes.tsx` — adicionar botão "Copiar link do portal" em cada cliente

## UI / nav

- Adicionar item "Config" no MobileShell footer ou menu
- Toast `sonner` em todas as mutations
- Estados vazios em cada seção do portal

## Segurança

- `portal_token` é uuid v4, ~10^36 espaço — adequado para link compartilhável; explico ao usuário que quem tem o link tem acesso (mesmo modelo do Google Docs "qualquer pessoa com link")
- Server fns públicas validam o token a cada chamada e nunca aceitam `client_id` direto
- Upload limita 5MB, mime types image/* + pdf
- RLS em todas as tabelas (`auth.uid() = owner_id`)
- Storage bucket privado; URLs assinadas só geradas para dono via server fn autenticada

## O que NÃO entra agora

- Email/WhatsApp automático com o link (você compartilha manualmente — botão copiar já resolve)
- Pagamento online via gateway (decisão anterior)
- Histórico/timeline detalhada
- Editor de templates de orçamento

Posso seguir?
