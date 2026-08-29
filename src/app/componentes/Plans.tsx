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
          Tudo o que você precisa
          <br />
          por um único preço.
        </h2>

        <p>
          Organize clientes, empréstimos, parcelas e recebimentos em uma única plataforma.
          Sem limitações, sem módulos extras e sem cobranças escondidas.
        </p>

        <div className="plansBenefits">
          <div>✓ 3 dias grátis</div>
          <div>✓ Sem fidelidade</div>
          <div>✓ Clientes ilimitados</div>
          <div>✓ Empréstimos ilimitados</div>
          <div>✓ Atualizações gratuitas</div>
        </div>

      </div>

      <div className="planCard">

        <span className="popular">
          MAIS ESCOLHIDO
        </span>

        <h3>Plano Profissional</h3>

        <div className="price">
          <span>R$</span>
          <strong>69,90</strong>
          <small>/mês</small>
        </div>

        <p>
          Tudo o que você precisa para administrar sua carteira de empréstimos.
        </p>

        <ul>
          <li>✓ Clientes ilimitados</li>
          <li>✓ Gestão de empréstimos</li>
          <li>✓ Controle de parcelas</li>
          <li>✓ Recebimentos</li>
          <li>✓ Visão Geral</li>
          <li>✓ Aviso de atraso de parcela</li>
          <li>✓ Backup automático</li>
          <li>✓ Suporte especializado</li>
        </ul>

        <button className="planButton">
          Começar teste grátis
        </button>

        <small className="planFooter">
          Sem cartão • 3 dias grátis • Cancele quando quiser
        </small>

      </div>

    </section>
  )
}