'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import ClientesSection from '../componentes/clientessection'
import ServicosSection from '../componentes/servicossection'
import AgendaSection from '../componentes/agendasection'
import GanhosSection from '../componentes/ganhossection'
import VisaoGeralSection from '../componentes/visaogeralsection'
import ConfiguracoesSection from '../componentes/configuracoessection'

type Aba =
  | 'visao'
  | 'agenda'
  | 'clientes'
  | 'servicos'
  | 'ganhos'
  | 'configuracoes'
  | 'ajuda'

type Assinatura = {
  plan: string | null
  status: string | null
  current_period_end: string | null
}

type Configuracao = {
  nome_negocio: string | null
  logo_url: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [carregandoPagina, setCarregandoPagina] = useState(true)
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null)

  const [abaAtual, setAbaAtual] = useState<Aba>('visao')
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  function formatarDataAssinatura(data?: string | null) {
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

      const userId = session.user.id

      const { data: assinaturaData } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', userId)
        .maybeSingle()

      if (!assinaturaData || assinaturaData.status !== 'active') {
        router.replace('/subscribe')
        return
      }

      const { data: configData } = await supabase
        .from('Configuracoes')
        .select('nome_negocio, logo_url')
        .eq('user_id', userId)
        .maybeSingle()

      setAssinatura(assinaturaData as Assinatura)
      setConfiguracao((configData as Configuracao) || null)
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
    if (abaAtual === 'visao') return <VisaoGeralSection />
    if (abaAtual === 'agenda') return <AgendaSection />
    if (abaAtual === 'clientes') return <ClientesSection />
    if (abaAtual === 'servicos') return <ServicosSection />
    if (abaAtual === 'ganhos') return <GanhosSection />
    if (abaAtual === 'configuracoes') return <ConfiguracoesSection />

    return (
      <div>
        <h1>❓ Ajuda</h1>
        <p style={{ color: '#b4b4b4' }}>
          Central de ajuda, dúvidas frequentes e suporte.
        </p>
      </div>
    )
  }

  if (carregandoPagina) {
    return <main style={loadingStyle}>Carregando...</main>
  }

  return (
    <main style={mainStyle}>
      {isMobile && sidebarAberta && (
        <div onClick={() => setSidebarAberta(false)} style={overlayStyle} />
      )}

      <aside
        style={{
          ...sidebarStyle,
          position: isMobile ? 'fixed' : 'sticky',
          left: isMobile ? (sidebarAberta ? 0 : '-100%') : 0,
        }}
      >
        <div>
          <div style={brandStyle}>
            {configuracao?.logo_url ? (
              <img
                src={configuracao.logo_url}
                alt="Logo do negócio"
                style={brandLogoStyle}
              />
            ) : (
              <div style={brandFallbackStyle}>💅</div>
            )}

            <div>
              <strong style={brandNameStyle}>
                {configuracao?.nome_negocio || 'Lash SaaS'}
              </strong>
              <p style={brandSubStyle}>Painel profissional</p>
            </div>
          </div>

          <nav style={navStyle}>
            {menu.map((item) => {
              const ativo = abaAtual === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => trocarAba(item.id)}
                  style={{
                    ...menuButtonStyle,
                    background: ativo ? 'rgba(217,70,239,0.18)' : 'transparent',
                    border: ativo ? '1px solid #d946ef' : '1px solid transparent',
                    color: ativo ? '#fff' : '#d4d4d4',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div style={bottomBoxStyle}>
          <div style={planCardStyle}>
            <p style={planTextStyle}>
              <strong>Plano:</strong> {assinatura?.plan || 'basic'}
            </p>

            <p style={planTextStyle}>
              <strong>Status:</strong>{' '}
              {assinatura?.status === 'active' ? 'Ativo' : assinatura?.status || '-'}
            </p>

            <p style={planTextStyle}>
              <strong>Vence:</strong>{' '}
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
          <button onClick={() => setSidebarAberta(true)} style={mobileButtonStyle}>
            ☰ Menu
          </button>
        )}

        <div style={contentInnerStyle}>{renderConteudo()}</div>
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
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  zIndex: 998,
}

const sidebarStyle: React.CSSProperties = {
  top: 0,
  height: '100vh',
  width: '280px',
  minWidth: '280px',
  background: 'rgba(17,17,17,0.98)',
  borderRight: '1px solid #242424',
  padding: '22px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  zIndex: 999,
  overflowY: 'auto',
  boxShadow: '12px 0 40px rgba(0,0,0,0.35)',
  transition: 'left 0.25s ease',
}

const brandStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '28px',
}

const brandLogoStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '1px solid #333',
}

const brandFallbackStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  background: '#27272a',
  display: 'grid',
  placeItems: 'center',
}

const brandNameStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '16px',
  lineHeight: 1.2,
}

const brandSubStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: '#a1a1aa',
  fontSize: '12px',
}

const navStyle: React.CSSProperties = {
  display: 'grid',
  gap: '8px',
}

const menuButtonStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '13px 14px',
  borderRadius: '14px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 800,
}

const bottomBoxStyle: React.CSSProperties = {
  marginTop: '24px',
}

const planCardStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #1b1b1b 0%, #151515 100%)',
  padding: '16px',
  borderRadius: '16px',
  fontSize: '14px',
  border: '1px solid #2f2f2f',
  marginBottom: '12px',
}

const planTextStyle: React.CSSProperties = {
  margin: '0 0 8px',
  lineHeight: 1.4,
}

const logoutButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  borderRadius: '14px',
  border: 'none',
  background: '#27272a',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  minHeight: '100vh',
  padding: '26px',
  overflowX: 'hidden',
}

const contentInnerStyle: React.CSSProperties = {
  maxWidth: '1180px',
  margin: '0 auto',
}

const mobileButtonStyle: React.CSSProperties = {
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