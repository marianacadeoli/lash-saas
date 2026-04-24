'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Cliente = {
  id: number
  nome: string
  telefone: string
  user_id?: string
}

type Servico = {
  id: number
  nome: string
  valor: number
  duracao?: number | null
  user_id?: string
}

type AgendamentoBanco = {
  id: number
  cliente_id: number
  servico_id: number | null
  data: string
  valor: number
  status: string
  user_id?: string
}

type Agendamento = AgendamentoBanco & {
  cliente_nome: string
  servico_nome: string
}

type FiltroStatus = 'todos' | 'agendado' | 'feito' | 'cancelado'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [carregandoPagina, setCarregandoPagina] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarFormularioServico, setMostrarFormularioServico] = useState(false)

  const [modoEdicao, setModoEdicao] = useState(false)
  const [agendamentoEditandoId, setAgendamentoEditandoId] = useState<number | null>(null)

  const [clienteId, setClienteId] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [data, setData] = useState('')
  const [valor, setValor] = useState('')
  const [status, setStatus] = useState('agendado')

  const [novoServicoNome, setNovoServicoNome] = useState('')
  const [novoServicoValor, setNovoServicoValor] = useState('')
  const [novoServicoDuracao, setNovoServicoDuracao] = useState('')

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')

  const hoje = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth())
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear())

  const nomesMeses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]

  // 🔥 PROTEÇÃO + TRIAL + ASSINATURA
  useEffect(() => {
    async function carregarUsuario() {
   const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.replace('/login')
      return
    }

    const usuarioId = session.user.id

    const { data: assinatura, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', usuarioId)
      .maybeSingle()

    if (error) {
      console.log('ERRO AO BUSCAR ASSINATURA:', error)
      router.replace('/subscribe')
      return
    }

    if (!assinatura) {
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 7)

      const { error: insertError } = await supabase.from('subscriptions').insert({
        user_id: usuarioId,
        status: 'trial',
        plan: 'basic',
        trial_ends_at: trialEndsAt.toISOString(),
      })

      if (insertError) {
        console.log('ERRO AO CRIAR TRIAL:', insertError)
        router.replace('/subscribe')
        return
      }

      setUserId(usuarioId)
      setCarregandoPagina(false)
      return
    }

    const trialValido =
      assinatura.status === 'trial' &&
      assinatura.trial_ends_at &&
      new Date(assinatura.trial_ends_at) > new Date()

    const assinaturaAtiva = assinatura.status === 'active'

    if (!assinaturaAtiva && !trialValido) {
      router.replace('/subscribe')
      return
    }

    setUserId(usuarioId)
    setCarregandoPagina(false)
  }

  carregarUsuario()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      router.replace('/login')
    }
  })

  return () => {
    subscription.unsubscribe()
  }
}, [router, supabase])

  // 🔽 RESTO DO CÓDIGO (NÃO MUDA)

  async function buscarDados(usuarioId: string) {
    const { data: agData } = await supabase
      .from('Agendamentos')
      .select('*')
      .eq('user_id', usuarioId)

    const { data: clData } = await supabase
      .from('Clientes')
      .select('*')
      .eq('user_id', usuarioId)

    const { data: svData } = await supabase
      .from('Servicos')
      .select('*')
      .eq('user_id', usuarioId)

    if (clData) setClientes(clData)
    if (svData) setServicos(svData)

    if (agData && clData && svData) {
      const lista = agData.map((ag: any) => {
        const cliente = clData.find((c: any) => c.id === ag.cliente_id)
        const servico = svData.find((s: any) => s.id === ag.servico_id)

        return {
          ...ag,
          cliente_nome: cliente?.nome || '',
          servico_nome: servico?.nome || '',
        }
      })

      setAgendamentos(lista)
    }
  }

  useEffect(() => {
    if (userId) buscarDados(userId)
  }, [userId])

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (carregandoPagina) {
    return <div style={{ color: 'white' }}>Carregando...</div>
  }

  return (
    <div style={{ color: 'white', padding: 20 }}>
      <h1>Dashboard Lash 💅</h1>

      <button onClick={sair}>Sair</button>

      <p>Bem-vinda ao sistema</p>
    </div>
  )
}