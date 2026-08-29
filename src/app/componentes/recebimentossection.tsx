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

          .lash-filters {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }

          .lash-filters input {
            width: 100%;
            box-sizing: border-box;
            font-size: 13px !important;
          }

          .lash-item {
            grid-template-columns: auto 1fr auto !important;
            grid-template-areas:
              "avatar nome nome"
              "recebido recebido parcela"
              "pago pago pago"
              "valor valor valor" !important;
            row-gap: 8px !important;
            column-gap: 10px !important;
            padding: 14px !important;
          }

          .lash-parcela-col {
            justify-self: end !important;
            text-align: right !important;
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
  <div style={dateFieldWrapperStyle}>
    <span style={dateIconStyle} aria-hidden="true">📅</span>
    <input
      type="date"
      value={dataInicial}
      onChange={(e) => setDataInicial(e.target.value)}
      style={{ ...inputStyle, ...dateInputStyle, flex: '1 1 160px' }}
    />
  </div>

  <div style={dateFieldWrapperStyle}>
    <span style={dateIconStyle} aria-hidden="true">📅</span>
    <input
      type="date"
      value={dataFinal}
      onChange={(e) => setDataFinal(e.target.value)}
      style={{ ...inputStyle, ...dateInputStyle, flex: '1 1 160px' }}
    />
  </div>
</div>

   <div style={cardsGridStyle}>
  <div style={cardStyle}>
    <span style={labelStyle}>Total recebido</span>
    <strong style={numberStyle}>
      {formatarMoeda(total)}
    </strong>
  </div>

  <div style={cardStyle}>
    <span style={labelStyle}>Parcelas pagas</span>
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
        <h2 style={{ margin: '0 0 18px' }}>Histórico de recebimentos</h2>

       {parcelasFiltradas.length === 0 ? (
          <p style={subtitleStyle}>
      Nenhum recebimento encontrado nesse período.
          </p>
        ) : (
<div style={{ display: 'grid', gap: '10px' }}>
  {parcelasFiltradas.map((item) => (
  
        <div key={item.id} style={itemStyle} className="lash-item">

  <div style={{ ...avatarStyle, gridArea: 'avatar' }}>
    👤
  </div>

  <div style={{ ...clientStyle, gridArea: 'nome' }}>
<strong
  style={clientNameStyle}
  title={item.Clientes?.nome}
>
  {item.Clientes?.nome}
</strong>
  </div>

  <div style={{ ...columnStyle, gridArea: 'recebido' }}>
    <span style={smallLabelStyle}>
      📅 Recebido em
    </span>

    <strong>
      {formatarData(item.data_pagamento!)}
    </strong>
  </div>

  <div style={{ ...dividerStyle, gridArea: 'div1' }} className="lash-divider" />

  <div
    style={{ ...columnStyle, gridArea: 'parcela' }}
    className="lash-parcela-col"
  >
    <span style={smallLabelStyle}>
      💳 Parcela
    </span>

<strong>
  {item.numero_parcela} de{' '}
  {item.Emprestimos?.quantidade_parcelas ?? '-'}
</strong>
  </div>

  <div style={{ ...dividerStyle, gridArea: 'div2' }} className="lash-divider" />

  <span style={{ ...paidBadgeStyle, gridArea: 'pago' }} className="lash-paid-badge">
    ✔ Pago
  </span>

  <div style={{ ...valueBadgeStyle, gridArea: 'valor' }} className="lash-value-badge">
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

const dateFieldWrapperStyle: React.CSSProperties = {
  position: 'relative',
  flex: '1 1 160px',
  display: 'flex',
  alignItems: 'center',
}

const dateIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '14px',
  pointerEvents: 'none',
  zIndex: 1,
}

const dateInputStyle: React.CSSProperties = {
  width: '100%',
  paddingLeft: '34px',
}

const cardsGridStyle: React.CSSProperties = {
  marginTop: '20px',
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '12px',
}

const cardStyle: React.CSSProperties = {
  minHeight: '96px',
  padding: '15px 12px',
  borderRadius: '16px',
  border: '1px solid #1F3A5F',
  background: 'linear-gradient(180deg,#11223D 0%, #0D1B2E 100%)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '5px',
  overflow: 'hidden',
}

const labelStyle: React.CSSProperties = {
   display: 'block',
  color: '#94A3B8',
  fontSize: '12px',
  whiteSpace: 'nowrap',
}

const numberStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#F8FAFC',
  lineHeight: 1.25,
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
  borderRadius: '13px',
  padding: '13px 16px',
  display: 'grid',
  gridTemplateColumns:
    '44px minmax(160px, 1.6fr) minmax(140px, 1fr) 1px minmax(90px, 0.8fr) 1px minmax(90px, 0.7fr) minmax(120px, 1fr)',
  gridTemplateAreas:
    '"avatar nome recebido div1 parcela div2 pago valor"',
  alignItems: 'center',
  columnGap: '16px',
  width: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
}

const smallLabelStyle: React.CSSProperties = {
 color: '#94A3B8',
  fontSize: '12px',
  display: 'block',
  marginBottom: '4px',
}

const paidBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 10px',
  background: 'rgba(46, 125, 50, 0.18)',
  color: '#81c784',
  border: '1px solid #2e7d32',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: 'nowrap',
}

const valueBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '9px 12px',
  background: '#0D1B2E',
  color: '#F8FAFC',
  border: '1px solid #2563EB',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '14px',
  whiteSpace: 'nowrap',
}

const avatarStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#132641',
  border: '1px solid #28538B',
  color: '#60A5FA',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 17,
  flexShrink: 0,
}

const clientStyle: React.CSSProperties = {
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
}

const clientNameStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#F8FAFC',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
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