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
  const hoje = new Date().toLocaleDateString('sv-SE')

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])

  const [clienteId, setClienteId] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [data, setData] = useState(hoje)
  const [horaInicio, setHoraInicio] = useState('')
  const [status, setStatus] = useState('agendado')
  const [carregando, setCarregando] = useState(false)
  const [agora, setAgora] = useState(new Date())

  const [dataSelecionada, setDataSelecionada] = useState(hoje)
  const [mesAtual, setMesAtual] = useState(new Date())

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    const intervalo = setInterval(() => {
      setAgora(new Date())
    }, 30000)

    return () => clearInterval(intervalo)
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

  const agendamentosDoDia = agendamentos.filter(
    (item) => item.data === dataSelecionada
  )

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

  function podeMarcarFeito(agendamento: Agendamento) {
    const fim = new Date(`${agendamento.data}T${agendamento.hora_fim}`)
    return agora >= fim
  }

  function temMesmoHorario(agendamento: Agendamento) {
    return agendamentos.some(
      (item) =>
        item.id !== agendamento.id &&
        item.data === agendamento.data &&
        item.hora_inicio === agendamento.hora_inicio &&
        item.status !== 'cancelado'
    )
  }

  function formatarStatus(status: string) {
    const s = status?.trim().toLowerCase() || ''
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  function corStatus(status: string) {
    const s = status?.trim().toLowerCase() || ''

    if (s === 'feito') return '#22c55e'
    if (s === 'cancelado') return '#ef4444'
    if (s === 'agendado') return '#eab308'

    return '#b4b4b4'
  }

  function formatarData(dataIso: string) {
    return new Date(dataIso + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  function mudarMes(direcao: 'anterior' | 'proximo') {
    const novaData = new Date(mesAtual)

    if (direcao === 'anterior') {
      novaData.setMonth(novaData.getMonth() - 1)
    } else {
      novaData.setMonth(novaData.getMonth() + 1)
    }

    setMesAtual(novaData)
  }

  function selecionarDia(dataIso: string) {
    setDataSelecionada(dataIso)
    setData(dataIso)
  }

  function gerarDiasCalendario() {
    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()

    const primeiroDiaMes = new Date(ano, mes, 1)
    const ultimoDiaMes = new Date(ano, mes + 1, 0)

    const dias: (string | null)[] = []
    const diaSemanaInicio = primeiroDiaMes.getDay()

    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push(null)
    }

    for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
      const dataDia = new Date(ano, mes, dia).toLocaleDateString('sv-SE')
      dias.push(dataDia)
    }

    return dias
  }

  function contarAgendamentosDoDia(dataIso: string) {
    return agendamentos.filter(
      (item) => item.data === dataIso && item.status !== 'cancelado'
    ).length
  }

  async function salvarAgendamento() {
    const userId = await pegarUserId()
    if (!userId) return

    if (!clienteId || !servicoId || !data || !horaInicio) {
      alert('Preencha cliente, serviço, data e horário.')
      return
    }

    if (data < hoje) {
      alert('Não é possível criar agendamento em uma data passada.')
      return
    }

    if (!servicoSelecionado) {
      alert('Serviço inválido.')
      return
    }

    const horarioDuplicado = agendamentos.some(
      (item) =>
        item.data === data &&
        item.hora_inicio === horaInicio &&
        item.status !== 'cancelado'
    )

    if (horarioDuplicado) {
      const confirmou = confirm(
        'Já existe um agendamento nesse mesmo dia e horário. Deseja cadastrar mesmo assim?'
      )

      if (!confirmou) return
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
    setData(dataSelecionada)
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

  async function marcarComoFeito(agendamento: Agendamento) {
    if (agendamento.status === 'feito') {
      alert('Esse atendimento já está marcado como feito.')
      return
    }

    if (!podeMarcarFeito(agendamento)) {
      alert('Você só pode marcar como feito depois que o horário do atendimento terminar.')
      return
    }

    await alterarStatus(agendamento.id, 'feito')
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

  return (
    <div>
      <h1 style={{ margin: 0, marginBottom: '8px' }}>Agenda</h1>

      <p style={subtitleStyle}>
        Cadastre atendimentos usando cliente, serviço, valor e duração automática.
      </p>

      <div style={calendarCardStyle}>
        <div style={calendarHeaderStyle}>
          <button style={calendarNavButtonStyle} onClick={() => mudarMes('anterior')}>
            ‹
          </button>

          <h2 style={{ margin: 0 }}>
            {mesAtual.toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>

          <button style={calendarNavButtonStyle} onClick={() => mudarMes('proximo')}>
            ›
          </button>
        </div>

        <div style={weekGridStyle}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
            <span key={dia} style={weekDayStyle}>
              {dia}
            </span>
          ))}
        </div>

        <div style={calendarGridStyle}>
          {gerarDiasCalendario().map((dataDia, index) => {
            if (!dataDia) return <div key={index} />

            const ativo = dataDia === dataSelecionada
            const quantidade = contarAgendamentosDoDia(dataDia)

            return (
              <button
                key={dataDia}
                onClick={() => selecionarDia(dataDia)}
                style={{
                  ...dayButtonStyle,
                  background: ativo
                    ? 'linear-gradient(135deg, rgba(217,70,239,0.28), rgba(88,28,135,0.28))'
                    : '#111',
                  border: ativo
                    ? '1px solid rgba(217,70,239,0.75)'
                    : '1px solid #2a2a2a',
                }}
              >
                <strong>{Number(dataDia.split('-')[2])}</strong>
                {quantidade > 0 && <span style={dotStyle}>{quantidade}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div style={formCardStyle}>
        <h2 style={formTitleStyle}>Novo agendamento</h2>

        <div style={formGridStyle}>
          <select
            style={inputStyle}
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option style={optionStyle} value="">Selecione a cliente</option>
            {clientes.map((cliente) => (

             <option style={optionStyle} key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>

          <select
            style={inputStyle}
            value={servicoId}
            onChange={(e) => setServicoId(e.target.value)}
          >
            <option style={optionStyle} value="">Selecione o serviço</option>
            {servicos.map((servico) => (
            <option style={optionStyle} key={servico.id} value={servico.id}>
                {servico.nome} — R$ {servico.valor} — {servico.duracao} min
              </option>
            ))}
          </select>

          <input
            style={inputStyle}
            type="date"
            value={data}
            min={hoje}
            onChange={(e) => {
              setData(e.target.value)
              setDataSelecionada(e.target.value)
            }}
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
            <option style={optionStyle} value="agendado">Agendado</option>
            <option style={optionStyle} value="cancelado">Cancelado</option>
          </select>
        </div>

        {servicoSelecionado && horaInicio && (
          <p style={previewTextStyle}>
            Esse atendimento vai de <strong>{horaInicio}</strong> até{' '}
            <strong>{horaFim}</strong>.
          </p>
        )}

        <button style={buttonStyle} onClick={salvarAgendamento} disabled={carregando}>
          {carregando ? 'Salvando...' : 'Salvar agendamento'}
        </button>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>
          Atendimentos de {formatarData(dataSelecionada)}
        </h2>

        {agendamentosDoDia.length === 0 ? (
          <p style={subtitleStyle}>Nenhum agendamento para este dia.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {agendamentosDoDia.map((agendamento, index) => {
              const podeFeito = podeMarcarFeito(agendamento)
              const mesmoHorario = temMesmoHorario(agendamento)

              return (
                <div key={agendamento.id} style={appointmentCardStyle}>
                  <div>
                    <div style={headerRowStyle}>
                      <span style={indexStyle}>{index + 1}</span>

                      <strong style={timeStyle}>
                        {agendamento.hora_inicio.slice(0, 5)} até{' '}
                        {agendamento.hora_fim.slice(0, 5)}
                      </strong>
                    </div>

                    {mesmoHorario && (
                      <span style={sameTimeBadgeStyle}>Mesmo horário</span>
                    )}

                    <div style={infoGroupStyle}>
                      <p style={primaryTextStyle}>
                        {agendamento.Clientes?.nome || 'Cliente'}
                      </p>

                      <p style={secondaryTextStyle}>
                        {agendamento.Servicos?.nome || 'Serviço'} — R${' '}
                        {Number(agendamento.valor).toFixed(2)}
                      </p>

                      <p
                        style={{
                          ...statusTextStyle,
                          color: corStatus(agendamento.status),
                        }}
                      >
                        Status: {formatarStatus(agendamento.status)}
                      </p>
                    </div>
                  </div>

                  <div style={actionsStyle}>
                    <button
                      style={{
                        ...secondaryButtonStyle,
                        opacity:
                          agendamento.status === 'feito'
                            ? 0.45
                            : podeFeito
                              ? 1
                              : 0.65,
                        cursor:
                          agendamento.status === 'feito'
                            ? 'not-allowed'
                            : 'pointer',
                      }}
                      onClick={() => marcarComoFeito(agendamento)}
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
              )
            })}
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
  padding: '22px',
}

const calendarCardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: 'linear-gradient(135deg, rgba(217,70,239,0.10), rgba(88,28,135,0.08))',
  border: '1px solid rgba(217,70,239,0.25)',
  borderRadius: '18px',
  padding: '18px',
}

const calendarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '18px',
}

const calendarNavButtonStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '12px',
  border: '1px solid rgba(217,70,239,0.35)',
  background: '#151515',
  color: 'white',
  cursor: 'pointer',
  fontSize: '24px',
}

const weekGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '8px',
  marginBottom: '8px',
}

const weekDayStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '13px',
  textAlign: 'center',
}

const calendarGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '8px',
}

const dayButtonStyle: React.CSSProperties = {
  minHeight: '58px',
  borderRadius: '14px',
  color: 'white',
  cursor: 'pointer',
  position: 'relative',
}

const dotStyle: React.CSSProperties = {
  position: 'absolute',
  right: '7px',
  bottom: '7px',
  minWidth: '20px',
  height: '20px',
  padding: '0 6px',
  borderRadius: '999px',
  background: '#d946ef',
  color: 'white',
  fontSize: '11px',
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const formCardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '20px',
  padding: '22px',
  boxShadow: '0 18px 45px rgba(0,0,0,0.18)',
}

const formTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '16px',
  fontSize: '18px',
}

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '14px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '52px',
  padding: '0 16px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#111111',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500,
  outline: 'none',
}

const previewTextStyle: React.CSSProperties = {
  marginTop: '14px',
  marginBottom: 0,
  color: '#b4b4b4',
  fontSize: '14px',
}

const buttonStyle: React.CSSProperties = {
  marginTop: '18px',
  padding: '14px 22px',
  borderRadius: '14px',
  border: 'none',
  background: '#d946ef',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '15px',
}

const appointmentCardStyle: React.CSSProperties = {
  background: '#151515',
  border: '1px solid #2a2a2a',
  borderRadius: '16px',
  padding: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  flexWrap: 'wrap',
}

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '6px',
}

const timeStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 700,
}

const indexStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, rgba(217,70,239,0.18), rgba(88,28,135,0.18))',
  border: '1px solid rgba(217,70,239,0.35)',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 700,
}

const infoGroupStyle: React.CSSProperties = {
  marginTop: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0px',
}

const primaryTextStyle: React.CSSProperties = {
  margin: 0,
  color: '#a1a1aa',
  fontWeight: 400,
  fontSize: '14px',
}

const secondaryTextStyle: React.CSSProperties = {
  margin: 0,
  color: '#a1a1aa',
  fontSize: '14px',
  fontWeight: 400,
}

const statusTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 700,
}

const sameTimeBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: '36px',
  marginBottom: '6px',
  padding: '5px 9px',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, rgba(217,70,239,0.18), rgba(88,28,135,0.18))',
  border: '1px solid rgba(217,70,239,0.35)',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 700,
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

const optionStyle: React.CSSProperties = {
  background: '#111111',
  color: '#ffffff',
}