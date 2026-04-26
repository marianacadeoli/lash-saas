'use client'

export default function ConfiguracoesSection() {
  return (
    <div>
      <h1 style={{ margin: 0 }}>⚙️ Configurações</h1>

      <p style={{ color: '#b4b4b4', lineHeight: 1.6 }}>
        Ajuste informações da conta, negócio, agenda e assinatura.
      </p>

      <div style={cardStyle}>
        <h2>👤 Conta</h2>
        <p style={mutedStyle}>Em breve: nome, e-mail e alteração de senha.</p>
      </div>

      <div style={cardStyle}>
        <h2>💅 Negócio</h2>
        <p style={mutedStyle}>Em breve: nome do estúdio, horário de atendimento e dias de trabalho.</p>
      </div>

      <div style={cardStyle}>
        <h2>🎂 Cupom de aniversário</h2>
        <p style={mutedStyle}>Em breve: desconto padrão e dias antes do aviso.</p>
      </div>

      <div style={cardStyle}>
        <h2>💳 Plano e assinatura</h2>
        <p style={mutedStyle}>Em breve: status, vencimento e gerenciamento da assinatura.</p>
      </div>

      <div style={dangerCardStyle}>
        <h2>🚨 Zona de perigo</h2>
        <p style={mutedStyle}>
          Em breve: opção para excluir conta com aviso sobre assinatura ativa.
        </p>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: '18px',
  padding: '18px',
}

const dangerCardStyle: React.CSSProperties = {
  ...cardStyle,
  border: '1px solid #7f1d1d',
}

const mutedStyle: React.CSSProperties = {
  color: '#b4b4b4',
  lineHeight: 1.6,
}