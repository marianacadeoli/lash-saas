'use client'

import './footer.css'

export default function Footer() {
  return (
    <footer className="footer">

      <div className="footerGrid">

        <div>

          <h2>CredCore</h2>

          <p>
            Plataforma completa para gestão de empréstimos.
            Organize clientes, parcelas, recebimentos e acompanhe sua carteira
            com segurança.
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

          <p>contato@credcore.com.br</p>

          <p>(16) 99999-9999</p>

        </div>

      </div>

      <div className="copy">

        © 2026 CredCore • Todos os direitos reservados.

      </div>

    </footer>
  )
}