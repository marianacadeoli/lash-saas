'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Agendamento = {
  id: number
  data: string
  hora_inicio: string
  hora_fim: string
  valor: number
  status: string
  Clientes?: {
    nome: string
  }
  Servicos?: {
    nome: string
  }
}

export default function VisaoGeralSection() {
  const supabase = createClient()

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])

  useEffect(() => {
    carregarAgendamentos()
  }, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  async function carregarAgendamentos() {
    const userId = await pegarUserId()
    if (!userId) return

    const hoje = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('Agendamentos')
      .select(`
        *,
        Clientes ( nome ),
        Servicos ( nome )
      `)
      .eq('user_id', userId)
      .eq('data', hoje)
      .order('hora_inicio', { ascending: true })

    if (error) {
      console.log('ERRO VISÃO GERAL:', error)
      return
    }

    setAgendamentos((data as Agendamento[]) || [])
  }

  const feitos = agendamentos.filter((item) => item.status === 'feito')
  const agendados = agendamentos.filter((item) => item.status === 'agendado')
  const cancelados = agendamentos.filter((item) => item.status === 'cancelado')

  const ganhoPrevisto = agendamentos
    .filter((item) => item.status !== 'cancelado')
    .reduce((total, item) => total + Number(item.valor), 0)

  const ganhoRealizado = feitos.reduce(
    (total, item) => total + Number(item.valor),
    0
  )

  const proximosAtendimentos = useMemo(() => {
    const agora = new Date()
    const horaAtual = agora.toTimeString().slice(0, 5)

    const primeiroHorario = agendados.find(
      (item) => item.hora_inicio >= horaAtual
    )?.hora_inicio

    if (!primeiroHorario) return []

    return agendados.filter((item) => item.hora_inicio === primeiroHorario)
  }, [agendados])

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatarDataHoje() {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })
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

  return (
    <div>
      <h1 style={{ margin: 0, marginBottom: '8px' }}>Visão geral</h1>

      <p style={subtitleStyle}>
        Resumo rápido do seu dia {formatarDataHoje()}.
      </p>

      <div style={cardsGridStyle}>
        <div style={cardStyle}>
          <span style={labelStyle}>Atendimentos hoje</span>
          <strong style={numberStyle}>{agendamentos.length}</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Feitos</span>
          <strong style={numberStyle}>{feitos.length}</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Cancelados</span>
          <strong style={numberStyle}>{cancelados.length}</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Ganho previsto</span>
          <strong style={numberStyle}>{formatarMoeda(ganhoPrevisto)}</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Ganho realizado</span>
          <strong style={numberStyle}>{formatarMoeda(ganhoRealizado)}</strong>
        </div>
      </div>

      <div style={sectionCardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>
          Próximo atendimento
        </h2>

        {proximosAtendimentos.length === 0 ? (
          <p style={subtitleStyle}>Nenhum próximo atendimento para hoje.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {proximosAtendimentos.map((proximoAtendimento) => (
              <div key={proximoAtendimento.id} style={itemStyle}>
                <div>
                  <div style={headerRowStyle}>
                    <span style={waitingIconStyle}>⏳</span>

                    <strong style={timeStyle}>
                      {proximoAtendimento.hora_inicio.slice(0, 5)} às{' '}
                      {proximoAtendimento.hora_fim.slice(0, 5)}
                    </strong>
                  </div>

                  <div style={infoGroupStyle}>
                    <p style={primaryTextStyle}>
                      {proximoAtendimento.Clientes?.nome || 'Cliente'}
                    </p>

                    <p style={secondaryTextStyle}>
                      {proximoAtendimento.Servicos?.nome || 'Serviço'}
                    </p>

                    <p
                      style={{
                        ...statusTextStyle,
                        color: corStatus(proximoAtendimento.status),
                      }}
                    >
                      Status: {formatarStatus(proximoAtendimento.status)}
                    </p>
                  </div>
                </div>

                <strong>{formatarMoeda(Number(proximoAtendimento.valor))}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={sectionCardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>
          Atendimentos de hoje
        </h2>

        {agendamentos.length === 0 ? (
          <p style={subtitleStyle}>Nenhum atendimento marcado para hoje.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {agendamentos.map((item, index) => (
              <div key={item.id} style={itemStyle}>
                <div>
                  <div style={headerRowStyle}>
                    <span style={indexStyle}>{index + 1}</span>

                    <strong style={timeStyle}>
                      {item.hora_inicio.slice(0, 5)} às{' '}
                      {item.hora_fim.slice(0, 5)}
                    </strong>
                  </div>

                  <div style={infoGroupStyle}>
                    <p style={primaryTextStyle}>
                      {item.Clientes?.nome || 'Cliente'}
                    </p>

                    <p style={secondaryTextStyle}>
                      {item.Servicos?.nome || 'Serviço'}
                    </p>

                    <p
                      style={{
                        ...statusTextStyle,
                        color: corStatus(item.status),
                      }}
                    >
                      Status: {formatarStatus(item.status)}
                    </p>
                  </div>
                </div>

                <strong>{formatarMoeda(Number(item.valor))}</strong>
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

const cardsGridStyle: React.CSSProperties = {
  marginTop: '24px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '16px',
}

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(217,70,239,0.18), rgba(88,28,135,0.18))',
  border: '1px solid rgba(217,70,239,0.35)',
  borderRadius: '18px',
  padding: '18px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#a1a1aa',
  marginBottom: '10px',
}

const numberStyle: React.CSSProperties = {
  fontSize: '24px',
}

const sectionCardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: '18px',
  padding: '18px',
}

const itemStyle: React.CSSProperties = {
  background: '#151515',
  border: '1px solid #2a2a2a',
  borderRadius: '16px',
  padding: '16px',
  display: 'flex',
  justifyContent: 'space-between',
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

const waitingIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, rgba(234,179,8,0.18), rgba(217,70,239,0.12))',
  border: '1px solid rgba(250,187,0,0.45)',
  color: '#eab308',
  fontSize: '13px',
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
  fontWeight: 400,
}