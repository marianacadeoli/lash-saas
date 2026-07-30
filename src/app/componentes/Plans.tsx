'use client'

import './plans.css'

export default function Plans() {
  return (
    <section className="plans" id="planos">

      <div className="plansLeft">

        <span className="plansBadge">
          Plano único
        </span>

        <h2>
          Um único plano.
          <br />
          Todas as funcionalidades.
        </h2>

        <p>
          Sem limitações, sem módulos extras e sem surpresas. Você paga um único
          valor e tem acesso a todos os recursos da plataforma.
        </p>

        <ul>
          <li>✓ 7 dias grátis</li>
          <li>✓ Sem fidelidade</li>
          <li>✓ Clientes ilimitados</li>
          <li>✓ Empréstimos ilimitados</li>
          <li>✓ Atualizações gratuitas</li>
        </ul>

      </div>

      <div className="plansCards">

        <div className="planCard featured">

          <span className="planType">
            Plano Profissional
          </span>

          <div className="price">

            <span>R$</span>

            <strong>69,90</strong>

            <small>/mês</small>

          </div>

          <p>
            Tudo o que você precisa para administrar sua carteira de empréstimos
            em uma única plataforma.
          </p>

          <ul>

            <li>✓ Clientes ilimitados</li>

            <li>✓ Gestão de empréstimos</li>

            <li>✓ Controle de parcelas</li>

            <li>✓ Recebimentos</li>

            <li>✓ Dashboard completo</li>

            <li>✓ Relatórios financeiros</li>

            <li>✓ Backup automático</li>

            <li>✓ Suporte especializado</li>

          </ul>

          <button>
            Começar grátis
          </button>

        </div>

      </div>

    </section>
  )
}