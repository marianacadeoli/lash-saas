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

type SituacaoParcela =
  | 'pago'
  | 'atrasado'
  | 'vence_hoje'
  | 'pendente'
  | 'renegociado'
  | 'cancelado'

export default function VisaoGeralSection() {
  const supabase = useMemo(() => createClient(), [])
  const hoje = new Date().toLocaleDateString('sv-SE')

  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [totalClientes, setTotalClientes] = useState(0)
  const [carregando, setCarregando] = useState(true)

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

    const [parcelasResponse, clientesResponse] = await Promise.all([
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
    if (status === 'renegociado') return 'renegociado'
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
    const agora = new Date()
    const ano = agora.getFullYear()
    const mes = agora.getMonth()

    return parcelasPagas.filter((parcela) => {
      if (!parcela.data_pagamento) return false

      const data = new Date(`${parcela.data_pagamento}T00:00:00`)

      return data.getFullYear() === ano && data.getMonth() === mes
    })
  }, [parcelasPagas])

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

  const recebidoNoMes = useMemo(
    () => somarValores(parcelasPagasNoMes),
    [parcelasPagasNoMes]
  )

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
    if (situacao === 'renegociado') return 'Renegociado'
    if (situacao === 'cancelado') return 'Cancelado'

    return 'Pendente'
  }

  function corSituacao(parcela: Parcela) {
    const situacao = descobrirSituacao(parcela)

    if (situacao === 'pago') return '#22c55e'
    if (situacao === 'atrasado') return '#ef4444'
    if (situacao === 'vence_hoje') return '#eab308'
    if (situacao === 'renegociado') return '#a855f7'
    if (situacao === 'cancelado') return '#71717a'

    return '#38bdf8'
  }

  return (
    <div style={pageContainerStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Visão Geral</h1>

          <p style={subtitleStyle}>
            Acompanhe os principais números e os próximos recebimentos.
          </p>
        </div>

        <button
          type="button"
          style={refreshButtonStyle}
          onClick={carregarDados}
          disabled={carregando}
        >
          {carregando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Total em aberto</span>
          <strong style={summaryValueStyle}>
            {formatarDinheiro(totalEmAberto)}
          </strong>
          <span style={summaryDetailStyle}>
            {parcelasPendentes.length}{' '}
            {parcelasPendentes.length === 1 ? 'parcela' : 'parcelas'}
          </span>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Valores em atraso</span>
          <strong style={{ ...summaryValueStyle, color: '#f87171' }}>
            {formatarDinheiro(totalEmAtraso)}
          </strong>
          <span style={summaryDetailStyle}>
            {parcelasAtrasadas.length}{' '}
            {parcelasAtrasadas.length === 1 ? 'parcela' : 'parcelas'}
          </span>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Recebido no mês</span>
          <strong style={{ ...summaryValueStyle, color: '#4ade80' }}>
            {formatarDinheiro(recebidoNoMes)}
          </strong>
          <span style={summaryDetailStyle}>
            {parcelasPagasNoMes.length}{' '}
            {parcelasPagasNoMes.length === 1 ? 'pagamento' : 'pagamentos'}
          </span>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Clientes cadastrados</span>
          <strong style={summaryValueStyle}>{totalClientes}</strong>
          <span style={summaryDetailStyle}>
            Total registrado no sistema
          </span>
        </div>
      </div>

      <div style={mainGridStyle}>
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
                <span style={quickLabelStyle}>Ticket médio em aberto</span>
                <strong style={quickValueStyle}>
                  {formatarDinheiro(
                    parcelasPendentes.length > 0
                      ? totalEmAberto / parcelasPendentes.length
                      : 0
                  )}
                </strong>
              </div>
              <span style={quickBadgeStyle}>Média</span>
            </div>

            <div style={quickItemStyle}>
              <div>
                <span style={quickLabelStyle}>Média recebida no mês</span>
                <strong style={quickValueStyle}>
                  {formatarDinheiro(
                    parcelasPagasNoMes.length > 0
                      ? recebidoNoMes / parcelasPagasNoMes.length
                      : 0
                  )}
                </strong>
              </div>
              <span style={quickBadgeStyle}>Mês atual</span>
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
}

const subtitleStyle: React.CSSProperties = {
  color: '#b4b4b4',
  lineHeight: 1.6,
  margin: 0,
}

const refreshButtonStyle: React.CSSProperties = {
  padding: '11px 16px',
  borderRadius: '12px',
  border: '1px solid #333333',
  background: '#18181b',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 700,
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
  border: '1px solid rgba(217,70,239,0.35)',
  background:
    'linear-gradient(135deg, rgba(217,70,239,0.14), rgba(88,28,135,0.12))',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '8px',
}

const summaryLabelStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '14px',
}

const summaryValueStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '29px',
  lineHeight: 1.1,
}

const summaryDetailStyle: React.CSSProperties = {
  color: '#d4d4d8',
  fontSize: '13px',
  fontWeight: 700,
}

const mainGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.45fr) minmax(280px, 0.75fr)',
  gap: '20px',
  marginTop: '24px',
}

const panelStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '22px',
  borderRadius: '20px',
  border: '1px solid #2a2a2a',
  background: '#101010',
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
  color: '#ffffff',
  fontSize: '20px',
}

const panelSubtitleStyle: React.CSSProperties = {
  margin: '6px 0 0',
  color: '#a1a1aa',
  fontSize: '14px',
  lineHeight: 1.5,
}

const percentageHighlightStyle: React.CSSProperties = {
  padding: '7px 11px',
  borderRadius: '999px',
  border: '1px solid rgba(34,197,94,0.45)',
  background: 'rgba(34,197,94,0.12)',
  color: '#4ade80',
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
  color: '#d4d4d8',
  fontSize: '14px',
  marginBottom: '8px',
}

const progressTrackStyle: React.CSSProperties = {
  width: '100%',
  height: '9px',
  borderRadius: '999px',
  background: '#27272a',
  overflow: 'hidden',
}

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  minWidth: '0',
}

const miniCardsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '10px',
  marginTop: '22px',
}

const miniCardStyle: React.CSSProperties = {
  padding: '14px',
  borderRadius: '14px',
  border: '1px solid #292929',
  background: '#151515',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const miniCardLabelStyle: React.CSSProperties = {
  color: '#8f8f97',
  fontSize: '12px',
}

const miniCardValueStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
}

const quickListStyle: React.CSSProperties = {
  display: 'grid',
  gap: '12px',
}

const quickItemStyle: React.CSSProperties = {
  padding: '15px',
  borderRadius: '15px',
  border: '1px solid #292929',
  background: '#151515',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
}

const quickLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#8f8f97',
  fontSize: '12px',
  marginBottom: '5px',
}

const quickValueStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '18px',
}

const quickBadgeStyle: React.CSSProperties = {
  padding: '6px 9px',
  borderRadius: '999px',
  background: 'rgba(217,70,239,0.12)',
  color: '#e879f9',
  fontSize: '11px',
  fontWeight: 800,
  whiteSpace: 'nowrap',
}

const emptyStateStyle: React.CSSProperties = {
  minHeight: '140px',
  borderRadius: '16px',
  border: '1px dashed #333333',
  color: '#a1a1aa',
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
  color: '#8f8f97',
  fontSize: '12px',
  fontWeight: 700,
  borderBottom: '1px solid #292929',
}

const tableCellStyle: React.CSSProperties = {
  padding: '15px 14px',
  color: '#d4d4d8',
  fontSize: '14px',
  borderBottom: '1px solid #222222',
  verticalAlign: 'middle',
}

const tableSecondaryTextStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '4px',
  color: '#8f8f97',
  fontSize: '12px',
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