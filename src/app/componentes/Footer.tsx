'use client'

import './footer.css'

export default function Footer() {
  return (
<footer className="footer">

  <div className="footerGrid">

    <div className="footerBrand">

      <img
        src="/logo.png"
        alt="PainelEmprest"
        className="footerLogo"
      />

      <p>
        Plataforma completa para gestão de empréstimos.
        Organize clientes, parcelas, recebimentos e acompanhe sua carteira com segurança.
      </p>

    </div>

    <div>
      <h3>Navegação</h3>

      <a href="#recursos">Recursos</a>
      <a href="#planos">Planos</a>
      <a href="/login">Entrar</a>
    </div>

    <div>
      <h3>Contato</h3>

      <a href="mailto:contato@painelemprest.com.br">
        contato@painelemprest.com.br
      </a>

      <a
        href="https://wa.me/5516997010388"
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </a>

    </div>

  </div>

  <div className="copy">
    © 2026 PainelEmprest • Todos os direitos reservados.
  </div>

</footer>
  )
}