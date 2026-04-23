'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    setMensagem('')
    setErro('')

    try {
      setCarregando(true)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/update-password',
      })

      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          setErro('Você tentou muitas vezes em pouco tempo. Aguarde um pouco e tente novamente.')
          return
        }

        setErro('Não foi possível processar sua solicitação agora. Tente novamente.')
        return
      }

      setMensagem(
        'Se existir uma conta com esse e-mail, você receberá um link de recuperação.'
      )
    } catch {
      setErro('Erro ao enviar recuperação de senha.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #050816 0%, #111827 35%, #3b0764 100%)',
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
          maxWidth: '460px',
          background: 'rgba(10,10,18,0.88)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <h1 style={{ marginTop: 0 }}>Esqueci minha senha</h1>
        <p style={{ color: 'rgba(255,255,255,0.72)' }}>
          Digite seu e-mail para receber o link de redefinição.
        </p>

        <form onSubmit={handleReset} style={{ display: 'grid', gap: '14px' }}>
          <input
            type="email"
            placeholder="seuemail@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#0b1120',
              color: '#fff',
              outline: 'none',
              fontSize: '15px',
              boxSizing: 'border-box',
            }}
          />

          {erro && (
            <div
              style={{
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

          {mensagem && (
            <div
              style={{
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.35)',
                color: '#86efac',
                padding: '12px 14px',
                borderRadius: '14px',
                fontSize: '14px',
              }}
            >
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              background: '#a3e635',
              color: '#111827',
              border: 'none',
              borderRadius: '14px',
              padding: '15px 16px',
              fontWeight: 800,
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {carregando ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>

        <p
          style={{
            marginTop: '14px',
            color: 'rgba(255,255,255,0.56)',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          Por segurança, não informamos se o e-mail está cadastrado ou não.
        </p>

        <div style={{ marginTop: '20px' }}>
          <Link
            href="/login"
            style={{
              color: '#a3e635',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Voltar para login
          </Link>
        </div>
      </div>
    </main>
  )
}