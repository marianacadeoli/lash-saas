'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Aba = 'visao' | 'agenda' | 'clientes' | 'servicos' | 'ganhos' | 'configuracoes' | 'ajuda'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [carregandoPagina, setCarregandoPagina] = useState(true)
  const [assinatura, setAssinatura] = useState<any>(null)
  const [abaAtual, setAbaAtual] = useState<Aba>('visao')

  function formatarDataAssinatura(data?: string) {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  useEffect(() => {
    async function carregarUsuario() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      const { data: assinatura } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!assinatura || assinatura.status !== 'active') {
        router.replace('/subscribe')
        return
      }

      setAssinatura(assinatura)
      setCarregandoPagina(false)
    }

    carregarUsuario()
  }, [router, supabase])

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const menu: { id: Aba; label: string }[] = [
    { id: 'visao', label: '🏠 Visão geral' },
    { id: 'agenda', label: '📅 Agenda' },
    { id: 'clientes', label: '👩‍🦰 Clientes' },
    { id: 'servicos', label: '💅 Serviços' },
    { id: 'ganhos', label: '💰 Ganhos' },
    { id: 'configuracoes', label: '⚙️ Configurações' },
    { id: 'ajuda', label: '❓ Ajuda' },
  ]

  function renderConteudo() {
    if (abaAtual === 'visao') {
      return (
        <>
          <h1>Visão geral</h1>
          <p>Resumo do seu negócio e próximos indicadores.</p>
        </>
      )
    }

    if (abaAtual === 'agenda') {
      return (
        <>
          <h1>Agenda</h1>
          <p>Aqui vamos colocar os agendamentos, filtros e botão de novo agendamento.</p>
        </>
      )
    }

    if (abaAtual === 'clientes') {
      return (
        <>
          <h1>Clientes</h1>
          <p>Aqui vamos listar e cadastrar clientes.</p>
        </>
      )
    }

    if (abaAtual === 'servicos') {
      return (
        <>
          <h1>Serviços</h1>
          <p>Aqui vamos cadastrar serviços, valores e duração.</p>
        </>
      )
    }

    if (abaAtual === 'ganhos') {
      return (
        <>
          <h1>Ganhos</h1>
          <p>Aqui vamos mostrar faturamento, valores feitos e previstos.</p>
        </>
      )
    }

    if (abaAtual === 'configuracoes') {
      return (
        <>
          <h1>Configurações</h1>
          <p>Aqui vão dados da conta, plano e preferências.</p>
        </>
      )
    }

    return (
      <>
        <h1>Ajuda</h1>
        <p>Dúvidas frequentes, suporte e orientações.</p>
      </>
    )
  }

  if (carregandoPagina) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0b0b0b',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Carregando...
      </main>
    )
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#0b0b0b',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <aside
        style={{
          width: '270px',
          background: '#111',
          borderRight: '1px solid #222',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ marginTop: 0, marginBottom: '24px' }}>💅 Lash SaaS</h2>

          {menu.map((item) => {
            const ativo = abaAtual === item.id

            return (
              <button
                key={item.id}
                onClick={() => setAbaAtual(item.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  marginBottom: '8px',
                  borderRadius: '12px',
                  border: ativo ? '1px solid #d946ef' : '1px solid transparent',
                  background: ativo ? '#2a1230' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: ativo ? 700 : 500,
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div>
          <div
            style={{
              background: '#1a1a1a',
              padding: '16px',
              borderRadius: '14px',
              fontSize: '14px',
              border: '1px solid #2a2a2a',
              marginBottom: '12px',
            }}
          >
            <p style={{ margin: '0 0 8px' }}>
              <strong>Plano:</strong> {assinatura?.plan || '-'}
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>Status:</strong>{' '}
              {assinatura?.status === 'active' ? 'Ativo' : assinatura?.status || '-'}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Vence em:</strong>{' '}
              {formatarDataAssinatura(assinatura?.current_period_end)}
            </p>
          </div>

          <button
            onClick={sair}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: '#27272a',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      <section style={{ flex: 1, padding: '32px' }}>
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: '20px',
            padding: '28px',
          }}
        >
          {renderConteudo()}
        </div>
      </section>
    </main>
  )
}