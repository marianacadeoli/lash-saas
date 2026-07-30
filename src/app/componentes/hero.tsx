'use client'

import './hero.css'

export default function Hero() {
  return (
    <section className="hero">

      <header className="navbar">
        <div className="logo">
          <div className="logoIcon">C</div>
          <span>CredCore</span>
        </div>

        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <a href="/login">Entrar</a>
        </nav>

        <a href="/register" className="btnPrimary">
          Começar grátis
        </a>
      </header>

      <div className="heroContent">

        <div className="heroLeft">

          <span className="badge">
            Plataforma para gestão de empréstimos
          </span>

          <h1>
            Controle toda sua carteira de empréstimos em um só lugar.
          </h1>

          <p>
            Cadastre clientes, acompanhe parcelas, registre pagamentos,
            visualize indicadores financeiros e organize toda sua operação com
            rapidez e segurança.
          </p>

          <div className="buttons">
            <a href="/register" className="btnPrimary">
              Começar grátis
            </a>

            <a href="#demo" className="btnSecondary">
              Ver demonstração
            </a>
          </div>

          <div className="infos">
            <span>✓ 7 dias grátis</span>
            <span>✓ Sem cartão</span>
            <span>✓ Dados seguros</span>
          </div>

        </div>

        <div className="heroRight">

          <div className="dashboardMockup">

            <div className="card card1">
              <small>Total emprestado</small>
              <strong>R$ 48.250</strong>
            </div>

            <div className="card card2">
              <small>Recebimentos</small>
              <strong>R$ 8.450</strong>
            </div>

            <div className="card card3">
              <small>Clientes</small>
              <strong>124</strong>
            </div>

          </div>

        </div>

      </div>

    </section>
  )
}