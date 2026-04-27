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
        Clientes (
          nome
        ),
        Servicos (
          nome
        )
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

  const proximoAtendimento = useMemo(() => {
    const agora = new Date()
    const horaAtual = agora.toTimeString().slice(0, 5)

    return agendados.find((item) => item.hora_inicio >= horaAtual)
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
    <div>
      <h1 style={{ margin: 0 }}>Visão geral</h1>

      <p style={subtitleStyle}>
        Resumo rápido do seu dia — {formatarDataHoje()}.
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
        <h2 style={{ marginTop: 0 }}>Próximo atendimento</h2>

        {!proximoAtendimento ? (
          <p style={subtitleStyle}>Nenhum próximo atendimento para hoje.</p>
        ) : (
          <div style={itemStyle}>
            <div>
              <strong>
                {proximoAtendimento.hora_inicio} às {proximoAtendimento.hora_fim}
              </strong>

              <p style={mutedStyle}>
                {proximoAtendimento.Clientes?.nome || 'Cliente'}
              </p>

              <p style={mutedStyle}>
                {proximoAtendimento.Servicos?.nome || 'Serviço'}
              </p>
            </div>

            <strong>{formatarMoeda(Number(proximoAtendimento.valor))}</strong>
          </div>
        )}
      </div>

      <div style={sectionCardStyle}>
        <h2 style={{ marginTop: 0 }}>Atendimentos de hoje</h2>

        {agendamentos.length === 0 ? (
          <p style={subtitleStyle}>Nenhum atendimento marcado para hoje.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {agendamentos.map((item) => (
              <div key={item.id} style={itemStyle}>
                <div>
                  <strong>
                    {item.hora_inicio} às {item.hora_fim}
                  </strong>

                  <p style={mutedStyle}>
                    {item.Clientes?.nome || 'Cliente'}
                  </p>

                  <p style={mutedStyle}>
                    {item.Servicos?.nome || 'Serviço'}
                  </p>

                  <p style={mutedStyle}>Status: {item.status}</p>
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