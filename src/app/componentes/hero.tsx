'use client'

import { useState } from 'react'
import './hero.css'

export default function Hero() {

  const [menuOpen, setMenuOpen] = useState(false)
  
  return (
    
    <section className="hero">

     {/* ===== HEADER DESKTOP ===== */}

<header className="navbar desktopNavbar">

 <div className="logo">
<img
  src="/logo.png"
  alt="PainelEmprest"
  className="logoImage"
/>
  </div>

  <nav className="desktopNav">

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
      <div className="supportIcon">
        💬
      </div>

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

{/* ===== HEADER MOBILE ===== */}

<header className="mobileNavbar">

  <button
    className="menuButton"
    onClick={() => setMenuOpen(!menuOpen)}
  >
    ☰
  </button>

<img
  src="/logo.png"
  alt="PainelEmprest"
  className="logoImage"
/>

  <div className="mobileActions">

    <a href="/login">
      Entrar
    </a>

    <a
      href="/register"
      className="mobileRegisterTop"
    >
      Criar conta
    </a>

  </div>

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

<img
  src="/0112.png"
  alt="Dashboard"
  width={700}
  height={600}
  className="dashboardImage"
/>

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
<div className={`mobileMenu ${menuOpen ? 'open' : ''}`}>

  <button
    className="closeMenu"
    onClick={() => setMenuOpen(false)}
  >
    ✕
  </button>

  <div className="mobileLogo">

<img
  src="/logo.png"
  alt="PainelEmprest"
  className="logoImage"
/>

  </div>

  <a href="#recursos" onClick={() => setMenuOpen(false)}>
    Recursos
  </a>

  <a href="#planos" onClick={() => setMenuOpen(false)}>
    Planos
  </a>

  <a
    href="https://wa.me/5516997010388"
    target="_blank"
    onClick={() => setMenuOpen(false)}
  >
    Suporte
  </a>

</div>

{menuOpen && (
  <div
    className="overlay"
    onClick={() => setMenuOpen(false)}
  />
)}

</section>
  )}