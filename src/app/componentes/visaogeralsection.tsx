'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Cliente = {
  id: number
  nome: string
  telefone: string | null
}

type Parcela = {
  id: number
  cliente_id: number
  emprestimo_id: number | null
  numero_parcela: number
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: string
  observacoes: string | null
  user_id: string
  Clientes?: Cliente | Cliente[] | null
}

type Emprestimo = {
  id: number
  valor_emprestado: number
  valor_total: number
  quantidade_parcelas: number
}

type SituacaoParcela =
  | 'pago'
  | 'atrasado'
  | 'vence_hoje'
  | 'pendente'
  | 'cancelado'

export default function VisaoGeralSection() {
  const supabase = useMemo(() => createClient(), [])
  const hoje = new Date().toLocaleDateString('sv-SE')
  

const [parcelas, setParcelas] = useState<Parcela[]>([])
const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
const [totalClientes, setTotalClientes] = useState(0)
const [carregando, setCarregando] = useState(true)
const [isMobile, setIsMobile] = useState(false)


const [mesSelecionado, setMesSelecionado] = useState(new Date())



useEffect(() => {
  function handleResize() {
    setIsMobile(window.innerWidth < 768)
  }

  handleResize()

  window.addEventListener('resize', handleResize)

  return () => {
    window.removeEventListener('resize', handleResize)
  }
}, [])

  useEffect(() => {
    carregarDados()
  }, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  function pegarCliente(parcela: Parcela): Cliente | null {
    if (!parcela.Clientes) return null
    if (Array.isArray(parcela.Clientes)) return parcela.Clientes[0] || null
    return parcela.Clientes
  }

  async function carregarDados() {
    setCarregando(true)

    const userId = await pegarUserId()

    if (!userId) {
      setParcelas([])
      setTotalClientes(0)
      setCarregando(false)
      return
    }

   const [
  parcelasResponse,
  emprestimosResponse,
  clientesResponse,
] = await Promise.all([

  supabase
  .from('Parcelas')
  .select(`
    id,
    cliente_id,
    emprestimo_id,
    numero_parcela,
    valor,
    data_vencimento,
    data_pagamento,
    status,
    observacoes,
    user_id,
    Clientes (
      id,
      nome,
      telefone
    )
  `)
  .eq('user_id', userId)
  .order('data_vencimento', { ascending: true }),

  supabase
  .from('Emprestimos')
  .select(`
    id,
    valor_emprestado,
    valor_total,
    quantidade_parcelas
  `)
  .eq('user_id', userId),

      supabase
        .from('Clientes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ])

    if (parcelasResponse.error) {
      console.error('Erro ao carregar parcelas:', parcelasResponse.error)
      setParcelas([])
    } else {
      setParcelas((parcelasResponse.data as Parcela[]) || [])
    }
if (emprestimosResponse.error) {
  console.error(emprestimosResponse.error)
} else {
  setEmprestimos(
    (emprestimosResponse.data as Emprestimo[]) || []
  )
}
    if (clientesResponse.error) {
      console.error('Erro ao carregar clientes:', clientesResponse.error)
      setTotalClientes(0)
    } else {
      setTotalClientes(clientesResponse.count || 0)
    }

    setCarregando(false)
  }

  function normalizarStatus(status: string) {
    return status?.trim().toLowerCase() || 'pendente'
  }

  function descobrirSituacao(parcela: Parcela): SituacaoParcela {
    const status = normalizarStatus(parcela.status)

    if (status === 'pago') return 'pago'
    if (status === 'cancelado') return 'cancelado'
    if (parcela.data_vencimento < hoje) return 'atrasado'
    if (parcela.data_vencimento === hoje) return 'vence_hoje'

    return 'pendente'
  }

  function formatarDinheiro(valor: number) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatarData(dataIso: string | null) {
    if (!dataIso) return '—'
    return new Date(`${dataIso}T00:00:00`).toLocaleDateString('pt-BR')
  }

  function somarValores(lista: Parcela[]) {
    return lista.reduce(
      (total, parcela) => total + Number(parcela.valor || 0),
      0
    )
  }

  const parcelasPendentes = useMemo(
    () =>
      parcelas.filter((parcela) => {
        const situacao = descobrirSituacao(parcela)
        return situacao === 'pendente' || situacao === 'vence_hoje'
      }),
    [parcelas]
  )

  const parcelasAtrasadas = useMemo(
    () =>
      parcelas.filter(
        (parcela) => descobrirSituacao(parcela) === 'atrasado'
      ),
    [parcelas]
  )

  const parcelasPagas = useMemo(
    () =>
      parcelas.filter((parcela) => descobrirSituacao(parcela) === 'pago'),
    [parcelas]
  )

  const parcelasPagasNoMes = useMemo(() => {
  const ano = mesSelecionado.getFullYear()
  const mes = mesSelecionado.getMonth()

    return parcelasPagas.filter((parcela) => {
      if (!parcela.data_pagamento) return false

      const data = new Date(`${parcela.data_pagamento}T00:00:00`)

      return data.getFullYear() === ano && data.getMonth() === mes
    })
 }, [parcelasPagas, mesSelecionado])

  const proximosVencimentos = useMemo(() => {
    return parcelas
      .filter((parcela) => {
        const situacao = descobrirSituacao(parcela)
        return situacao === 'pendente' || situacao === 'vence_hoje'
      })
      .slice(0, 6)
  }, [parcelas])

  const totalEmAberto = useMemo(
    () => somarValores(parcelasPendentes),
    [parcelasPendentes]
  )

  const totalEmAtraso = useMemo(
    () => somarValores(parcelasAtrasadas),
    [parcelasAtrasadas]
  )

const lucroNoMes = useMemo(() => {
  return parcelasPagasNoMes.reduce((total, parcela) => {
    const emprestimo = emprestimos.find(
      (e) => e.id === parcela.emprestimo_id
    )

    if (!emprestimo) return total

    const capitalParcela =
      emprestimo.valor_emprestado /
      emprestimo.quantidade_parcelas

    const lucroParcela =
      parcela.valor - capitalParcela

    return total + lucroParcela
  }, 0)
}, [parcelasPagasNoMes, emprestimos])

  const totalConsiderado =
    parcelasPendentes.length + parcelasAtrasadas.length + parcelasPagas.length

  const percentualPago =
    totalConsiderado > 0
      ? Math.round((parcelasPagas.length / totalConsiderado) * 100)
      : 0

  const percentualPendente =
    totalConsiderado > 0
      ? Math.round((parcelasPendentes.length / totalConsiderado) * 100)
      : 0

  const percentualAtrasado =
    totalConsiderado > 0
      ? Math.round((parcelasAtrasadas.length / totalConsiderado) * 100)
      : 0

  function textoSituacao(parcela: Parcela) {
    const situacao = descobrirSituacao(parcela)

    if (situacao === 'pago') return 'Pago'
    if (situacao === 'atrasado') return 'Atrasado'
    if (situacao === 'vence_hoje') return 'Vence hoje'
    if (situacao === 'cancelado') return 'Cancelado'

    return 'Pendente'
  }

  function voltarMes() {
  const data = new Date(mesSelecionado)
  data.setMonth(data.getMonth() - 1)
  setMesSelecionado(data)
}

function avancarMes() {
  const data = new Date(mesSelecionado)
  data.setMonth(data.getMonth() + 1)

  const hoje = new Date()

  if (
    data.getFullYear() > hoje.getFullYear() ||
    (
      data.getFullYear() === hoje.getFullYear() &&
      data.getMonth() > hoje.getMonth()
    )
  ) {
    return
  }

  setMesSelecionado(data)
}

const hojeAtual = new Date()

const podeAvancar =
  mesSelecionado.getFullYear() < hojeAtual.getFullYear() ||
  (
    mesSelecionado.getFullYear() === hojeAtual.getFullYear() &&
    mesSelecionado.getMonth() < hojeAtual.getMonth()
  )

  function corSituacao(parcela: Parcela) {
    const situacao = descobrirSituacao(parcela)

    if (situacao === 'pago') return '#22c55e'
    if (situacao === 'atrasado') return '#ef4444'
    if (situacao === 'vence_hoje') return '#eab308'
    if (situacao === 'cancelado') return '#71717a'

    return '#38bdf8'
  }

const summaryGridResponsiveStyle: React.CSSProperties = {
  ...summaryGridStyle,
  gridTemplateColumns: isMobile
    ? 'repeat(2, 1fr)'
    : 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: isMobile ? '10px' : summaryGridStyle.gap,
}

const summaryCardResponsiveStyle: React.CSSProperties = {
  ...summaryCardStyle,
  minHeight: isMobile ? undefined : summaryCardStyle.minHeight,
  height: isMobile ? '140px' : undefined,
  padding: isMobile ? '13px' : summaryCardStyle.padding,
  gap: isMobile ? '4px' : summaryCardStyle.gap,
  justifyContent: 'center',
  overflow: isMobile ? 'hidden' : undefined,
}

const summaryLabelResponsiveStyle: React.CSSProperties = {
  ...summaryLabelStyle,
  fontSize: isMobile ? '11px' : summaryLabelStyle.fontSize,
}

const summaryValueResponsiveStyle: React.CSSProperties = {
  ...summaryValueStyle,
  fontSize: isMobile ? '17px' : summaryValueStyle.fontSize,
}

const summaryDetailResponsiveStyle: React.CSSProperties = {
  ...summaryDetailStyle,
  fontSize: isMobile ? '10px' : summaryDetailStyle.fontSize,
}

const mainGridResponsiveStyle: React.CSSProperties = {
  ...mainGridStyle,
  gridTemplateColumns: isMobile
    ? '1fr'
    : 'minmax(0,1.45fr) minmax(280px,.75fr)',
}
return (
  <div style={pageContainerStyle}>

<div style={pageHeaderStyle}>
  <div>
    <h1 style={titleStyle}>Visão Geral</h1>

    <p style={subtitleStyle}>
      Acompanhe os principais indicadores da carteira.
    </p>
  </div>
</div>

<div style={summaryGridResponsiveStyle}>

  <div style={summaryCardResponsiveStyle}>
 <span style={summaryLabelResponsiveStyle}>
  Lucro do mês
</span>

<div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: isMobile ? 6 : 10,
    marginBottom: 8,
  }}
>
  <button
    onClick={voltarMes}
    style={monthButtonStyle}
  >
    ◀
  </button>

  <span
    style={{
      color: "#94A3B8",
      fontSize: isMobile ? 11 : 13,
      fontWeight: 600,
      minWidth: isMobile ? 90 : 120,
      textAlign: "center",
    }}
  >
    {mesSelecionado.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    })}
  </span>

<button
  onClick={avancarMes}
  disabled={!podeAvancar}
  style={{
    ...monthButtonStyle,
    opacity: podeAvancar ? 1 : 0.4,
    cursor: podeAvancar ? "pointer" : "not-allowed",
  }}
>
  ▶
</button>
</div>
  <strong
    style={{
      ...summaryValueResponsiveStyle,
      color: "#4ade80",
    }}
  >
    {formatarDinheiro(lucroNoMes)}
  </strong>

  <span style={summaryDetailResponsiveStyle}>
    {parcelasPagasNoMes.length}{" "}
    {parcelasPagasNoMes.length === 1
      ? "pagamento"
      : "pagamentos"}
  </span>

</div>

<div style={summaryCardResponsiveStyle}>
  <span style={summaryLabelResponsiveStyle}>
    Total em aberto
  </span>

  <strong style={summaryValueResponsiveStyle}>
    {formatarDinheiro(totalEmAberto)}
  </strong>

  <span style={summaryDetailResponsiveStyle}>
    {parcelasPendentes.length} parcelas
  </span>
</div>

<div style={summaryCardResponsiveStyle}>
  <span style={summaryLabelResponsiveStyle}>
    Em atraso
  </span>

  <strong
    style={{
      ...summaryValueResponsiveStyle,
      color: "#ef4444",
    }}
  >
    {formatarDinheiro(totalEmAtraso)}
  </strong>

  <span style={summaryDetailResponsiveStyle}>
    {parcelasAtrasadas.length} parcelas
  </span>
</div>

        <div style={summaryCardResponsiveStyle}>
          <span style={summaryLabelResponsiveStyle}>Clientes cadastrados</span>
          <strong style={summaryValueResponsiveStyle}>{totalClientes}</strong>
          <span style={summaryDetailResponsiveStyle}>
            Total registrado no sistema
          </span>
        </div>
      </div>

      <div style={mainGridResponsiveStyle}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Situação das parcelas</h2>
              <p style={panelSubtitleStyle}>
                Distribuição geral dos pagamentos cadastrados.
              </p>
            </div>

            <span style={percentageHighlightStyle}>
              {percentualPago}% pago
            </span>
          </div>

          <div style={progressGroupStyle}>
            <div>
              <div style={progressLabelRowStyle}>
                <span>Pagas</span>
                <strong>{parcelasPagas.length}</strong>
              </div>
              <div style={progressTrackStyle}>
                <div
                  style={{
                    ...progressFillStyle,
                    width: `${percentualPago}%`,
                    background: '#22c55e',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={progressLabelRowStyle}>
                <span>Pendentes</span>
                <strong>{parcelasPendentes.length}</strong>
              </div>
              <div style={progressTrackStyle}>
                <div
                  style={{
                    ...progressFillStyle,
                    width: `${percentualPendente}%`,
                    background: '#eab308',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={progressLabelRowStyle}>
                <span>Atrasadas</span>
                <strong>{parcelasAtrasadas.length}</strong>
              </div>
              <div style={progressTrackStyle}>
                <div
                  style={{
                    ...progressFillStyle,
                    width: `${percentualAtrasado}%`,
                    background: '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>

        <div style={miniCardsGridStyle}>
            <div style={miniCardStyle}>
              <span style={miniCardLabelStyle}>Total de parcelas</span>
              <strong style={miniCardValueStyle}>{parcelas.length}</strong>
            </div>

            <div style={miniCardStyle}>
              <span style={miniCardLabelStyle}>Pagamentos concluídos</span>
              <strong style={miniCardValueStyle}>{parcelasPagas.length}</strong>
            </div>

            <div style={miniCardStyle}>
              <span style={miniCardLabelStyle}>Precisam de atenção</span>
              <strong style={{ ...miniCardValueStyle, color: '#f87171' }}>
                {parcelasAtrasadas.length}
              </strong>
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Resumo rápido</h2>
              <p style={panelSubtitleStyle}>
                Indicadores para orientar a rotina financeira.
              </p>
            </div>
          </div>

          <div style={quickListStyle}>
            <div style={quickItemStyle}>
              <div>
               <span style={quickLabelStyle}>
  Média de lucro por pagamento
</span>
                <strong style={quickValueStyle}>
                  {formatarDinheiro(
  parcelasPagasNoMes.length > 0
    ? lucroNoMes / parcelasPagasNoMes.length
    : 0
)}
                </strong>
              </div>
              <span style={quickBadgeStyle}>Média</span>
            </div>

            <div style={quickItemStyle}>
              <div>
               <span style={quickLabelStyle}>
  Lucro do mês
</span>
                <strong style={quickValueStyle}>
           {formatarDinheiro(lucroNoMes)}
                </strong>
              </div>
            <span style={quickBadgeStyle}>
  {mesSelecionado.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })}
</span>
            </div>

            <div style={quickItemStyle}>
              <div>
                <span style={quickLabelStyle}>Índice de atraso</span>
                <strong
                  style={{
                    ...quickValueStyle,
                    color: percentualAtrasado > 0 ? '#f87171' : '#4ade80',
                  }}
                >
                  {percentualAtrasado}%
                </strong>
              </div>
              <span style={quickBadgeStyle}>Carteira</span>
            </div>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>Próximos vencimentos</h2>
            <p style={panelSubtitleStyle}>
              Parcelas pendentes com vencimento mais próximo.
            </p>
          </div>
        </div>

        {carregando ? (
          <div style={emptyStateStyle}>Carregando informações...</div>
        ) : proximosVencimentos.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>Nenhum vencimento pendente.</strong>
            <span>Os próximos recebimentos aparecerão aqui.</span>
          </div>
        ) : (
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Cliente</th>
                  <th style={tableHeaderStyle}>Parcela</th>
                  <th style={tableHeaderStyle}>Vencimento</th>
                  <th style={tableHeaderStyle}>Valor</th>
                  <th style={tableHeaderStyle}>Situação</th>
                </tr>
              </thead>

              <tbody>
                {proximosVencimentos.map((parcela) => {
                  const cliente = pegarCliente(parcela)
                  const cor = corSituacao(parcela)

                  return (
                    <tr key={parcela.id}>
                      <td style={tableCellStyle}>
                        <strong style={{ display: 'block', color: '#ffffff' }}>
                          {cliente?.nome || 'Cliente não encontrado'}
                        </strong>
                        <span style={tableSecondaryTextStyle}>
                          {cliente?.telefone || 'Telefone não informado'}
                        </span>
                      </td>

                      <td style={tableCellStyle}>
                        Nº {parcela.numero_parcela}
                      </td>

                      <td style={tableCellStyle}>
                        {formatarData(parcela.data_vencimento)}
                      </td>

                      <td style={tableCellStyle}>
                        <strong style={{ color: '#ffffff' }}>
                          {formatarDinheiro(parcela.valor)}
                        </strong>
                      </td>

                      <td style={tableCellStyle}>
                        <span
                          style={{
                            ...statusBadgeStyle,
                            color: cor,
                            borderColor: cor,
                            background: `${cor}1F`,
                          }}
                        >
                          {textoSituacao(parcela)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
const pageContainerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '1180px',
  margin: '0 auto',
}

const pageHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
  flexWrap: 'wrap',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: '8px',
  color: '#F8FAFC',
}

const subtitleStyle: React.CSSProperties = {
  color: '#94A3B8',
  lineHeight: 1.6,
  margin: 0,
}

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: '16px',
  marginTop: '24px',
}

const summaryCardStyle: React.CSSProperties = {
  minHeight: '125px',
  padding: '20px',
  borderRadius: '18px',
  border: '1px solid #1F3A5F',
  background:
    'linear-gradient(180deg,#11223D 0%, #0D1B2E 100%)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '8px',
}

const summaryLabelStyle: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: '14px',
}

const summaryValueStyle: React.CSSProperties = {
  color: '#F8FAFC',
  fontSize: '29px',
  lineHeight: 1.1,
}

const summaryDetailStyle: React.CSSProperties = {
  color: '#CBD5E1',
  fontSize: '13px',
  fontWeight: 700,
}

const mainGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1.45fr) minmax(280px,.75fr)',
  gap: '20px',
  marginTop: '24px',
}

const panelStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '22px',
  borderRadius: '20px',
  border: '1px solid #1F3A5F',
  background: '#0D1B2E',
}

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
  flexWrap: 'wrap',
  marginBottom: '20px',
}

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#F8FAFC',
  fontSize: '20px',
}

const panelSubtitleStyle: React.CSSProperties = {
  margin: '6px 0 0',
  color: '#94A3B8',
  fontSize: '14px',
  lineHeight: 1.5,
}

const percentageHighlightStyle: React.CSSProperties = {
  padding: '7px 11px',
  borderRadius: '999px',
  border: '1px solid rgba(37,99,235,.4)',
  background: 'rgba(37,99,235,.18)',
  color: '#60A5FA',
  fontSize: '12px',
  fontWeight: 800,
}

const progressGroupStyle: React.CSSProperties = {
  display: 'grid',
  gap: '17px',
}

const progressLabelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: '#CBD5E1',
  fontSize: '14px',
  marginBottom: '8px',
}

const progressTrackStyle: React.CSSProperties = {
  width: '100%',
  height: '9px',
  borderRadius: '999px',
  background: '#1A3152',
  overflow: 'hidden',
}

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  minWidth: '0',
}

const miniCardsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
  gap: '10px',
  marginTop: '22px',
}

const miniCardStyle: React.CSSProperties = {
  padding: '14px',
  borderRadius: '14px',
  border: '1px solid #1F3A5F',
  background: '#132641',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const miniCardLabelStyle: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: '12px',
}

const miniCardValueStyle: React.CSSProperties = {
  color: '#F8FAFC',
  fontSize: '22px',
}

const quickListStyle: React.CSSProperties = {
  display: 'grid',
  gap: '12px',
}

const quickItemStyle: React.CSSProperties = {
  padding: '15px',
  borderRadius: '15px',
  border: '1px solid #1F3A5F',
  background: '#132641',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
}

const quickLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#94A3B8',
  fontSize: '12px',
  marginBottom: '5px',
}

const quickValueStyle: React.CSSProperties = {
  color: '#F8FAFC',
  fontSize: '18px',
}

const quickBadgeStyle: React.CSSProperties = {
  padding: '6px 9px',
  borderRadius: '999px',
  background: 'rgba(37,99,235,.20)',
  color: '#60A5FA',
  fontSize: '11px',
  fontWeight: 800,
  whiteSpace: 'nowrap',
}

const emptyStateStyle: React.CSSProperties = {
  minHeight: '140px',
  borderRadius: '16px',
  border: '1px dashed #28538B',
  color: '#94A3B8',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  textAlign: 'center',
  padding: '20px',
}

const tableWrapperStyle: React.CSSProperties = {
  width: '100%',
  overflowX: 'auto',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '760px',
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  color: '#94A3B8',
  fontSize: '12px',
  fontWeight: 700,
  borderBottom: '1px solid #1F3A5F',
}

const tableCellStyle: React.CSSProperties = {
  padding: '15px 14px',
  color: '#CBD5E1',
  fontSize: '14px',
  borderBottom: '1px solid #1A3152',
  verticalAlign: 'middle',
}

const tableSecondaryTextStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '4px',
  color: '#94A3B8',
  fontSize: '12px',
}

const monthButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid #1F3A5F",
  background: "#132641",
  color: "#F8FAFC",
  cursor: "pointer",
  fontSize: 12,
}

const statusBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '6px 9px',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '11px',
  fontWeight: 800,
  whiteSpace: 'nowrap',
}