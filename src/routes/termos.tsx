import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — CleanOps" },
      {
        name: "description",
        content:
          "Termos e condições para uso do aplicativo CleanOps.",
      },
      { property: "og:title", content: "Termos de Uso — CleanOps" },
      {
        property: "og:description",
        content: "Termos e condições para uso do aplicativo CleanOps.",
      },
      { property: "og:url", content: "/termos" },
    ],
    links: [{ rel: "canonical", href: "/termos" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="text-xs font-semibold text-primary">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Termos de Uso
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Última atualização: 7 de junho de 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-bold">1. Aceitação</h2>
            <p>
              Ao criar uma conta ou usar o CleanOps, você concorda com estes
              Termos de Uso e com a{" "}
              <Link to="/privacidade" className="font-semibold text-primary">
                Política de Privacidade
              </Link>
              . Se não concordar, não utilize o aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. Conta e responsabilidades</h2>
            <ul className="list-disc pl-5">
              <li>Você é responsável por manter a segurança das credenciais.</li>
              <li>
                Os dados cadastrados (clientes, agenda, fotos, valores) são de
                sua responsabilidade quanto a veracidade, legalidade e direitos
                de uso.
              </li>
              <li>
                Operadores adicionados à equipe agem sob a responsabilidade do
                administrador da conta.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. Uso aceitável</h2>
            <p>Você concorda em não:</p>
            <ul className="list-disc pl-5">
              <li>Utilizar o app para atividades ilícitas ou fraudulentas.</li>
              <li>Tentar burlar autenticação, RLS ou outros mecanismos de segurança.</li>
              <li>Enviar conteúdo ofensivo, difamatório ou que viole direitos de terceiros.</li>
              <li>Fazer engenharia reversa ou revender o serviço sem autorização.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. Planos e pagamentos</h2>
            <p>
              Funcionalidades pagas, quando disponíveis, terão preços e
              condições informados no momento da contratação. Cobranças
              recorrentes serão renovadas automaticamente até cancelamento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. Propriedade intelectual</h2>
            <p>
              O software, marca e identidade visual do CleanOps pertencem aos
              seus titulares. Concedemos a você uma licença limitada,
              não-exclusiva e revogável para uso do app conforme estes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. Suspensão e encerramento</h2>
            <p>
              Podemos suspender ou encerrar contas que violarem estes Termos,
              gerarem risco de segurança ou descumprirem leis aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">7. Limitação de responsabilidade</h2>
            <p>
              O CleanOps é fornecido "como está". Não nos responsabilizamos por
              perdas indiretas, lucros cessantes ou indisponibilidades de
              provedores de terceiros. Nossa responsabilidade máxima fica
              limitada ao valor pago pelo serviço nos últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">8. Alterações</h2>
            <p>
              Podemos atualizar estes Termos a qualquer momento. O uso
              continuado após a atualização implica aceitação das novas
              condições.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">9. Lei aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis aplicáveis ao domicílio do
              titular do serviço, sem prejuízo de normas de proteção ao
              consumidor aplicáveis ao usuário.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
