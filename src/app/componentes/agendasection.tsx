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
  | 'cancelado'

export default function AgendaSection() {
  const supabase = useMemo(() => createClient(), [])

  const hoje = new Date().toLocaleDateString('sv-SE')

  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [dataSelecionada, setDataSelecionada] = useState(hoje)
  const [mesAtual, setMesAtual] = useState(() => new Date())
  const [carregando, setCarregando] = useState(true)
  const [processandoId, setProcessandoId] = useState<number | null>(null)
  const [parcelaAbertaId, setParcelaAbertaId] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    carregarParcelas()
  }, [])

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

const calendarGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: '7px',
}

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  function pegarCliente(parcela: Parcela): Cliente | null {
    if (!parcela.Clientes) {
      return null
    }

    if (Array.isArray(parcela.Clientes)) {
      return parcela.Clientes[0] || null
    }

    return parcela.Clientes
  }

  async function carregarParcelas() {
    setCarregando(true)

    const userId = await pegarUserId()

    if (!userId) {
      setParcelas([])
      setCarregando(false)
      return
    }

    const { data, error } = await supabase
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
      .order('data_vencimento', { ascending: true })
      .order('numero_parcela', { ascending: true })

    if (error) {
      console.error('Erro ao carregar parcelas:', error)
      alert('Não foi possível carregar os vencimentos.')
      setParcelas([])
      setCarregando(false)
      return
    }

    setParcelas((data as Parcela[]) || [])
    setCarregando(false)
  }

  function normalizarStatus(status: string) {
    return status?.trim().toLowerCase() || 'pendente'
  }

  function descobrirSituacao(parcela: Parcela): SituacaoParcela {
    const status = normalizarStatus(parcela.status)

    if (status === 'pago') return 'pago'
    if (status === 'cancelado') return 'cancelado'

    if (parcela.data_vencimento < hoje) {
      return 'atrasado'
    }

    if (parcela.data_vencimento === hoje) {
      return 'vence_hoje'
    }

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

  function calcularDiasAtraso(dataVencimento: string) {
    const vencimento = new Date(`${dataVencimento}T00:00:00`)
    const dataHoje = new Date(`${hoje}T00:00:00`)

    const diferenca = dataHoje.getTime() - vencimento.getTime()

    return Math.max(0, Math.floor(diferenca / (1000 * 60 * 60 * 24)))
  }

  function descricaoSituacao(parcela: Parcela) {
    const situacao = descobrirSituacao(parcela)

    if (situacao === 'pago') {
      return `Pago em ${formatarData(parcela.data_pagamento)}`
    }

    if (situacao === 'atrasado') {
      const dias = calcularDiasAtraso(parcela.data_vencimento)

      return dias === 1 ? 'Atrasada há 1 dia' : `Atrasada há ${dias} dias`
    }

    if (situacao === 'vence_hoje') return 'Vence hoje'
    if (situacao === 'cancelado') return 'Cancelada'

    return `Vence em ${formatarData(parcela.data_vencimento)}`
  }

  function corSituacao(situacao: SituacaoParcela) {
    if (situacao === 'pago') return '#22c55e'
    if (situacao === 'atrasado') return '#ef4444'
    if (situacao === 'vence_hoje') return '#eab308'
    if (situacao === 'cancelado') return '#71717a'

    return '#38bdf8'
  }

  function fundoSituacao(situacao: SituacaoParcela) {
    if (situacao === 'pago') return 'rgba(34,197,94,0.12)'
    if (situacao === 'atrasado') return 'rgba(239,68,68,0.12)'
    if (situacao === 'vence_hoje') return 'rgba(234,179,8,0.12)'
    if (situacao === 'cancelado') return 'rgba(113,113,122,0.12)'

    return 'rgba(56,189,248,0.12)'
  }

  const parcelasDoDia = useMemo(() => {
    return parcelas.filter(
      (parcela) => parcela.data_vencimento === dataSelecionada
    )
  }, [parcelas, dataSelecionada])

  const parcelasVencendoHoje = useMemo(() => {
    return parcelas.filter(
      (parcela) => descobrirSituacao(parcela) === 'vence_hoje'
    )
  }, [parcelas])

  const parcelasAtrasadas = useMemo(() => {
    return parcelas.filter(
      (parcela) => descobrirSituacao(parcela) === 'atrasado'
    )
  }, [parcelas])

  const parcelasPagasNoMes = useMemo(() => {
    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()

    return parcelas.filter((parcela) => {
      if (
        descobrirSituacao(parcela) !== 'pago' ||
        !parcela.data_pagamento
      ) {
        return false
      }

      const dataPagamento = new Date(
        `${parcela.data_pagamento}T00:00:00`
      )

      return (
        dataPagamento.getFullYear() === ano &&
        dataPagamento.getMonth() === mes
      )
    })
  }, [parcelas, mesAtual])

  const valorEsperadoHoje = useMemo(() => {
    return parcelasVencendoHoje.reduce(
      (total, parcela) => total + Number(parcela.valor || 0),
      0
    )
  }, [parcelasVencendoHoje])

  const valorAtrasado = useMemo(() => {
    return parcelasAtrasadas.reduce(
      (total, parcela) => total + Number(parcela.valor || 0),
      0
    )
  }, [parcelasAtrasadas])

  const valorRecebidoMes = useMemo(() => {
    return parcelasPagasNoMes.reduce(
      (total, parcela) => total + Number(parcela.valor || 0),
      0
    )
  }, [parcelasPagasNoMes])

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

  function resumoDoDia(dataIso: string) {
    const parcelasNaData = parcelas.filter(
      (parcela) =>
        parcela.data_vencimento === dataIso &&
        descobrirSituacao(parcela) !== 'cancelado'
    )

    return {
      total: parcelasNaData.length,

      pagas: parcelasNaData.filter(
        (parcela) => descobrirSituacao(parcela) === 'pago'
      ).length,

      atrasadas: parcelasNaData.filter(
        (parcela) => descobrirSituacao(parcela) === 'atrasado'
      ).length,

      pendentes: parcelasNaData.filter((parcela) => {
        const situacao = descobrirSituacao(parcela)

        return situacao === 'pendente' || situacao === 'vence_hoje'
      }).length,
    }
  }

  async function sincronizarStatusEmprestimo(
    emprestimoId: number | null,
    userId: string
  ) {
    if (!emprestimoId) return

    const { data, error } = await supabase
      .from('Parcelas')
      .select('status')
      .eq('emprestimo_id', emprestimoId)
      .eq('user_id', userId)

    if (error) {
      console.warn('Erro ao sincronizar empréstimo:', error.message)
      return
    }

    const statusParcelas = (data ?? []).map((item) =>
      normalizarStatus(item.status)
    )

    const todasPagas =
      statusParcelas.length > 0 &&
      statusParcelas.every(
        (status) => status === 'pago' || status === 'paga'
      )

    const novoStatus = todasPagas ? 'quitado' : 'ativo'

    const { error: erroAtualizacao } = await supabase
      .from('Emprestimos')
      .update({ status: novoStatus })
      .eq('id', emprestimoId)
      .eq('user_id', userId)

    if (erroAtualizacao) {
      console.warn(
        'Erro ao atualizar status do empréstimo:',
        erroAtualizacao.message
      )
    }
  }

  function abrirLembreteWhatsApp(parcela: Parcela) {
    const cliente = pegarCliente(parcela)
    const telefone = cliente?.telefone?.replace(/\D/g, '')

    if (!telefone) {
      alert('Este cliente não possui telefone cadastrado.')
      return
    }

    const nome = cliente?.nome || 'cliente'
    const situacao = descobrirSituacao(parcela)

    const introducao =
      situacao === 'atrasado'
        ? `Olá, ${nome}! Tudo bem? Passando para lembrar que a parcela nº ${parcela.numero_parcela}, no valor de ${formatarDinheiro(parcela.valor)}, venceu em ${formatarData(parcela.data_vencimento)}.`
        : `Olá, ${nome}! Tudo bem? Passando para lembrar que a parcela nº ${parcela.numero_parcela}, no valor de ${formatarDinheiro(parcela.valor)}, vence em ${formatarData(parcela.data_vencimento)}.`

    const mensagem = `${introducao}\n\nQuando realizar o pagamento, por favor me avise. Obrigada!`
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(
      mensagem
    )}`

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function registrarPagamento(parcela: Parcela) {
    const cliente = pegarCliente(parcela)

    const confirmou = confirm(
      `Confirmar o recebimento de ${formatarDinheiro(
        parcela.valor
      )} de ${cliente?.nome || 'este cliente'}?`
    )

    if (!confirmou) return

    const userId = await pegarUserId()
    if (!userId) return

    setProcessandoId(parcela.id)

    const { error } = await supabase
      .from('Parcelas')
      .update({
        status: 'pago',
        data_pagamento: hoje,
      })
      .eq('id', parcela.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao registrar pagamento:', error)
      alert('Não foi possível registrar o pagamento.')
      setProcessandoId(null)
      return
    }

    await sincronizarStatusEmprestimo(
      parcela.emprestimo_id,
      userId
    )
    await carregarParcelas()
    setProcessandoId(null)
  }

  async function desfazerPagamento(parcela: Parcela) {
    const confirmou = confirm(
      'Deseja desfazer o registro deste pagamento?'
    )

    if (!confirmou) return

    const userId = await pegarUserId()
    if (!userId) return

    setProcessandoId(parcela.id)

    const { error } = await supabase
      .from('Parcelas')
      .update({
        status: 'pendente',
        data_pagamento: null,
      })
      .eq('id', parcela.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao desfazer pagamento:', error)
      alert('Não foi possível desfazer o pagamento.')
      setProcessandoId(null)
      return
    }

    await sincronizarStatusEmprestimo(
      parcela.emprestimo_id,
      userId
    )
    await carregarParcelas()
    setProcessandoId(null)
  }

  return (
    <div style={pageContainerStyle}>
      {/* Deixa o calendário mais compacto e arredondado no mobile */}
      <style>{`
        @media (max-width: 640px) {
          .lash-calendar-card {
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .lash-calendar-header h2 {
            font-size: 16px !important;
          }

          .lash-legend {
            gap: 10px !important;
            margin-bottom: 12px !important;
          }

          .lash-legend span {
            font-size: 11px !important;
          }

          .lash-week-day {
            font-size: 11px !important;
          }

          .lash-day-button {
            min-height: 48px !important;
            border-radius: 11px !important;
            padding: 6px !important;
          }

          .lash-day-number {
            font-size: 13px !important;
          }
        }
      `}</style>

      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>
            Vencimentos
          </h1>

          <p style={subtitleStyle}>
            Acompanhe parcelas, pagamentos previstos e valores em atraso.
          </p>
        </div>
      </div>

  <div
  style={{
    ...summaryGridStyle,
    gridTemplateColumns: isMobile
      ? '1fr 1fr'
      : 'repeat(4, minmax(0, 1fr))',
  }}
>
  <div style={summaryCardStyle}>
    <span style={summaryLabelStyle}>Vencem hoje</span>

    <strong style={summaryValueStyle}>
      {parcelasVencendoHoje.length}
    </strong>

    <span style={summaryDetailStyle}>
      {formatarDinheiro(valorEsperadoHoje)}
    </span>
  </div>

  <div style={summaryCardStyle}>
    <span style={summaryLabelStyle}>Parcelas em atraso</span>

    <strong style={summaryValueStyle}>
      {parcelasAtrasadas.length}
    </strong>

    <span
      style={{
        ...summaryDetailStyle,
        color: '#f87171',
      }}
    >
      {formatarDinheiro(valorAtrasado)}
    </span>
  </div>

  <div style={summaryCardStyle}>
    <span style={summaryLabelStyle}>Pagas no mês</span>

    <strong style={summaryValueStyle}>
      {parcelasPagasNoMes.length}
    </strong>

    <span
      style={{
        ...summaryDetailStyle,
        color: '#4ade80',
      }}
    >
      {formatarDinheiro(valorRecebidoMes)}
    </span>
  </div>

  <div style={summaryCardStyle}>
    <span style={summaryLabelStyle}>Data selecionada</span>

    <strong
      style={{
        ...summaryValueStyle,
        fontSize: '20px',
      }}
    >
      {formatarData(dataSelecionada)}
    </strong>

    <span style={summaryDetailStyle}>
      {parcelasDoDia.length}{' '}
      {parcelasDoDia.length === 1 ? 'parcela' : 'parcelas'}
    </span>
  </div>
</div>

      <div style={calendarCardStyle} className="lash-calendar-card">
        <div style={calendarHeaderStyle} className="lash-calendar-header">
          <button
            type="button"
            style={calendarNavButtonStyle}
            onClick={() => mudarMes('anterior')}
            aria-label="Mês anterior"
          >
            ‹
          </button>

          <h2
            style={{
              margin: 0,
              textTransform: 'capitalize',
            }}
          >
            {mesAtual.toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>

          <button
            type="button"
            style={calendarNavButtonStyle}
            onClick={() => mudarMes('proximo')}
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>

        <div style={legendStyle} className="lash-legend">
          <span style={legendItemStyle}>
            <span
              style={{
                ...legendDotStyle,
                background: '#22c55e',
              }}
            />
            Pago
          </span>

          <span style={legendItemStyle}>
            <span
              style={{
                ...legendDotStyle,
                background: '#eab308',
              }}
            />
            Pendente
          </span>

          <span style={legendItemStyle}>
            <span
              style={{
                ...legendDotStyle,
                background: '#ef4444',
              }}
            />
            Atrasado
          </span>
        </div>

        <div style={weekGridStyle}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(
            (dia) => (
              <span key={dia} style={weekDayStyle} className="lash-week-day">
                {dia}
              </span>
            )
          )}
        </div>

        <div style={calendarGridStyle}>
          {gerarDiasCalendario().map((dataDia, index) => {
            if (!dataDia) {
              return <div key={`vazio-${index}`} />
            }

            const ativo = dataDia === dataSelecionada
            const diaAtual = dataDia === hoje
            const resumo = resumoDoDia(dataDia)

            return (
              <button
                type="button"
                key={dataDia}
                className="lash-day-button"
                onClick={() => selecionarDia(dataDia)}
                style={{
                  ...dayButtonStyle,

                  background: ativo
     ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.32), rgba(19, 38, 65, 0.95))'
  : '#0c1828',

                  border: ativo
                   ? '1px solid #2563EB'
  : diaAtual
    ? '1px solid #60d1fa'
    : '1px solid #193251',

                  boxShadow: ativo
                    ? '0 0 0 3px rgba(37, 99, 235, 0.18)'
                    : 'none',
                }}
              >
                <strong style={dayNumberStyle} className="lash-day-number">
                  {Number(dataDia.split('-')[2])}
                </strong>

                {resumo.total > 0 && (
                  <div style={dayIndicatorsStyle}>
                    {resumo.pagas > 0 && (
                      <span
                        title={`${resumo.pagas} pagas`}
                        style={{
                          ...smallIndicatorStyle,
                          background: '#22c55e',
                        }}
                      />
                    )}

                    {resumo.pendentes > 0 && (
                      <span
                        title={`${resumo.pendentes} pendentes`}
                        style={{
                          ...smallIndicatorStyle,
                          background: '#eab308',
                        }}
                      />
                    )}

                    {resumo.atrasadas > 0 && (
                      <span
                        title={`${resumo.atrasadas} atrasadas`}
                        style={{
                          ...smallIndicatorStyle,
                          background: '#ef4444',
                        }}
                      />
                    )}
                  </div>
                )}

                {resumo.total > 0 && (
                  <span style={quantityBadgeStyle}>
                    {resumo.total}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div style={listCardStyle}>
        <div style={listHeaderStyle}>
          <div>
            <h2 style={{ margin: 0 }}>
              Vencimentos de {formatarData(dataSelecionada)}
            </h2>

            <p
              style={{
                ...subtitleStyle,
                marginBottom: 0,
              }}
            >
              Consulte e registre os pagamentos desta data.
            </p>
          </div>
        </div>

        {carregando ? (
          <div style={emptyStateStyle}>
            Carregando vencimentos...
          </div>
        ) : parcelasDoDia.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>Nenhum vencimento nesta data.</strong>

            <span>
              As parcelas serão adicionadas automaticamente quando um
              empréstimo for cadastrado.
            </span>
          </div>
        ) : (
          <div style={installmentListStyle}>
            {parcelasDoDia.map((parcela) => {
              const situacao = descobrirSituacao(parcela)
              const processando = processandoId === parcela.id
              const cliente = pegarCliente(parcela)
              const aberto = parcelaAbertaId === parcela.id

              return (
                <div
                  key={parcela.id}
                  style={installmentCardStyle}
                >
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      setParcelaAbertaId(aberto ? null : parcela.id)
                    }
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <strong style={{ ...clientNameStyle, minWidth: 0 }}>
                        {cliente?.nome || 'Cliente não encontrado'}
                      </strong>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setParcelaAbertaId(aberto ? null : parcela.id)
                        }}
                        style={chevronButtonStyle}
                        aria-label={aberto ? 'Recolher parcela' : 'Expandir parcela'}
                        aria-expanded={aberto}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            lineHeight: 1,
                            transition: 'transform 0.2s ease',
                            transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        >
                          ⌄
                        </span>
                      </button>
                    </div>

                    <p style={phoneStyle}>
                      {cliente?.telefone || 'Telefone não informado'}
                    </p>

                    <span
                      style={{
                        ...statusBadgeStyle,
                        marginTop: '10px',
                        display: 'inline-flex',
                        color: corSituacao(situacao),
                        background: fundoSituacao(situacao),
                        borderColor: corSituacao(situacao),
                      }}
                    >
                      {descricaoSituacao(parcela)}
                    </span>
                  </div>

                  {aberto && (
                    <div style={installmentMainStyle}>
                      <div style={installmentInfoGridStyle}>
                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>Parcela</span>

                          <strong style={infoValueStyle}>
                            Nº {parcela.numero_parcela}
                          </strong>
                        </div>

                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>Valor</span>

                          <strong style={infoValueStyle}>
                            {formatarDinheiro(parcela.valor)}
                          </strong>
                        </div>

                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>
                            Vencimento
                          </span>

                          <strong style={infoValueStyle}>
                            {formatarData(parcela.data_vencimento)}
                          </strong>
                        </div>

                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>
                            Pagamento
                          </span>

                          <strong style={infoValueStyle}>
                            {formatarData(parcela.data_pagamento)}
                          </strong>
                        </div>
                      </div>

                      {parcela.observacoes && (
                        <p style={observationStyle}>
                          <strong>Observação:</strong>{' '}
                          {parcela.observacoes}
                        </p>
                      )}

                      {(situacao === 'vence_hoje' || situacao === 'atrasado') && (
                        <div style={actionsStyle}>
                          <button
                            type="button"
                            style={messageButtonStyle}
                            onClick={() => abrirLembreteWhatsApp(parcela)}
                            title="Enviar lembrete pelo WhatsApp"
                          >
                            <span aria-hidden="true">💬</span>
                            Lembrete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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

const subtitleStyle: React.CSSProperties = {
  color: '#94A3B8',
  lineHeight: 1.6,
  marginTop: 0,
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
  gap: '7px',
}

const summaryLabelStyle: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: '14px',
}

const summaryValueStyle: React.CSSProperties = {
  color: '#F8FAFC',
  fontSize: '30px',
  lineHeight: 1,
}

const summaryDetailStyle: React.CSSProperties = {
  color: '#CBD5E1',
  fontSize: '14px',
  fontWeight: 700,
}

const calendarCardStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '22px',
  borderRadius: '24px',
  border: '1px solid #1F3A5F',
  background: 'linear-gradient(180deg,#101F36 0%, #0D1B2E 100%)',
}

const calendarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '16px',
}

const calendarNavButtonStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '11px',
  border: '1px solid #2563EB',
  background: '#132641',
  color: '#60A5FA',
  cursor: 'pointer',
  fontSize: '20px',
  fontWeight: 700,
  transition: 'background 0.15s ease',
}

const legendStyle: React.CSSProperties = {
  display: 'flex',
  gap: '18px',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: '16px',
}

const legendItemStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  color: '#94A3B8',
  fontSize: '13px',
}

const legendDotStyle: React.CSSProperties = {
  width: '9px',
  height: '9px',
  borderRadius: '50%',
}

const weekGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7,minmax(0,1fr))',
  gap: '7px',
  marginBottom: '8px',
}

const weekDayStyle: React.CSSProperties = {
  color: '#5C7794',
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  textAlign: 'center',
}

const dayButtonStyle: React.CSSProperties = {
  minHeight: '64px',
  padding: '9px',
  borderRadius: '14px',
  color: '#F8FAFC',
  cursor: 'pointer',
  position: 'relative',
  background: '#0c1828',
  border: '1px solid #193251',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  fontSize: '14px',
  transition: 'transform 0.12s ease, box-shadow 0.12s ease',
};

const dayNumberStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'center',
  fontSize: '15px',
  lineHeight: '18px',
  fontWeight: 700,
};

const dayIndicatorsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '5px',
  marginTop: '10px',
};

const smallIndicatorStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  boxShadow: '0 0 0 2px rgba(0,0,0,0.25)',
}

const quantityBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  right: '5px',
  bottom: '5px',
  minWidth: '18px',
  height: '18px',
  padding: '0 5px',
  borderRadius: '999px',
  background: '#2563EB',
  color: '#ffffff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  fontWeight: 800,
}

const listCardStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '22px',
  borderRadius: '20px',
  border: '1px solid #1F3A5F',
  background: '#0D1B2E',
}

const listHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '18px',
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

const installmentListStyle: React.CSSProperties = {
  display: 'grid',
  gap: '14px',
}

const installmentCardStyle: React.CSSProperties = {
  padding: '18px',
  borderRadius: '18px',
  border: '1px solid #1F3A5F',
  background: '#132641',
}

const installmentMainStyle: React.CSSProperties = {
  marginTop: '16px',
  paddingTop: '16px',
  borderTop: '1px solid #1F3A5F',
  flex: '1 1 650px',
}

const installmentHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '14px',
  flexWrap: 'wrap',
}

const chevronButtonStyle: React.CSSProperties = {
  width: '30px',
  height: '30px',
  padding: 0,
  borderRadius: '8px',
  border: '1px solid #28538B',
  background: '#132641',
  color: '#F8FAFC',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '15px',
  lineHeight: 1,
  flexShrink: 0,
}

const clientNameStyle: React.CSSProperties = {
  display: 'block',
  color: '#F8FAFC',
  fontSize: '18px',
}

const phoneStyle: React.CSSProperties = {
  marginTop: '4px',
  marginBottom: 0,
  color: '#94A3B8',
  fontSize: '14px',
}

const statusBadgeStyle: React.CSSProperties = {
  padding: '7px 11px',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '12px',
  fontWeight: 800,
}

const installmentInfoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))',
  gap: '10px',
  marginTop: '16px',
}

const infoBoxStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '13px',
  background: '#0D1B2E',
  border: '1px solid #1F3A5F',
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
}

const infoLabelStyle: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: '12px',
}

const infoValueStyle: React.CSSProperties = {
  color: '#F8FAFC',
  fontSize: '14px',
}

const observationStyle: React.CSSProperties = {
  marginTop: '14px',
  marginBottom: 0,
  color: '#CBD5E1',
  fontSize: '14px',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '9px',
  flexWrap: 'wrap',
  marginTop: '14px',
}

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: '10px',
  background: '#2563EB',
  color: '#fff',
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer',
}

const messageButtonStyle: React.CSSProperties = {
  border: '1px solid #16A34A',
  borderRadius: '9px',
  background: 'rgba(22,163,74,.15)',
  color: '#86EFAC',
  padding: '9px 11px',
  cursor: 'pointer',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
}

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #1F3A5F',
  borderRadius: '9px',
  background: '#132641',
  color: '#F8FAFC',
  padding: '9px 11px',
  cursor: 'pointer',
  fontWeight: 700,
}