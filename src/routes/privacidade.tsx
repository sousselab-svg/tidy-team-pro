import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — CleanOps" },
      {
        name: "description",
        content:
          "Como o CleanOps coleta, usa, armazena e protege seus dados pessoais.",
      },
      { property: "og:title", content: "Política de Privacidade — CleanOps" },
      {
        property: "og:description",
        content:
          "Como o CleanOps coleta, usa, armazena e protege seus dados pessoais.",
      },
      { property: "og:url", content: "/privacidade" },
    ],
    links: [{ rel: "canonical", href: "/privacidade" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="text-xs font-semibold text-primary">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Última atualização: 7 de junho de 2026
        </p>

        <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-bold">1. Quem somos</h2>
            <p>
              O CleanOps ("nós", "aplicativo") é uma plataforma de gestão
              operacional para empresas de limpeza e serviços em campo. Esta
              Política descreve como tratamos os dados pessoais dos usuários do
              app (administradores, operadores e clientes finais).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. Dados que coletamos</h2>
            <ul className="list-disc pl-5">
              <li>
                <strong>Conta:</strong> nome, e-mail, senha (criptografada) e,
                quando aplicável, dados do provedor social (ex.: Google).
              </li>
              <li>
                <strong>Operacional:</strong> clientes, orçamentos, agendamentos,
                fotos de serviço, assinaturas, notas e comprovantes que você
                cadastra no app.
              </li>
              <li>
                <strong>Localização:</strong> quando o operador habilita o
                rastreamento durante o expediente, usamos a localização do
                dispositivo para roteirização e check-in nos serviços.
              </li>
              <li>
                <strong>Dispositivo:</strong> identificadores técnicos, versão
                do app, sistema operacional e logs de erro para diagnóstico.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. Como usamos seus dados</h2>
            <ul className="list-disc pl-5">
              <li>Operar funcionalidades do app (agenda, faturamento, equipe).</li>
              <li>Autenticar usuários e proteger contas.</li>
              <li>Enviar notificações operacionais (in-app e, quando habilitado, SMS/e-mail).</li>
              <li>Melhorar o produto, com métricas agregadas e sem identificação pessoal.</li>
              <li>Cumprir obrigações legais e responder a solicitações de autoridades.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. Compartilhamento</h2>
            <p>
              Não vendemos dados pessoais. Compartilhamos dados apenas com:
              provedores de infraestrutura (hospedagem, banco de dados,
              autenticação), provedores opcionais que você ativar (ex.: Twilio
              para SMS, Google Maps para mapas) e autoridades, quando exigido
              por lei.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. Armazenamento e segurança</h2>
            <p>
              Os dados ficam em provedores de nuvem com criptografia em trânsito
              (TLS) e em repouso. Aplicamos políticas de acesso por linha (RLS)
              para que cada conta veja apenas os próprios dados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. Seus direitos</h2>
            <p>
              Você pode solicitar acesso, correção, exportação ou exclusão dos
              seus dados. Para exercer esses direitos, escreva para o e-mail de
              suporte do app. A exclusão da conta remove os dados pessoais
              associados, respeitando obrigações legais de retenção.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">7. Crianças</h2>
            <p>
              O CleanOps não é destinado a menores de 13 anos. Não coletamos
              intencionalmente dados de crianças.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">8. Alterações</h2>
            <p>
              Podemos atualizar esta Política. Mudanças relevantes serão
              comunicadas no app e/ou por e-mail.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">9. Contato</h2>
            <p>
              Dúvidas sobre privacidade: entre em contato pelo canal de suporte
              indicado dentro do app.
            </p>
          </section>
        </div>

        <div className="mt-10 text-xs text-muted-foreground">
          Veja também os{" "}
          <Link to="/termos" className="font-semibold text-primary">
            Termos de Uso
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
