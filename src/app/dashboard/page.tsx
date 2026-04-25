'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  // DETECTA MOBILE
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

  const menu = [
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
    return (
      <>
        <h1>{menu.find((m) => m.id === abaAtual)?.label}</h1>
        <p>Conteúdo da aba {abaAtual}</p>
      </>
    )
  }

  if (carregandoPagina) {
    return <div style={{ color: 'white' }}>Carregando...</div>
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', background: '#0b0b0b', color: 'white' }}>
      
      {/* SIDEBAR */}
      <aside
        style={{
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? (sidebarAberta ? 0 : '-100%') : 0,
          top: 0,
          height: '100vh',
          width: '260px',
          background: '#111',
          padding: '20px',
          transition: '0.3s',
          zIndex: 1000,
        }}
      >
        <button onClick={() => setSidebarAberta(false)}>Fechar</button>

        {menu.map((item) => (
          <div key={item.id} onClick={() => trocarAba(item.id as Aba)}>
            {item.label}
          </div>
        ))}

        <div>
          <p>Plano: {assinatura?.plan}</p>
          <p>Status: {assinatura?.status}</p>
          <p>Vence: {formatarDataAssinatura(assinatura?.current_period_end)}</p>
        </div>

        <button onClick={sair}>Sair</button>
      </aside>

      {/* OVERLAY */}
      {isMobile && sidebarAberta && (
        <div
          onClick={() => setSidebarAberta(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
          }}
        />
      )}

      {/* CONTEÚDO */}
      <section style={{ flex: 1, padding: '20px' }}>
        
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