'use client'

export default function AjudaSection() {
  function abrirWhatsapp() {
    window.open('https://wa.me/5516997010388', '_blank')
  }

  function enviarEmail() {
    window.open('mailto:suporte@seusite.com', '_blank')
  }

  return (
    <div>
    <h1 style={{ margin: 0, marginBottom: '8px' }}>Suporte</h1>

      <p style={subtitleStyle}>
        Precisa de ajuda? Fale com a gente.
      </p>

      {/* SUPORTE */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Fale conosco</h2>

        <div style={buttonsContainer}>
          <button style={whatsappButton} onClick={abrirWhatsapp}>
            WhatsApp
          </button>

          <button style={emailButton} onClick={enviarEmail}>
            Enviar e-mail
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Dúvidas rápidas</h2>

        <div style={faqItem}>
          <strong>Como cadastrar cliente?</strong>
          <p style={mutedStyle}>
            Vá na aba Clientes e clique em "Cadastrar cliente".
          </p>
        </div>

        <div style={faqItem}>
          <strong>Como funciona o agendamento?</strong>
          <p style={mutedStyle}>
            Escolha cliente, serviço, data e horário. O sistema calcula automaticamente o tempo.
          </p>
        </div>

        <div style={faqItem}>
          <strong>Como editar meus dados?</strong>
          <p style={mutedStyle}>
            Vá em Configurações e clique em "Editar".
          </p>
        </div>
      </div>
    </div>
  )
}

/* ESTILO */

const subtitleStyle = {
  color: '#CBD5E1',
  marginTop: '8px'
}

const cardStyle = {
  marginTop: '20px',
  padding: '20px',
  borderRadius: '16px',
  background: '#0D1B2E',
  border: '1px solid #1F3A5F'
}

const buttonsContainer = {
  display: 'flex',
  gap: '12px',
  marginTop: '12px'
}

const whatsappButton = {
   padding: '12px 16px',
  borderRadius: '12px',
  border: 'none',
  background: '#22c55e',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const emailButton = {
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid #28538B',
  background: '#132641',
  color: '#F8FAFC',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const faqItem = {
  marginTop: '14px'
}

const mutedStyle = {
  color: '#94A3B8',
  marginTop: '4px'
}