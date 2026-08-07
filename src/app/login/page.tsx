'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import './login.css'

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
    <main className="loginPage">

      <div className="loginCard">

<img
  src="/logo.png"
  alt="PainelEmprest"
  width={240}
  height={60}
  className="loginLogo"
/>

        <span className="loginBadge">
          Bem-vindo de volta
        </span>

        <h1>
          Entrar na sua conta
        </h1>

        <p className="loginSubtitle">
          Acesse sua carteira de empréstimos de qualquer lugar.
        </p>

        <form
          onSubmit={handleLogin}
          className="loginForm"
        >

          <div className="inputGroup">

            <label>E-mail</label>

            <input
              type="email"
              placeholder="seuemail@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

          </div>

          <div className="inputGroup">

            <label>Senha</label>

            <input
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />

          </div>

          {erro && (
            <div className="errorBox">
              {erro}
            </div>
          )}

          <button
            className="loginButton"
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>

        </form>

        <div className="loginFooter">

          <Link href="/register">
            Criar conta
          </Link>

          <Link href="/forgot-password">
            Esqueci minha senha
          </Link>

        </div>

      </div>

    </main>
  )
}