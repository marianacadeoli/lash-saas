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

export default function AgendaSection() {
  const supabase = useMemo(() => createClient(), [])

  const hoje = new Date().toLocaleDateString('sv-SE')

  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [dataSelecionada, setDataSelecionada] = useState(hoje)
  const [mesAtual, setMesAtual] = useState(() => new Date())
  const [carregando, setCarregando] = useState(true)
  const [processandoId, setProcessandoId] = useState<number | null>(null)

  useEffect(() => {
    carregarParcelas()
  }, [])

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
    if (status === 'renegociado') return 'renegociado'
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
    if (situacao === 'renegociado') return 'Renegociada'
    if (situacao === 'cancelado') return 'Cancelada'

    return `Vence em ${formatarData(parcela.data_vencimento)}`
  }

  function corSituacao(situacao: SituacaoParcela) {
    if (situacao === 'pago') return '#22c55e'
    if (situacao === 'atrasado') return '#ef4444'
    if (situacao === 'vence_hoje') return '#eab308'
    if (situacao === 'renegociado') return '#a855f7'
    if (situacao === 'cancelado') return '#71717a'

    return '#38bdf8'
  }

  function fundoSituacao(situacao: SituacaoParcela) {
    if (situacao === 'pago') return 'rgba(34,197,94,0.12)'
    if (situacao === 'atrasado') return 'rgba(239,68,68,0.12)'
    if (situacao === 'vence_hoje') return 'rgba(234,179,8,0.12)'
    if (situacao === 'renegociado') return 'rgba(168,85,247,0.12)'
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

    const possuiRenegociada = statusParcelas.some(
      (status) => status === 'renegociado'
    )

    const novoStatus = todasPagas
      ? 'quitado'
      : possuiRenegociada
        ? 'renegociado'
        : 'ativo'

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

  async function marcarComoRenegociada(parcela: Parcela) {
    const confirmou = confirm(
      'Deseja marcar esta parcela como renegociada?'
    )

    if (!confirmou) return

    const userId = await pegarUserId()
    if (!userId) return

    setProcessandoId(parcela.id)

    const { error } = await supabase
      .from('Parcelas')
      .update({
        status: 'renegociado',
      })
      .eq('id', parcela.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao renegociar parcela:', error)
      alert('Não foi possível alterar a parcela.')
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
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>
            Vencimentos
          </h1>

          <p style={subtitleStyle}>
            Acompanhe parcelas, pagamentos previstos e valores em atraso.
          </p>
        </div>

        <button
          type="button"
          style={refreshButtonStyle}
          onClick={carregarParcelas}
          disabled={carregando}
        >
          {carregando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div style={summaryGridStyle}>
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

      <div style={calendarCardStyle}>
        <div style={calendarHeaderStyle}>
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

        <div style={legendStyle}>
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
              <span key={dia} style={weekDayStyle}>
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
                onClick={() => selecionarDia(dataDia)}
                style={{
                  ...dayButtonStyle,

                  background: ativo
                    ? 'linear-gradient(135deg, rgba(217,70,239,0.30), rgba(88,28,135,0.25))'
                    : '#111111',

                  border: ativo
                    ? '1px solid rgba(217,70,239,0.80)'
                    : diaAtual
                      ? '1px solid rgba(255,255,255,0.35)'
                      : '1px solid #2a2a2a',
                }}
              >
                <strong style={dayNumberStyle}>
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

              return (
                <div
                  key={parcela.id}
                  style={installmentCardStyle}
                >
                  <div style={installmentMainStyle}>
                    <div style={installmentHeaderStyle}>
                      <div>
                        <strong style={clientNameStyle}>
                          {cliente?.nome || 'Cliente não encontrado'}
                        </strong>

                        <p style={phoneStyle}>
                          {cliente?.telefone ||
                            'Telefone não informado'}
                        </p>
                      </div>

                      <span
                        style={{
                          ...statusBadgeStyle,
                          color: corSituacao(situacao),
                          background: fundoSituacao(situacao),
                          borderColor: corSituacao(situacao),
                        }}
                      >
                        {descricaoSituacao(parcela)}
                      </span>
                    </div>

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
                  </div>

                  <div style={actionsStyle}>
                    {situacao !== 'cancelado' && (
                      <button
                        type="button"
                        style={messageButtonStyle}
                        onClick={() => abrirLembreteWhatsApp(parcela)}
                        title="Enviar lembrete pelo WhatsApp"
                      >
                        <span aria-hidden="true">💬</span>
                        Lembrete
                      </button>
                    )}
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
  color: '#b4b4b4',
  lineHeight: 1.6,
  marginTop: 0,
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
  gap: '7px',
}

const summaryLabelStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '14px',
}

const summaryValueStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '30px',
  lineHeight: 1,
}

const summaryDetailStyle: React.CSSProperties = {
  color: '#d4d4d8',
  fontSize: '14px',
  fontWeight: 700,
}

const calendarCardStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '18px',
  borderRadius: '20px',
  border: '1px solid rgba(217,70,239,0.28)',
  background:
    'linear-gradient(135deg, rgba(217,70,239,0.10), rgba(88,28,135,0.08))',
}

const calendarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '12px',
}

const calendarNavButtonStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '11px',
  border: '1px solid rgba(217,70,239,0.35)',
  background: '#151515',
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: '22px',
}

const legendStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: '14px',
}

const legendItemStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  color: '#a1a1aa',
  fontSize: '13px',
}

const legendDotStyle: React.CSSProperties = {
  width: '9px',
  height: '9px',
  borderRadius: '50%',
}

const weekGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: '6px',
  marginBottom: '6px',
}

const weekDayStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '13px',
  textAlign: 'center',
}

const calendarGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: '6px',
}

const dayButtonStyle: React.CSSProperties = {
  minHeight: '62px',
  padding: '8px',
  borderRadius: '12px',
  color: '#ffffff',
  cursor: 'pointer',
  position: 'relative',
}

const dayNumberStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '15px',
}

const dayIndicatorsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '4px',
  marginTop: '7px',
}

const smallIndicatorStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '7px',
  height: '7px',
  borderRadius: '50%',
}

const quantityBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  right: '5px',
  bottom: '5px',
  minWidth: '18px',
  height: '18px',
  padding: '0 5px',
  borderRadius: '999px',
  background: '#d946ef',
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
  border: '1px solid #2a2a2a',
  background: '#101010',
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

const installmentListStyle: React.CSSProperties = {
  display: 'grid',
  gap: '14px',
}

const installmentCardStyle: React.CSSProperties = {
  padding: '20px',
  borderRadius: '18px',
  border: '1px solid #2a2a2a',
  background: '#151515',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '20px',
  flexWrap: 'wrap',
}

const installmentMainStyle: React.CSSProperties = {
  flex: '1 1 650px',
}

const installmentHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '14px',
  flexWrap: 'wrap',
}

const clientNameStyle: React.CSSProperties = {
  display: 'block',
  color: '#ffffff',
  fontSize: '18px',
}

const phoneStyle: React.CSSProperties = {
  marginTop: '4px',
  marginBottom: 0,
  color: '#a1a1aa',
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: '10px',
  marginTop: '16px',
}

const infoBoxStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '13px',
  background: '#101010',
  border: '1px solid #292929',
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
}

const infoLabelStyle: React.CSSProperties = {
  color: '#8f8f97',
  fontSize: '12px',
}

const infoValueStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
}

const observationStyle: React.CSSProperties = {
  marginTop: '14px',
  marginBottom: 0,
  color: '#b4b4b4',
  fontSize: '14px',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '9px',
  flexWrap: 'wrap',
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '11px 15px',
  borderRadius: '12px',
  border: 'none',
  background: '#d946ef',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 800,
}

const messageButtonStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderRadius: '12px',
  border: '1px solid #238b50',
  background: '#176b3d',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '11px 15px',
  borderRadius: '12px',
  border: '1px solid #3f3f46',
  background: '#27272a',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 700,
}