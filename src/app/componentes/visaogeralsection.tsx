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

  const feitos = agendamentos.filter((i) => i.status === 'feito')
  const agendados = agendamentos.filter((i) => i.status === 'agendado')
  const cancelados = agendamentos.filter((i) => i.status === 'cancelado')

  const ganhoPrevisto = agendamentos
    .filter((i) => i.status !== 'cancelado')
    .reduce((t, i) => t + Number(i.valor), 0)

  const ganhoRealizado = feitos.reduce(
    (t, i) => t + Number(i.valor),
    0
  )

  const proximoAtendimento = useMemo(() => {
    const agora = new Date().toTimeString().slice(0, 5)
    return agendados.find((i) => i.hora_inicio >= agora)
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

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Visão geral</h1>

      <p style={subtitleStyle}>
        Resumo do seu dia — {formatarDataHoje()}.
      </p>

      {/* CARDS */}
      <div style={cardsGridStyle}>
        <Card label="Atendimentos hoje" value={agendamentos.length} />
        <Card label="Feitos" value={feitos.length} />
        <Card label="Cancelados" value={cancelados.length} />
        <Card label="Ganho previsto" value={formatarMoeda(ganhoPrevisto)} />
        <Card label="Ganho realizado" value={formatarMoeda(ganhoRealizado)} />
      </div>

      {/* PRÓXIMO */}
      <div style={sectionCardStyle}>
        <h2 style={sectionTitleStyle}>Próximo atendimento</h2>

        {!proximoAtendimento ? (
          <p style={subtitleStyle}>Nenhum próximo atendimento para hoje.</p>
        ) : (
          <div style={itemStyle}>
            <div>
              <strong style={timeStyle}>
                {proximoAtendimento.hora_inicio.slice(0, 5)} às{' '}
                {proximoAtendimento.hora_fim.slice(0, 5)}
              </strong>

              <div style={infoGroupStyle}>
                <p style={primaryTextStyle}>
                  {proximoAtendimento.Clientes?.nome || 'Cliente'}
                </p>

                <p style={secondaryTextStyle}>
                  {proximoAtendimento.Servicos?.nome || 'Serviço'}
                </p>
              </div>
            </div>

            <strong>{formatarMoeda(Number(proximoAtendimento.valor))}</strong>
          </div>
        )}
      </div>

      {/* LISTA */}
      <div style={sectionCardStyle}>
        <h2 style={sectionTitleStyle}>Atendimentos de hoje</h2>

        {agendamentos.length === 0 ? (
          <p style={subtitleStyle}>Nenhum atendimento hoje.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {agendamentos.map((item, index) => (
              <div key={item.id} style={itemStyle}>
                <div>
                  <span style={indexStyle}>#{index + 1}</span>

                  <strong style={timeStyle}>
                    {item.hora_inicio.slice(0, 5)} às{' '}
                    {item.hora_fim.slice(0, 5)}
                  </strong>

                  <div style={infoGroupStyle}>
                    <p style={primaryTextStyle}>
                      {item.Clientes?.nome || 'Cliente'}
                    </p>

                    <p style={secondaryTextStyle}>
                      {item.Servicos?.nome || 'Serviço'}
                    </p>

                    <p style={statusTextStyle}>
                      {item.status}
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

/* COMPONENT CARD */
function Card({ label, value }: { label: string; value: any }) {
  return (
    <div style={cardStyle}>
      <span style={labelStyle}>{label}</span>
      <strong style={numberStyle}>{value}</strong>
    </div>
  )
}

/* STYLES */

const containerStyle: React.CSSProperties = {
  padding: '0 10px',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '22px',
}

const subtitleStyle: React.CSSProperties = {
  color: '#a1a1aa',
  marginTop: '6px',
}

const cardsGridStyle: React.CSSProperties = {
  marginTop: '24px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '14px',
}

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1a1a1a, #0f0f0f)',
  border: '1px solid #2a2a2a',
  borderRadius: '16px',
  padding: '16px',
}

const labelStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '13px',
}

const numberStyle: React.CSSProperties = {
  fontSize: '20px',
  marginTop: '6px',
}

const sectionCardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: '16px',
  padding: '18px',
}

const sectionTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '14px',
  fontSize: '16px',
}

const itemStyle: React.CSSProperties = {
  background: '#151515',
  border: '1px solid #2a2a2a',
  borderRadius: '14px',
  padding: '14px',
  display: 'flex',
  justifyContent: 'space-between',
}

const indexStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#888',
  display: 'block',
  marginBottom: '4px',
}

const timeStyle: React.CSSProperties = {
  fontSize: '15px',
}

const infoGroupStyle: React.CSSProperties = {
  marginTop: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

const primaryTextStyle: React.CSSProperties = {
  margin: 0,
  color: '#fff',
  fontWeight: 600,
  fontSize: '14px',
}

const secondaryTextStyle: React.CSSProperties = {
  margin: 0,
  color: '#a1a1aa',
  fontSize: '13px',
}

const statusTextStyle: React.CSSProperties = {
  margin: 0,
  color: '#22c55e',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'capitalize',
}