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

export default function RecebimentosSection() {
  const supabase = createClient()

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [filtro, setFiltro] = useState<'mes' | 'semana' | 'hoje'>('mes')

  useEffect(() => {
    carregarGanhos()
  }, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  async function carregarGanhos() {
    const userId = await pegarUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from('Agendamentos')
      .select(`
        *,
        Clientes (
          nome
        ),
        Servicos (
          nome
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'feito')
      .order('data', { ascending: false })
      .order('hora_inicio', { ascending: false })

    if (error) {
      console.log('ERRO AO CARREGAR GANHOS:', error)
      return
    }

    setAgendamentos((data as Agendamento[]) || [])
  }

  function estaNoFiltro(dataIso: string) {
    const hoje = new Date()
    const data = new Date(dataIso + 'T00:00:00')

    if (filtro === 'hoje') {
      return data.toDateString() === hoje.toDateString()
    }

    if (filtro === 'semana') {
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(hoje.getDate() - 7)
      return data >= seteDiasAtras && data <= hoje
    }

    return (
      data.getMonth() === hoje.getMonth() &&
      data.getFullYear() === hoje.getFullYear()
    )
  }

  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter((item) => estaNoFiltro(item.data))
  }, [agendamentos, filtro])

  const total = agendamentosFiltrados.reduce(
    (soma, item) => soma + Number(item.valor),
    0
  )

  const ticketMedio =
    agendamentosFiltrados.length > 0
      ? total / agendamentosFiltrados.length
      : 0

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatarData(dataIso: string) {
    return new Date(dataIso + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  return (
    <div>
    <h1 style={{ margin: 0, marginBottom: '8px' }}>Ganhos</h1>

      <p style={subtitleStyle}>
        Acompanhe seus ganhos com base nos atendimentos marcados como feitos.
      </p>

      <div style={filtersStyle}>
        <button
          style={filtro === 'hoje' ? activeFilterStyle : filterButtonStyle}
          onClick={() => setFiltro('hoje')}
        >
          Hoje
        </button>

        <button
          style={filtro === 'semana' ? activeFilterStyle : filterButtonStyle}
          onClick={() => setFiltro('semana')}
        >
          Últimos 7 dias
        </button>

        <button
          style={filtro === 'mes' ? activeFilterStyle : filterButtonStyle}
          onClick={() => setFiltro('mes')}
        >
          Este mês
        </button>
      </div>

      <div style={cardsGridStyle}>
        <div style={cardStyle}>
          <span style={labelStyle}>Total recebido</span>
          <strong style={numberStyle}>{formatarMoeda(total)}</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Atendimentos feitos</span>
          <strong style={numberStyle}>{agendamentosFiltrados.length}</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Ticket médio</span>
          <strong style={numberStyle}>{formatarMoeda(ticketMedio)}</strong>
        </div>
      </div>

      <div style={sectionCardStyle}>
        <h2 style={{ marginTop: 0 }}>Histórico de ganhos</h2>

        {agendamentosFiltrados.length === 0 ? (
          <p style={subtitleStyle}>
            Nenhum atendimento feito nesse período.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {agendamentosFiltrados.map((item) => (
              <div key={item.id} style={itemStyle}>
                <div>
                  <strong>
                    {formatarData(item.data)} — {item.hora_inicio} às {item.hora_fim}
                  </strong>

                  <p style={mutedStyle}>
                    {item.Clientes?.nome || 'Cliente'}
                  </p>

                  <p style={mutedStyle}>
                    {item.Servicos?.nome || 'Serviço'}
                  </p>
                </div>

                <strong style={{ fontSize: '18px' }}>
                  {formatarMoeda(Number(item.valor))}
                </strong>
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

const filtersStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  marginTop: '20px',
}

const filterButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '999px',
  border: '1px solid #333',
  background: '#151515',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}

const activeFilterStyle: React.CSSProperties = {
  ...filterButtonStyle,
  background: '#d946ef',
  border: '1px solid #d946ef',
}

const cardsGridStyle: React.CSSProperties = {
  marginTop: '24px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
}

const cardStyle: React.CSSProperties = {
  background: '#101010',
  border: '1px solid #2a2a2a',
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

const mutedStyle: React.CSSProperties = {
  color: '#b4b4b4',
  margin: '6px 0',
}