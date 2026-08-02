'use client'

import Image from 'next/image'
import './hero.css'

export default function Hero() {
  return (
    <section className="hero">

      <header className="navbar">
<div className="logo">
  <Image
    src="/logo.png"
    alt="PainelEmprest"
    width={380}
    height={95}
    className="logoImage"
    priority
  />
</div>

        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <div className="supportMenu">

  <button className="supportButton">
    Suporte
  </button>

  <div className="supportDropdown">

    <a
      href="https://wa.me/5516997010388"
      target="_blank"
      rel="noopener noreferrer"
      className="supportItem"
    >
      <div className="supportIcon">💬</div>

      <div>
        <strong>Falar pelo WhatsApp</strong>
        <small>Atendimento imediato</small>
      </div>
    </a>

  </div>

</div>
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