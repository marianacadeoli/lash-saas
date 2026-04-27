'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Cliente = {
  id: number
  nome: string
  telefone: string
}

type Servico = {
  id: number
  nome: string
  valor: number
  duracao: number
}

type Agendamento = {
  id: number
  cliente_id: number
  servico_id: number
  data: string
  hora_inicio: string
  hora_fim: string
  valor: number
  status: string
  user_id: string
  Clientes?: Cliente
  Servicos?: Servico
}

export default function AgendaSection() {
  const supabase = createClient()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])

  const [clienteId, setClienteId] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [data, setData] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [status, setStatus] = useState('agendado')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  async function carregarDados() {
    const userId = await pegarUserId()
    if (!userId) return

    const { data: clientesData } = await supabase
      .from('Clientes')
      .select('id, nome, telefone')
      .eq('user_id', userId)
      .order('nome', { ascending: true })

    const { data: servicosData } = await supabase
      .from('Servicos')
      .select('id, nome, valor, duracao')
      .eq('user_id', userId)
      .order('nome', { ascending: true })

    const { data: agendamentosData, error } = await supabase
      .from('Agendamentos')
      .select(`
        *,
        Clientes (
          id,
          nome,
          telefone
        ),
        Servicos (
          id,
          nome,
          valor,
          duracao
        )
      `)
      .eq('user_id', userId)
      .order('data', { ascending: true })
      .order('hora_inicio', { ascending: true })

    if (error) {
      console.log('ERRO AO CARREGAR AGENDAMENTOS:', error)
    }

    setClientes(clientesData || [])
    setServicos(servicosData || [])
    setAgendamentos((agendamentosData as Agendamento[]) || [])
  }

  const servicoSelecionado = useMemo(() => {
    return servicos.find((servico) => String(servico.id) === servicoId)
  }, [servicos, servicoId])

  function calcularHoraFim(hora: string, duracaoMinutos?: number) {
    if (!hora || !duracaoMinutos) return ''

    const [horas, minutos] = hora.split(':').map(Number)
    const dataBase = new Date()
    dataBase.setHours(horas)
    dataBase.setMinutes(minutos)
    dataBase.setSeconds(0)

    dataBase.setMinutes(dataBase.getMinutes() + duracaoMinutos)

    const horaFinal = String(dataBase.getHours()).padStart(2, '0')
    const minutoFinal = String(dataBase.getMinutes()).padStart(2, '0')

    return `${horaFinal}:${minutoFinal}`
  }

  const horaFim = calcularHoraFim(horaInicio, servicoSelecionado?.duracao)

  async function salvarAgendamento() {
    const userId = await pegarUserId()
    if (!userId) return

    if (!clienteId || !servicoId || !data || !horaInicio) {
      alert('Preencha cliente, serviço, data e horário.')
      return
    }

    if (!servicoSelecionado) {
      alert('Serviço inválido.')
      return
    }

    setCarregando(true)

    const { error } = await supabase.from('Agendamentos').insert({
      cliente_id: Number(clienteId),
      servico_id: Number(servicoId),
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      valor: servicoSelecionado.valor,
      status,
      user_id: userId,
    })

    if (error) {
      console.log('ERRO AO SALVAR AGENDAMENTO:', error)
      alert('Erro ao salvar agendamento.')
      setCarregando(false)
      return
    }

    setClienteId('')
    setServicoId('')
    setData('')
    setHoraInicio('')
    setStatus('agendado')

    await carregarDados()
    setCarregando(false)
  }

  async function alterarStatus(id: number, novoStatus: string) {
    const userId = await pegarUserId()
    if (!userId) return

    const { error } = await supabase
      .from('Agendamentos')
      .update({ status: novoStatus })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      alert('Erro ao alterar status.')
      return
    }

    await carregarDados()
  }

  async function excluirAgendamento(id: number) {
    const confirmou = confirm('Deseja excluir este agendamento?')
    if (!confirmou) return

    const userId = await pegarUserId()
    if (!userId) return

    const { error } = await supabase
      .from('Agendamentos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      alert('Erro ao excluir agendamento.')
      return
    }

    await carregarDados()
  }

  function formatarData(dataIso: string) {
    return new Date(dataIso + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  return (
    <div>
    <h1 style={{ margin: 0, marginBottom: '8px' }}>Agenda</h1>

      <p style={subtitleStyle}>
        Cadastre atendimentos usando cliente, serviço, valor e duração automática.
      </p>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Novo agendamento</h2>

        <div style={gridStyle}>
          <select
            style={inputStyle}
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Selecione a cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>

          <select
            style={inputStyle}
            value={servicoId}
            onChange={(e) => setServicoId(e.target.value)}
          >
            <option value="">Selecione o serviço</option>
            {servicos.map((servico) => (
              <option key={servico.id} value={servico.id}>
                {servico.nome} — R$ {servico.valor} — {servico.duracao} min
              </option>
            ))}
          </select>

          <input
            style={inputStyle}
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />

          <input
            style={inputStyle}
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
          />

          <select
            style={inputStyle}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="agendado">Agendado</option>
            <option value="feito">Feito</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {servicoSelecionado && horaInicio && (
          <p style={{ color: '#b4b4b4' }}>
            Esse atendimento vai de <strong>{horaInicio}</strong> até{' '}
            <strong>{horaFim}</strong>.
          </p>
        )}

        <button style={buttonStyle} onClick={salvarAgendamento} disabled={carregando}>
          {carregando ? 'Salvando...' : 'Salvar agendamento'}
        </button>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Agendamentos</h2>

        {agendamentos.length === 0 ? (
          <p style={subtitleStyle}>Nenhum agendamento cadastrado.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {agendamentos.map((agendamento) => (
              <div key={agendamento.id} style={appointmentCardStyle}>
                <div>
                  <strong style={{ fontSize: '18px' }}>
                    {formatarData(agendamento.data)} — {agendamento.hora_inicio} até{' '}
                    {agendamento.hora_fim}
                  </strong>

                  <p style={mutedTextStyle}>
                    {agendamento.Clientes?.nome || 'Cliente'}
                  </p>

                  <p style={mutedTextStyle}>
                    {agendamento.Servicos?.nome || 'Serviço'} — R${' '}
                    {Number(agendamento.valor).toFixed(2)}
                  </p>

                  <p style={mutedTextStyle}>Status: {agendamento.status}</p>
                </div>

                <div style={actionsStyle}>
                  <button
                    style={secondaryButtonStyle}
                    onClick={() => alterarStatus(agendamento.id, 'feito')}
                  >
                    Feito
                  </button>

                  <button
                    style={secondaryButtonStyle}
                    onClick={() => alterarStatus(agendamento.id, 'cancelado')}
                  >
                    Cancelar
                  </button>

                  <button
                    style={dangerButtonStyle}
                    onClick={() => excluirAgendamento(agendamento.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const subtitleStyle: React.CSSProperties = {
  color: '#b4b4b4',
  lineHeight: 1.6,
}

const cardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: '18px',
  padding: '18px',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: '14px',
  border: '1px solid #333',
  background: '#0f0f0f',
  color: 'white',
  fontSize: '15px',
}

const buttonStyle: React.CSSProperties = {
  marginTop: '14px',
  padding: '13px 16px',
  borderRadius: '14px',
  border: 'none',
  background: '#d946ef',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}

const appointmentCardStyle: React.CSSProperties = {
  background: '#151515',
  border: '1px solid #2a2a2a',
  borderRadius: '16px',
  padding: '16px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap',
}

const mutedTextStyle: React.CSSProperties = {
  color: '#b4b4b4',
  margin: '6px 0',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  alignItems: 'center',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid #333',
  background: '#27272a',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}

const dangerButtonStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '12px',
  border: 'none',
  background: '#dc2626',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}