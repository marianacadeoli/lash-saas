'use client'

import './Navbar.css'

export default function Navbar() {
  return (
    <header>
      <div>
        <h2>CredCore</h2>
        <span>Gestão de empréstimos</span>
      </div>

      <nav>
        <a href="#recursos">Recursos</a>
        <a href="#vantagens">Vantagens</a>
        <a href="#planos">Planos</a>
      </nav>

      <div className="actions">
        <a href="/login" className="login">
          Entrar
        </a>

        <a href="/register" className="primary">
          Começar grátis
        </a>
      </div>
    </header>
  )
}