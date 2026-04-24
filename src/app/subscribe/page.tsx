'use client'

import { useState } from 'react'

export default function SubscribePage() {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleCheckout() {
    try {
      setCarregando(true)
      setErro('')

      const res = await fetch('/api/checkout', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || 'Erro ao iniciar checkout.')
        return
      }

      window.location.href = data.url
    } catch {
      setErro('Erro ao iniciar checkout.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #050816 0%, #111827 35%, #3b0764 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          background: 'rgba(10,10,18,0.88)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <h1 style={{ marginTop: 0 }}>Assinar plano</h1>
        <p style={{ color: 'rgba(255,255,255,0.72)' }}>
          Continue usando o sistema com acesso completo.
        </p>

        <div
          style={{
            marginTop: '20px',
            padding: '20px',
            borderRadius: '16px',
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Plano Basic</h2>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: '10px 0' }}>
            R$ 29,90
            <span style={{ fontSize: '16px', fontWeight: 400 }}>/mês</span>
          </p>

          <ul style={{ lineHeight: 1.8, paddingLeft: '18px' }}>
            <li>Agenda de atendimentos</li>
            <li>Cadastro de serviços</li>
            <li>Lembretes por WhatsApp</li>
            <li>Controle básico do faturamento</li>
          </ul>
        </div>

        {erro && (
          <div
            style={{
              marginTop: '16px',
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.35)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: '14px',
              fontSize: '14px',
            }}
          >
            {erro}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={carregando}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '15px 16px',
            background: '#a3e635',
            color: '#111827',
            border: 'none',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          {carregando ? 'Redirecionando...' : 'Assinar agora'}
        </button>
      </div>
    </main>
  )
}