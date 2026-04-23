'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    setCarregando(false)

    if (error) {
      setErro(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
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
        <div style={{ marginBottom: '24px' }}>
          <p
            style={{
              margin: '0 0 10px 0',
              color: '#a3e635',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.4px',
            }}
          >
            To Pet Hub
          </p>

          <h1
            style={{
              margin: '0 0 10px 0',
              fontSize: '34px',
              lineHeight: 1.1,
            }}
          >
            Entrar na sua conta
          </h1>

          <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)' }}>
            Acesse sua agenda, clientes e serviços em um só lugar.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              E-mail
            </label>

            <input
              id="email"
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
          </div>

          <div>
            <label
              htmlFor="senha"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              Senha
            </label>

            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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
          </div>

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

          <button
            type="submit"
            disabled={carregando}
            style={{
              marginTop: '6px',
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
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div
          style={{
            marginTop: '22px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            fontSize: '14px',
          }}
        >
          <Link
            href="/register"
            style={{
              color: '#a3e635',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Criar conta
          </Link>

          <Link
            href="/forgot-password"
            style={{
              color: 'rgba(255,255,255,0.74)',
              textDecoration: 'none',
            }}
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>
    </main>
  )
}