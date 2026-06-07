# Testes E2E — LGPD/GDPR

Dois alvos:

1. **Playwright** (UI ponta-a-ponta)
2. **Smoke Node** (chamadas diretas às server functions via HTTP)

## Pré-requisitos

Crie `.env.e2e` na raiz com:

```
E2E_BASE_URL=https://project--6a6af60f-372a-40a6-a7dc-46010b75f6d4.lovable.app
E2E_EMAIL=usuario-de-teste@example.com
E2E_PASSWORD=sua-senha-forte
VITE_SUPABASE_URL=https://mczkzftwcefwlhoztxvj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...   # mesma do .env do projeto
```

> Use um **usuário de teste dedicado** já cadastrado, com Termos aceitos e
> onboarding concluído. Não use sua conta principal — o teste solicita
> exclusão (apenas registra a solicitação; não apaga dados).

## Rodar

```bash
bun add -d @playwright/test dotenv
bunx playwright install --with-deps chromium

# UI
bunx playwright test

# Smoke Node (sem browser)
bun run e2e/smoke-lgpd.ts
```

## O que é testado

- Login com usuário de teste
- Banner de cookies aparece, é dispensado e fica persistido
- Página `/privacidade-dados`: alterar consentimentos (analytics on/off) e salvar
- Exportar dados (download .json com chaves esperadas)
- Rate-limit: segundo export consecutivo dispara erro
- Solicitar exclusão de conta retorna URL de confirmação
- Confirmar exclusão pelo token muda o status para `processing`
- Cancelar solicitação volta para `cancelled`