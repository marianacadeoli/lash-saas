'use client'

import './cta.css'

export default function CTA() {
  return (
    <section className="cta">

      <div className="ctaBox">

        <div>

          <h2>
            Pronto para organizar sua
            carteira de empréstimos?
          </h2>

          <p>
            Teste gratuitamente por 7 dias e tenha controle total dos seus
            clientes, empréstimos e recebimentos.
          </p>

        </div>

        <a href="/register" className="ctaButton">
          Começar agora
        </a>

      </div>

    </section>
  )
}