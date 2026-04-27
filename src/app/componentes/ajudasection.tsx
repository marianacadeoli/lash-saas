'use client'

export default function AjudaSection() {
  function abrirWhatsapp() {
    window.open('https://wa.me/5511999999999', '_blank')
  }

  function enviarEmail() {
    window.open('mailto:suporte@seusite.com', '_blank')
  }

  return (
    <div>
      <h1 style={{ margin: 0 }}>Suporte</h1>

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
  color: '#b4b4b4',
  marginTop: '8px'
}

const cardStyle = {
  marginTop: '20px',
  padding: '20px',
  borderRadius: '16px',
  background: '#101010',
  border: '1px solid #2a2a2a'
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
  border: 'none',
  background: '#27272a',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const faqItem = {
  marginTop: '14px'
}

const mutedStyle = {
  color: '#b4b4b4',
  marginTop: '4px'
}