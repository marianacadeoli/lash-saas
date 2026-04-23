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
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  useEffect(() => {
    async function carregarUsuario() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      setUserId(session.user.id)
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

  async function buscarDados(usuarioId: string) {
    const { data: agData, error: agError } = await supabase
      .from('Agendamentos')
      .select('*')
      .eq('user_id', usuarioId)
      .order('data', { ascending: true })

    const { data: clData, error: clError } = await supabase
      .from('Clientes')
      .select('id, nome, telefone, user_id')
      .eq('user_id', usuarioId)
      .order('nome', { ascending: true })

    const { data: svData, error: svError } = await supabase
      .from('Servicos')
      .select('*')
      .eq('user_id', usuarioId)
      .order('nome', { ascending: true })

    console.log('AGENDAMENTOS:', agData)
    console.log('CLIENTES:', clData)
    console.log('SERVICOS:', svData)
    console.log('AG_ERROR:', agError)
    console.log('CL_ERROR:', clError)
    console.log('SV_ERROR:', svError)

    if (clData) setClientes(clData)
    if (svData) setServicos(svData)

    if (agData && clData && svData) {
      const agendamentosComRelacoes: Agendamento[] = agData.map((ag: AgendamentoBanco) => {
        const cliente = clData.find((cl) => cl.id === ag.cliente_id)
        const servico = svData.find((sv) => sv.id === ag.servico_id)

        return {
          ...ag,
          cliente_nome: cliente?.nome || 'Cliente não encontrado',
          servico_nome: servico?.nome || 'Serviço não encontrado',
        }
      })

      setAgendamentos(agendamentosComRelacoes)
    } else {
      setAgendamentos([])
    }
  }

  useEffect(() => {
    if (!userId) return
    buscarDados(userId)
  }, [userId])

  const limparFormulario = () => {
    setClienteId('')
    setServicoId('')
    setData('')
    setValor('')
    setStatus('agendado')
    setModoEdicao(false)
    setAgendamentoEditandoId(null)
  }

  const abrirNovoFormulario = () => {
    limparFormulario()
    setMostrarFormulario(true)
  }

  const fecharFormulario = () => {
    limparFormulario()
    setMostrarFormulario(false)
  }

  const fecharFormularioServico = () => {
    setNovoServicoNome('')
    setNovoServicoValor('')
    setNovoServicoDuracao('')
    setMostrarFormularioServico(false)
  }

  const formatarData = (valorData: string) => {
    return new Date(valorData).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const formatarInputDateTimeLocal = (valorData: string) => {
    const d = new Date(valorData)
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    const hora = String(d.getHours()).padStart(2, '0')
    const minuto = String(d.getMinutes()).padStart(2, '0')

    return `${ano}-${mes}-${dia}T${hora}:${minuto}`
  }

  const selecionarServico = (id: string) => {
    setServicoId(id)

    const servico = servicos.find((s) => s.id === Number(id))
    if (servico) {
      setValor(String(servico.valor))
    }
  }

  const enviarLembreteWhatsApp = (item: Agendamento) => {
    const cliente = clientes.find((c) => c.id === item.cliente_id)

    if (!cliente?.telefone) {
      alert('Telefone da cliente não encontrado.')
      return
    }

    const dataFormatada = new Date(item.data).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

    const mensagem = `Oi, ${cliente.nome}! Passando para lembrar do seu agendamento de ${item.servico_nome} no dia ${dataFormatada}. 💅`
    const telefoneLimpo = cliente.telefone.replace(/\D/g, '')
    const url = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`

    window.open(url, '_blank')
  }

  const validarFormulario = () => {
    if (!clienteId || !servicoId || !data || !valor || !status) {
      alert('Preencha todos os campos.')
      return false
    }

    if (Number(valor) <= 0) {
      alert('Digite um valor maior que zero.')
      return false
    }

    const agora = new Date()
    const dataEscolhida = new Date(data)

    if (!modoEdicao && dataEscolhida < agora) {
      alert('Escolha uma data e horário futuros.')
      return false
    }

    return true
  }

  const salvarAgendamento = async () => {
    if (!validarFormulario()) return
    if (!userId) return

    const payload = {
      cliente_id: Number(clienteId),
      servico_id: Number(servicoId),
      data,
      valor: Number(valor),
      status,
      user_id: userId,
    }

    if (modoEdicao && agendamentoEditandoId) {
      const { error } = await supabase
        .from('Agendamentos')
        .update(payload)
        .eq('id', agendamentoEditandoId)
        .eq('user_id', userId)

      if (error) {
        console.log('ERRO UPDATE:', error)
        alert('Erro ao atualizar agendamento.')
        return
      }

      await buscarDados(userId)
      fecharFormulario()
      alert('Agendamento atualizado com sucesso!')
      return
    }

    const { error } = await supabase.from('Agendamentos').insert([payload])

    if (error) {
      console.log('ERRO INSERT:', error)
      alert('Erro ao salvar agendamento.')
      return
    }

    await buscarDados(userId)
    fecharFormulario()
    alert('Agendamento salvo com sucesso!')
  }

  const salvarServico = async () => {
    if (!novoServicoNome || !novoServicoValor) {
      alert('Preencha nome e valor do serviço.')
      return
    }

    if (Number(novoServicoValor) <= 0) {
      alert('Digite um valor maior que zero.')
      return
    }

    if (!userId) return

    const payload = {
      nome: novoServicoNome,
      valor: Number(novoServicoValor),
      duracao: novoServicoDuracao ? Number(novoServicoDuracao) : null,
      user_id: userId,
    }

    const { error } = await supabase.from('Servicos').insert([payload])

    if (error) {
      console.log('ERRO SERVICO:', error)
      alert('Erro ao salvar serviço.')
      return
    }

    await buscarDados(userId)
    fecharFormularioServico()
    alert('Serviço cadastrado com sucesso!')
  }

  const atualizarStatus = async (
    id: number,
    novoStatus: 'feito' | 'cancelado' | 'agendado'
  ) => {
    if (!userId) return

    const { error } = await supabase
      .from('Agendamentos')
      .update({ status: novoStatus })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.log('UPDATE STATUS ERROR:', error)
      alert('Erro ao atualizar status.')
      return
    }

    await buscarDados(userId)
  }

  const excluirAgendamento = async (id: number) => {
    if (!userId) return

    const confirmou = window.confirm('Tem certeza que deseja excluir este agendamento?')
    if (!confirmou) return

    const { error } = await supabase
      .from('Agendamentos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.log('ERRO DELETE:', error)
      alert('Erro ao excluir agendamento.')
      return
    }

    await buscarDados(userId)
    alert('Agendamento excluído com sucesso!')
  }

  const editarAgendamento = (item: Agendamento) => {
    setModoEdicao(true)
    setAgendamentoEditandoId(item.id)
    setClienteId(String(item.cliente_id))
    setServicoId(String(item.servico_id ?? ''))
    setData(formatarInputDateTimeLocal(item.data))
    setValor(String(item.valor))
    setStatus(item.status)
    setMostrarFormulario(true)
  }

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const agendamentosFiltradosPorStatus = useMemo(() => {
    if (filtroStatus === 'todos') return agendamentos
    return agendamentos.filter((item) => item.status === filtroStatus)
  }, [agendamentos, filtroStatus])

  const agendamentosDoMes = useMemo(() => {
    return agendamentosFiltradosPorStatus.filter((item) => {
      const dataItem = new Date(item.data)
      return dataItem.getMonth() === mesSelecionado && dataItem.getFullYear() === anoSelecionado
    })
  }, [agendamentosFiltradosPorStatus, mesSelecionado, anoSelecionado])

  const agora = new Date()

  const proximosAgendamentos = agendamentosDoMes.filter(
    (item) => new Date(item.data) >= agora && item.status === 'agendado'
  )

  const historicoAgendamentos = agendamentosDoMes.filter(
    (item) =>
      new Date(item.data) < agora ||
      item.status === 'feito' ||
      item.status === 'cancelado'
  )

  const ganhosMes = agendamentos
    .filter((item) => {
      const dataItem = new Date(item.data)
      return (
        item.status === 'feito' &&
        dataItem.getMonth() === mesSelecionado &&
        dataItem.getFullYear() === anoSelecionado
      )
    })
    .reduce((total, item) => total + Number(item.valor), 0)

  const totalMes = agendamentos.filter((item) => {
    const dataItem = new Date(item.data)
    return dataItem.getMonth() === mesSelecionado && dataItem.getFullYear() === anoSelecionado
  }).length

  const totalFuturos = agendamentos.filter(
    (item) =>
      new Date(item.data) >= agora &&
      item.status === 'agendado' &&
      new Date(item.data).getMonth() === mesSelecionado &&
      new Date(item.data).getFullYear() === anoSelecionado
  ).length

  const totalFeitos = agendamentosDoMes
    .filter((item) => item.status === 'feito')
    .reduce((total, item) => total + Number(item.valor), 0)

  const totalAgendados = agendamentosDoMes
    .filter((item) => item.status === 'agendado')
    .reduce((total, item) => total + Number(item.valor), 0)

  const totalCancelados = agendamentosDoMes
    .filter((item) => item.status === 'cancelado')
    .reduce((total, item) => total + Number(item.valor), 0)

  const maiorBarra = Math.max(totalFeitos, totalAgendados, totalCancelados, 1)

  const renderBarra = (label: string, valorBarra: number, cor: string) => (
    <div style={{ marginBottom: '14px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px',
          fontSize: '14px',
        }}
      >
        <span>{label}</span>
        <strong>R$ {valorBarra}</strong>
      </div>

      <div
        style={{
          width: '100%',
          height: '12px',
          background: '#222',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(valorBarra / maiorBarra) * 100}%`,
            height: '100%',
            background: cor,
            borderRadius: '999px',
          }}
        />
      </div>
    </div>
  )

  const renderCard = (item: Agendamento, mostrarAcoes: boolean = false) => (
    <div
      key={item.id}
      style={{
        border: '1px solid #2a2a2a',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        background: '#141414',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <strong style={{ fontSize: '22px' }}>{item.cliente_nome}</strong>
          <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>
            Serviço: {item.servico_nome}
          </p>
          <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>
            Data: {formatarData(item.data)}
          </p>
        </div>

        <span
          style={{
            background:
              item.status === 'agendado'
                ? '#2563eb'
                : item.status === 'feito'
                ? '#16a34a'
                : '#dc2626',
            padding: '6px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          {item.status}
        </span>
      </div>

      <p><strong>Valor:</strong> R$ {item.valor}</p>
      <p><strong>ID:</strong> {item.id}</p>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginTop: '16px',
        }}
      >
        <button
          onClick={() => editarAgendamento(item)}
          style={{
            background: '#9333ea',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 14px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Editar
        </button>

        <button
          onClick={() => enviarLembreteWhatsApp(item)}
          style={{
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 14px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Lembrete
        </button>

        {mostrarAcoes && (
          <>
            <button
              onClick={() => atualizarStatus(item.id, 'feito')}
              style={{
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Concluir
            </button>

            <button
              onClick={() => atualizarStatus(item.id, 'cancelado')}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Cancelar
            </button>
          </>
        )}

        {!mostrarAcoes && item.status !== 'agendado' && (
          <button
            onClick={() => atualizarStatus(item.id, 'agendado')}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Reabrir
          </button>
        )}

        <button
          onClick={() => excluirAgendamento(item.id)}
          style={{
            background: '#3f3f46',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 14px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Excluir
        </button>
      </div>
    </div>
  )

  if (carregandoPagina) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0b0b0b',
          color: '#fff',
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
        background: '#0b0b0b',
        color: 'white',
        padding: '32px 20px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <h1 style={{ fontSize: '32px', margin: 0 }}>Agenda da Lash 💅</h1>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={abrirNovoFormulario}
              style={{
                background: '#d946ef',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 16px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              + Novo agendamento
            </button>

            <button
              onClick={() => setMostrarFormularioServico(true)}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 16px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              + Novo serviço
            </button>

            <button
              onClick={sair}
              style={{
                background: '#27272a',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 16px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Sair
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '24px',
          }}
        >
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(Number(e.target.value))}
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: '#141414',
              color: 'white',
              border: '1px solid #333',
            }}
          >
            {nomesMeses.map((mes, index) => (
              <option key={mes} value={index}>
                {mes}
              </option>
            ))}
          </select>

          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(Number(e.target.value))}
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: '#141414',
              color: 'white',
              border: '1px solid #333',
            }}
          >
            {[2025, 2026, 2027, 2028].map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>

          {(['todos', 'agendado', 'feito', 'cancelado'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFiltroStatus(item)}
              style={{
                background: filtroStatus === item ? '#d946ef' : '#1f1f1f',
                color: 'white',
                border: '1px solid #333',
                borderRadius: '999px',
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '18px' }}>
            <p style={{ margin: 0, opacity: 0.7 }}>Agendamentos do mês</p>
            <h2 style={{ margin: '8px 0 0 0' }}>{totalMes}</h2>
          </div>

          <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '18px' }}>
            <p style={{ margin: 0, opacity: 0.7 }}>Ganhos do mês</p>
            <h2 style={{ margin: '8px 0 0 0' }}>R$ {ganhosMes}</h2>
          </div>

          <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '18px' }}>
            <p style={{ margin: 0, opacity: 0.7 }}>Próximos</p>
            <h2 style={{ margin: '8px 0 0 0' }}>{totalFuturos}</h2>
          </div>
        </div>

        <div
          style={{
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '18px' }}>
            Faturamento do mês — {nomesMeses[mesSelecionado]}
          </h2>

          {renderBarra('Feito', totalFeitos, '#16a34a')}
          {renderBarra('Agendado', totalAgendados, '#2563eb')}
          {renderBarra('Cancelado', totalCancelados, '#dc2626')}
        </div>

        {mostrarFormularioServico && (
          <div
            style={{
              border: '1px solid #2a2a2a',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              background: '#141414',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <h2 style={{ margin: 0 }}>Novo serviço</h2>

              <button
                onClick={fecharFormularioServico}
                style={{
                  background: '#27272a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <input
                type="text"
                placeholder="Nome do serviço"
                value={novoServicoNome}
                onChange={(e) => setNovoServicoNome(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              />

              <input
                type="number"
                placeholder="Valor padrão"
                value={novoServicoValor}
                onChange={(e) => setNovoServicoValor(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              />

              <input
                type="number"
                placeholder="Duração em minutos (opcional)"
                value={novoServicoDuracao}
                onChange={(e) => setNovoServicoDuracao(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              />

              <button
                onClick={salvarServico}
                style={{
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Salvar serviço
              </button>
            </div>
          </div>
        )}

        {mostrarFormulario && (
          <div
            style={{
              border: '1px solid #2a2a2a',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              background: '#141414',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <h2 style={{ margin: 0 }}>
                {modoEdicao ? 'Editar agendamento' : 'Novo agendamento'}
              </h2>

              <button
                onClick={fecharFormulario}
                style={{
                  background: '#27272a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              >
                <option value="">Selecione a cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>

              <select
                value={servicoId}
                onChange={(e) => selecionarServico(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              >
                <option value="">Selecione o serviço</option>
                {servicos.map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {servico.nome} - R$ {servico.valor}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={data}
                onChange={(e) => setData(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              />

              <input
                type="number"
                placeholder="Valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              >
                <option value="agendado">agendado</option>
                <option value="feito">feito</option>
                <option value="cancelado">cancelado</option>
              </select>

              <button
                onClick={salvarAgendamento}
                style={{
                  background: modoEdicao ? '#2563eb' : '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {modoEdicao ? 'Atualizar agendamento' : 'Salvar agendamento'}
              </button>
            </div>
          </div>
        )}

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '16px' }}>Próximos agendamentos</h2>
          {proximosAgendamentos.length === 0 ? (
            <p style={{ opacity: 0.7 }}>Nenhum agendamento futuro.</p>
          ) : (
            proximosAgendamentos.map((item) => renderCard(item, true))
          )}
        </section>

        <section>
          <h2 style={{ marginBottom: '16px' }}>Histórico</h2>
          {historicoAgendamentos.length === 0 ? (
            <p style={{ opacity: 0.7 }}>Nenhum agendamento no histórico.</p>
          ) : (
            historicoAgendamentos.map((item) => renderCard(item, false))
          )}
        </section>
      </div>
    </main>
  )
}