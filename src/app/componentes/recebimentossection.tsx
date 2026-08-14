'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Parcela = {
  id: number
  numero_parcela: number
  total_parcelas?: number
  valor: number
  status: string
  data_pagamento: string | null
  data_vencimento: string

Clientes?: {
  nome: string
}

Emprestimos?: {
  quantidade_parcelas: number
}
}

export default function RecebimentosSection() {
  const supabase = createClient()

const [parcelas, setParcelas] =
  useState<Parcela[]>([])
const hoje = new Date()

const primeiroDia = new Date(
  hoje.getFullYear(),
  hoje.getMonth(),
  1
)
  .toISOString()
  .slice(0, 10)

const ultimoDia = new Date(
  hoje.getFullYear(),
  hoje.getMonth() + 1,
  0
)
  .toISOString()
  .slice(0, 10)

const [dataInicial, setDataInicial] = useState(primeiroDia)
const [dataFinal, setDataFinal] = useState(ultimoDia)

useEffect(() => {
  carregarRecebimentos()
}, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  async function carregarRecebimentos() {
    const userId = await pegarUserId()
    if (!userId) return

const { data, error } = await supabase
  .from('Parcelas')
  .select(`
    *,
    Clientes (
      nome
    ),
    Emprestimos!emprestimo_id (
      quantidade_parcelas
    )
  `)
  .eq('user_id', userId)
  .eq('status', 'pago')
  .order('data_pagamento', { ascending: false })
    if (error) {
      console.log('ERRO AO CARREGAR GANHOS:', error)
      return
    }

setParcelas((data as Parcela[]) || [])
}

const parcelasFiltradas = useMemo(() => {
  return parcelas.filter((item) => {
    if (!item.data_pagamento) return false

    return (
      item.data_pagamento >= dataInicial &&
      item.data_pagamento <= dataFinal
    )
  })
}, [parcelas, dataInicial, dataFinal])

const total = parcelasFiltradas.reduce(
    (soma, item) => soma + Number(item.valor),
    0
  )
const ticketMedio =
  parcelasFiltradas.length > 0
    ? total / parcelasFiltradas.length
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
      {/* Regras de responsividade para mobile */}
      <style>{`
        @media (max-width: 640px) {
          .lash-header {
            flex-direction: column;
            align-items: stretch !important;
          }

          .lash-header button {
            width: 100%;
          }

          .lash-filters input {
            flex: 1 1 140px;
          }

          .lash-item {
            grid-template-columns: 1fr !important;
            row-gap: 10px !important;
            padding: 16px !important;
          }

          .lash-divider {
            display: none !important;
          }

          .lash-paid-badge {
            width: 100% !important;
          }

          .lash-value-badge {
            width: 100% !important;
          }
        }
      `}</style>

<div
  className="lash-header"
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '14px',
    marginBottom: 26,
  }}
>
  <div>
    <h1 style={{ margin: 0, marginBottom: 8 }}>
      Recebimentos
    </h1>

    <p style={subtitleStyle}>
      Acompanhe todos os pagamentos recebidos das parcelas dos empréstimos.
    </p>
  </div>

  <button
    onClick={carregarRecebimentos}
    style={secondaryButtonStyle}
  >
    Atualizar
  </button>
</div>

<div style={filtersStyle} className="lash-filters">
  <input
    type="date"
    value={dataInicial}
    onChange={(e) => setDataInicial(e.target.value)}
    style={{ ...inputStyle, flex: '1 1 160px' }}
  />

  <input
    type="date"
    value={dataFinal}
    onChange={(e) => setDataFinal(e.target.value)}
    style={{ ...inputStyle, flex: '1 1 160px' }}
  />
</div>

   <div style={cardsGridStyle}>
  <div style={cardStyle}>
    <span style={labelStyle}>Total recebido</span>
    <strong style={numberStyle}>
      {formatarMoeda(total)}
    </strong>
  </div>

  <div style={cardStyle}>
    <span style={labelStyle}>Parcelas recebidas</span>
    <strong style={numberStyle}>
      {parcelasFiltradas.length}
    </strong>
  </div>

  <div style={cardStyle}>
    <span style={labelStyle}>Ticket médio</span>
    <strong style={numberStyle}>
      {formatarMoeda(ticketMedio)}
    </strong>
  </div>
</div>
      <div style={sectionCardStyle}>
        <h2 style={{ marginTop: 0 }}> Histórico de recebimentos </h2>

       {parcelasFiltradas.length === 0 ? (
          <p style={subtitleStyle}>
      Nenhum recebimento encontrado nesse período.
          </p>
        ) : (
<div style={{ display: 'grid', gap: '12px' }}>
  {parcelasFiltradas.map((item) => (
  
        <div key={item.id} style={itemStyle} className="lash-item">

  <div style={avatarStyle}>
    👤
  </div>

  <div style={clientStyle}>
<strong
  style={clientNameStyle}
  title={item.Clientes?.nome}
>
  {item.Clientes?.nome}
</strong>
  </div>

  <div style={columnStyle}>
    <span style={smallLabelStyle}>
      📅 Recebido em
    </span>

    <strong>
      {formatarData(item.data_pagamento!)}
    </strong>
  </div>

  <div style={dividerStyle} className="lash-divider" />

  <div style={columnStyle}>
    <span style={smallLabelStyle}>
      💳 Parcela
    </span>

<strong>
  {item.numero_parcela} de{' '}
  {item.Emprestimos?.quantidade_parcelas ?? '-'}
</strong>
  </div>

  <div style={dividerStyle} className="lash-divider" />

  <span style={paidBadgeStyle} className="lash-paid-badge">
    ✔ Pago
  </span>

  <div style={valueBadgeStyle} className="lash-value-badge">
    {formatarMoeda(item.valor)}
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
    color: '#F8FAFC',
  lineHeight: 1.6,
}

const filtersStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  marginTop: '20px',
}

const cardsGridStyle: React.CSSProperties = {
  marginTop: '24px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
}

const cardStyle: React.CSSProperties = {
  background: '#0D1B2E',
  border: '1px solid #1F3A5F',
  borderRadius: '18px',
  padding: '18px',
}
const labelStyle: React.CSSProperties = {
   display: 'block',
  color: '#94A3B8',
  marginBottom: '10px',
}

const numberStyle: React.CSSProperties = {
  fontSize: '24px',
  color: '#F8FAFC',
}

const sectionCardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: '#0D1B2E',
  border: '1px solid #1F3A5F',
  borderRadius: '18px',
  padding: '18px',
}

const itemStyle: React.CSSProperties = {
  background: '#132641',
  border: '1px solid #1F3A5F',
  borderRadius: '14px',
  padding: '18px 22px',
  display: 'grid',
  gridTemplateColumns:
    '48px 280px 170px 1px 130px 1px 90px 150px',
  alignItems: 'center',
  columnGap: '22px',
  width: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
}

const smallLabelStyle: React.CSSProperties = {
 color: '#94A3B8',
  fontSize: '13px',
  display: 'block',
  marginBottom: '6px',
}

const paidBadgeStyle: React.CSSProperties = {
  width: 90,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(46, 125, 50, 0.18)',
  color: '#81c784',
  border: '1px solid #2e7d32',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: 14,
}

const valueBadgeStyle: React.CSSProperties = {
  width: 140,
  height: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0D1B2E',
  color: '#F8FAFC',
  border: '1px solid #2563EB',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '18px',
}

const avatarStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: '#132641',
  border: '1px solid #28538B',
  color: '#60A5FA',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
}

const clientStyle: React.CSSProperties = {
  overflow: 'hidden',
}

const clientNameStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#F8FAFC',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
}

const dividerStyle: React.CSSProperties = {
   width: 1,
  alignSelf: 'stretch',
  background: '#1F3A5F',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '11px 16px',
  borderRadius: '12px',
  border: '1px solid #2563EB',
  background: '#2563EB',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 700,
}

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1px solid #1F3A5F',
  background: '#132641',
  color: '#F8FAFC',
  fontSize: '14px',
  outline: 'none',
}
