'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ClientesSection from '../componentes/clientessection'

type Aba = 'visao' | 'agenda' | 'clientes' | 'servicos' | 'ganhos' | 'configuracoes' | 'ajuda'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [carregandoPagina, setCarregandoPagina] = useState(true)
  const [assinatura, setAssinatura] = useState<any>(null)
  const [abaAtual, setAbaAtual] = useState<Aba>('visao')
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  function trocarAba(id: Aba) {
    setAbaAtual(id)
    if (isMobile) setSidebarAberta(false)
  }

  function renderConteudo() {
    if (abaAtual === 'clientes') {
  return <ClientesSection />
}
    const titulo = menu.find((item) => item.id === abaAtual)?.label

    const textos: Record<Aba, string> = {
      visao: 'Resumo do seu negócio, próximos atendimentos e indicadores principais.',
      agenda: 'Aqui vamos organizar os agendamentos, filtros e novos horários.',
      clientes: 'Aqui vamos listar, cadastrar e editar clientes.',
      servicos: 'Aqui vamos cadastrar serviços, valores e duração.',
      ganhos: 'Aqui vamos mostrar faturamento, valores feitos e previstos.',
      configuracoes: 'Aqui vão dados da conta, plano e preferências.',
      ajuda: 'Dúvidas frequentes, suporte e orientações.',
    }

    return (
      <div>
        <h1 style={{ margin: '0 0 12px', fontSize: isMobile ? '28px' : '34px' }}>
          {titulo}
        </h1>

        <p
          style={{
            margin: 0,
            color: '#b4b4b4',
            fontSize: '16px',
            lineHeight: 1.6,
            maxWidth: '620px',
          }}
        >
          {textos[abaAtual]}
        </p>

        <div
          style={{
            marginTop: '28px',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          <div style={cardStyle}>
            <span style={cardLabelStyle}>Agendamentos</span>
            <strong style={cardNumberStyle}>0</strong>
          </div>

          <div style={cardStyle}>
            <span style={cardLabelStyle}>Ganhos do mês</span>
            <strong style={cardNumberStyle}>R$ 0</strong>
          </div>

          <div style={cardStyle}>
            <span style={cardLabelStyle}>Próximos</span>
            <strong style={cardNumberStyle}>0</strong>
          </div>
        </div>
      </div>
    )
  }

  if (carregandoPagina) {
    return (
      <main style={loadingStyle}>
        Carregando...
      </main>
    )
  }

  return (
    <main style={mainStyle}>
      {isMobile && sidebarAberta && (
        <div
          onClick={() => setSidebarAberta(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 998,
          }}
        />
      )}

      <aside
        style={{
          ...sidebarStyle,
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? (sidebarAberta ? 0 : '-100%') : 0,
          width: isMobile ? '82%' : '280px',
          maxWidth: '320px',
          zIndex: 999,
          transition: 'left 0.25s ease',
        }}
      >
        <div>
          <div style={sidebarHeaderStyle}>
            <h2 style={{ margin: 0, fontSize: '22px' }}>💅 Lash SaaS</h2>

            {isMobile && (
              <button
                onClick={() => setSidebarAberta(false)}
                style={closeButtonStyle}
              >
                ✕
              </button>
            )}
          </div>

          <nav style={{ display: 'grid', gap: '8px' }}>
            {menu.map((item) => {
              const ativo = abaAtual === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => trocarAba(item.id)}
                  style={{
                    ...menuButtonStyle,
                    border: ativo ? '1px solid #d946ef' : '1px solid transparent',
                    background: ativo ? 'rgba(217,70,239,0.16)' : 'transparent',
                    color: ativo ? '#fff' : '#d4d4d4',
                    fontWeight: ativo ? 800 : 500,
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div>
          <div style={planCardStyle}>
            <p style={planTextStyle}>
              <strong>Plano:</strong> {assinatura?.plan || '-'}
            </p>

            <p style={planTextStyle}>
              <strong>Status:</strong>{' '}
              {assinatura?.status === 'active' ? 'Ativo' : assinatura?.status || '-'}
            </p>

            <p style={{ ...planTextStyle, marginBottom: 0 }}>
              <strong>Vence em:</strong><br />
              {formatarDataAssinatura(assinatura?.current_period_end)}
            </p>
          </div>

          <button onClick={sair} style={logoutButtonStyle}>
            Sair
          </button>
        </div>
      </aside>

      <section style={contentStyle}>
        {isMobile && (
          <button
            onClick={() => setSidebarAberta(true)}
            style={mobileMenuButtonStyle}
          >
            ☰ Menu
          </button>
        )}

        <div style={contentCardStyle}>
          {renderConteudo()}
        </div>
      </section>
    </main>
  )
}

const mainStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  background: 'linear-gradient(135deg, #080808 0%, #0d0d12 55%, #13051f 100%)',
  color: 'white',
  fontFamily: 'Arial, sans-serif',
}

const loadingStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: '#0b0b0b',
  color: 'white',
  fontFamily: 'Arial, sans-serif',
}

const sidebarStyle: React.CSSProperties = {
  top: 0,
  height: '100vh',
  background: 'rgba(17,17,17,0.98)',
  borderRight: '1px solid #242424',
  padding: '22px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: '12px 0 40px rgba(0,0,0,0.35)',
}

const sidebarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '28px',
}

const closeButtonStyle: React.CSSProperties = {
  background: '#1f1f1f',
  color: 'white',
  border: '1px solid #333',
  borderRadius: '10px',
  width: '38px',
  height: '38px',
  cursor: 'pointer',
  fontSize: '16px',
}

const menuButtonStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '14px 16px',
  borderRadius: '14px',
  cursor: 'pointer',
  fontSize: '16px',
  transition: '0.2s',
}

const planCardStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #1b1b1b 0%, #151515 100%)',
  padding: '18px',
  borderRadius: '18px',
  fontSize: '14px',
  border: '1px solid #2f2f2f',
  marginBottom: '14px',
}

const planTextStyle: React.CSSProperties = {
  margin: '0 0 10px',
  lineHeight: 1.5,
}

const logoutButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  borderRadius: '14px',
  border: 'none',
  background: '#27272a',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '15px',
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: '22px',
  width: '100%',
}

const mobileMenuButtonStyle: React.CSSProperties = {
  marginBottom: '18px',
  background: '#1f1f1f',
  border: '1px solid #333',
  borderRadius: '14px',
  color: 'white',
  padding: '12px 16px',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '16px',
}

const contentCardStyle: React.CSSProperties = {
  maxWidth: '980px',
  margin: '0 auto',
  background: 'rgba(20,20,20,0.95)',
  border: '1px solid #2a2a2a',
  borderRadius: '24px',
  padding: '28px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
}

const cardStyle: React.CSSProperties = {
  background: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: '18px',
  padding: '18px',
}

const cardLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#a1a1aa',
  fontSize: '14px',
  marginBottom: '10px',
}

const cardNumberStyle: React.CSSProperties = {
  fontSize: '24px',
}