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
    if (abaAtual === 'visao') return <VisaoGeralSection />
    if (abaAtual === 'agenda') return <AgendaSection />
    if (abaAtual === 'clientes') return <ClientesSection />
    if (abaAtual === 'servicos') return <ServicosSection />
    if (abaAtual === 'ganhos') return <GanhosSection />
    if (abaAtual === 'configuracoes') return <ConfiguracoesSection />

    const titulo = menu.find((item) => item.id === abaAtual)?.label

    const textos: Record<Aba, string> = {
      visao: 'Resumo do seu negócio.',
      agenda: 'Gerencie seus horários.',
      clientes: 'Gerencie seus clientes.',
      servicos: 'Gerencie seus serviços.',
      ganhos: 'Controle financeiro.',
      configuracoes: 'Configurações da conta.',
      ajuda: 'Central de ajuda.',
    }

    return (
      <div>
        <h1>{titulo}</h1>
        <p style={{ color: '#b4b4b4' }}>{textos[abaAtual]}</p>
      </div>
    )
  }

  if (carregandoPagina) {
    return <main style={loadingStyle}>Carregando...</main>
  }

  return (
    <main style={mainStyle}>
      {isMobile && sidebarAberta && (
        <div
          onClick={() => setSidebarAberta(false)}
          style={overlayStyle}
        />
      )}

      <aside style={sidebarStyle}>
        <div>
          <h2>💅 Lash SaaS</h2>

          <nav>
            {menu.map((item) => (
              <button
                key={item.id}
                onClick={() => trocarAba(item.id)}
                style={{
                  ...menuButtonStyle,
                  background:
                    abaAtual === item.id ? '#2a1230' : 'transparent',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <p>Plano: {assinatura?.plan}</p>
          <p>Status: {assinatura?.status}</p>
          <p>Vence: {formatarDataAssinatura(assinatura?.current_period_end)}</p>

          <button onClick={sair}>Sair</button>
        </div>
      </aside>

      <section style={contentStyle}>
        {isMobile && (
          <button onClick={() => setSidebarAberta(true)}>
            ☰ Menu
          </button>
        )}

        {renderConteudo()}
      </section>
    </main>
  )
}

const mainStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: '#0b0b0b',
  color: 'white',
}

const sidebarStyle: React.CSSProperties = {
  width: '260px',
  padding: '20px',
  background: '#111',
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: '20px',
}

const loadingStyle: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  height: '100vh',
  background: '#0b0b0b',
  color: 'white',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
}

const menuButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px',
  color: 'white',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
}