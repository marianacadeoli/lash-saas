'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Cliente = {
  id: number
  nome: string
  telefone: string | null
}

type Emprestimo = {
  id: number
  cliente_id: number
  valor_emprestado: number
  taxa_juros: number
  valor_total: number
  quantidade_parcelas: number
  data_emprestimo: string
  primeiro_vencimento: string
  status: 'ativo' | 'quitado' | 'atrasado' | 'renegociado'
  observacoes: string | null
  user_id: string
  created_at?: string
  cliente?: Cliente | null
}

type Parcela = {
  id: number
  emprestimo_id: number
  numero_parcela: number
  valor: number
  vencimento: string
  status: 'pendente' | 'paga' | 'atrasada'
  data_pagamento: string | null
}

type FormEmprestimo = {
  clienteId: string
  valorEmprestado: string
  taxaJuros: string
  quantidadeParcelas: string
  dataEmprestimo: string
  primeiroVencimento: string
  observacoes: string
}

const formInicial: FormEmprestimo = {
  clienteId: '',
  valorEmprestado: '',
  taxaJuros: '10',
  quantidadeParcelas: '1',
  dataEmprestimo: new Date().toISOString().slice(0, 10),
  primeiroVencimento: '',
  observacoes: '',
}

export default function EmprestimosSection() {
  const supabase = createClient()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [form, setForm] = useState<FormEmprestimo>(formInicial)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [detalhesId, setDetalhesId] = useState<number | null>(null)

  useEffect(() => {
    void carregarDados()
  }, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id ?? null
  }

  async function carregarDados() {
    setCarregando(true)

    try {
      const userId = await pegarUserId()
      if (!userId) return

      const [clientesResposta, emprestimosResposta, parcelasResposta] =
        await Promise.all([
          supabase
            .from('Clientes')
            .select('id, nome, telefone')
            .eq('user_id', userId)
            .order('nome'),

          supabase
            .from('Emprestimos')
            .select(`
              *,
              cliente:Clientes (
                id,
                nome,
                telefone
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),

          supabase
            .from('Parcelas')
            .select('*')
            .eq('user_id', userId)
            .order('vencimento'),
        ])

      if (clientesResposta.error) throw clientesResposta.error
      if (emprestimosResposta.error) throw emprestimosResposta.error
      if (parcelasResposta.error) throw parcelasResposta.error

      setClientes(clientesResposta.data ?? [])
      setEmprestimos((emprestimosResposta.data ?? []) as Emprestimo[])
      setParcelas((parcelasResposta.data ?? []) as Parcela[])
    } catch (error) {
      console.error('Erro ao carregar empréstimos:', error)
      alert('Não foi possível carregar os empréstimos.')
    } finally {
      setCarregando(false)
    }
  }

  function atualizarForm(campo: keyof FormEmprestimo, valor: string) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  function limparFormulario() {
    setForm(formInicial)
    setEditandoId(null)
  }

  function adicionarMes(data: Date, meses: number) {
    const novaData = new Date(data)
    const diaOriginal = novaData.getDate()

    novaData.setMonth(novaData.getMonth() + meses)

    if (novaData.getDate() !== diaOriginal) {
      novaData.setDate(0)
    }

    return novaData
  }

  function dataParaBanco(data: Date) {
    return data.toISOString().slice(0, 10)
  }

  function calcularValores() {
    const valorEmprestado = Number(form.valorEmprestado.replace(',', '.'))
    const taxaJuros = Number(form.taxaJuros.replace(',', '.'))
    const quantidadeParcelas = Number(form.quantidadeParcelas)

    const valorTotal = valorEmprestado * (1 + taxaJuros / 100)
    const valorParcela =
      quantidadeParcelas > 0 ? valorTotal / quantidadeParcelas : 0

    return {
      valorEmprestado,
      taxaJuros,
      quantidadeParcelas,
      valorTotal,
      valorParcela,
    }
  }

  async function salvarEmprestimo() {
    const userId = await pegarUserId()
    if (!userId) return

    const {
      valorEmprestado,
      taxaJuros,
      quantidadeParcelas,
      valorTotal,
      valorParcela,
    } = calcularValores()

    if (
      !form.clienteId ||
      !valorEmprestado ||
      taxaJuros < 0 ||
      quantidadeParcelas < 1 ||
      !form.dataEmprestimo ||
      !form.primeiroVencimento
    ) {
      alert('Preencha corretamente todos os campos obrigatórios.')
      return
    }

    setSalvando(true)

    try {
      const payload = {
        cliente_id: Number(form.clienteId),
        valor_emprestado: valorEmprestado,
        taxa_juros: taxaJuros,
        valor_total: valorTotal,
        quantidade_parcelas: quantidadeParcelas,
        data_emprestimo: form.dataEmprestimo,
        primeiro_vencimento: form.primeiroVencimento,
        observacoes: form.observacoes.trim() || null,
        status: 'ativo',
        user_id: userId,
      }

      if (editandoId) {
        const { error } = await supabase
          .from('Emprestimos')
          .update(payload)
          .eq('id', editandoId)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { data: novoEmprestimo, error: erroEmprestimo } = await supabase
          .from('Emprestimos')
          .insert(payload)
          .select('id')
          .single()

        if (erroEmprestimo) throw erroEmprestimo

        const primeiraData = new Date(`${form.primeiroVencimento}T12:00:00`)

        const novasParcelas = Array.from(
          { length: quantidadeParcelas },
          (_, indice) => ({
            emprestimo_id: novoEmprestimo.id,
            numero_parcela: indice + 1,
            valor: Number(valorParcela.toFixed(2)),
            vencimento: dataParaBanco(adicionarMes(primeiraData, indice)),
            status: 'pendente',
            data_pagamento: null,
            user_id: userId,
          })
        )

        const { error: erroParcelas } = await supabase
          .from('Parcelas')
          .insert(novasParcelas)

        if (erroParcelas) throw erroParcelas
      }

      limparFormulario()
      await carregarDados()
    } catch (error) {
      console.error('Erro ao salvar empréstimo:', error)
      alert('Não foi possível salvar o empréstimo.')
    } finally {
      setSalvando(false)
    }
  }

  function editarEmprestimo(emprestimo: Emprestimo) {
    setEditandoId(emprestimo.id)
    setForm({
      clienteId: String(emprestimo.cliente_id),
      valorEmprestado: String(emprestimo.valor_emprestado),
      taxaJuros: String(emprestimo.taxa_juros),
      quantidadeParcelas: String(emprestimo.quantidade_parcelas),
      dataEmprestimo: emprestimo.data_emprestimo,
      primeiroVencimento: emprestimo.primeiro_vencimento,
      observacoes: emprestimo.observacoes ?? '',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function excluirEmprestimo(id: number) {
    const confirmou = window.confirm(
      'Excluir este empréstimo e todas as suas parcelas?'
    )

    if (!confirmou) return

    const userId = await pegarUserId()
    if (!userId) return

    try {
      const { error: erroParcelas } = await supabase
        .from('Parcelas')
        .delete()
        .eq('emprestimo_id', id)
        .eq('user_id', userId)

      if (erroParcelas) throw erroParcelas

      const { error: erroEmprestimo } = await supabase
        .from('Emprestimos')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (erroEmprestimo) throw erroEmprestimo

      await carregarDados()
    } catch (error) {
      console.error('Erro ao excluir empréstimo:', error)
      alert('Não foi possível excluir o empréstimo.')
    }
  }

  async function registrarPagamento(parcela: Parcela) {
    const userId = await pegarUserId()
    if (!userId) return

    try {
      const { error } = await supabase
        .from('Parcelas')
        .update({
          status: 'paga',
          data_pagamento: new Date().toISOString().slice(0, 10),
        })
        .eq('id', parcela.id)
        .eq('user_id', userId)

      if (error) throw error

      const parcelasDoEmprestimo = parcelas.filter(
        (item) => item.emprestimo_id === parcela.emprestimo_id
      )

      const todasPagas = parcelasDoEmprestimo.every(
        (item) => item.id === parcela.id || item.status === 'paga'
      )

      if (todasPagas) {
        await supabase
          .from('Emprestimos')
          .update({ status: 'quitado' })
          .eq('id', parcela.emprestimo_id)
          .eq('user_id', userId)
      }

      await carregarDados()
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error)
      alert('Não foi possível registrar o pagamento.')
    }
  }

  const emprestimosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return emprestimos.filter((emprestimo) => {
      const nomeCliente = emprestimo.cliente?.nome?.toLowerCase() ?? ''
      const combinaBusca = nomeCliente.includes(termo)
      const combinaStatus =
        filtroStatus === 'todos' || emprestimo.status === filtroStatus

      return combinaBusca && combinaStatus
    })
  }, [emprestimos, busca, filtroStatus])

  const resumo = useMemo(() => {
    const totalEmprestado = emprestimos.reduce(
      (total, item) => total + Number(item.valor_emprestado),
      0
    )

    const totalAReceber = parcelas
      .filter((parcela) => parcela.status !== 'paga')
      .reduce((total, parcela) => total + Number(parcela.valor), 0)

    const ativos = emprestimos.filter(
      (item) => item.status === 'ativo'
    ).length

    const atrasados = parcelas.filter((parcela) => {
      return (
        parcela.status !== 'paga' &&
        new Date(`${parcela.vencimento}T23:59:59`) < new Date()
      )
    }).length

    return {
      totalEmprestado,
      totalAReceber,
      ativos,
      atrasados,
    }
  }, [emprestimos, parcelas])

  const previa = calcularValores()

  return (
    <div style={pageContainerStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Empréstimos</h1>
          <p style={subtitleStyle}>
            Cadastre empréstimos, acompanhe parcelas e registre pagamentos.
          </p>
        </div>
      </div>

      <div style={summaryGridStyle}>
        <ResumoCard
          titulo="Total emprestado"
          valor={formatarMoeda(resumo.totalEmprestado)}
        />
        <ResumoCard
          titulo="Valor a receber"
          valor={formatarMoeda(resumo.totalAReceber)}
        />
        <ResumoCard titulo="Empréstimos ativos" valor={String(resumo.ativos)} />
        <ResumoCard titulo="Parcelas atrasadas" valor={String(resumo.atrasados)} />
      </div>

      <section style={formCardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>
              {editandoId ? 'Editar empréstimo' : 'Novo empréstimo'}
            </h2>
            <p style={sectionDescriptionStyle}>
              Informe os dados para calcular o total e gerar as parcelas.
            </p>
          </div>

          {editandoId && (
            <button onClick={limparFormulario} style={secondaryButtonStyle}>
              Cancelar edição
            </button>
          )}
        </div>

        <div style={formGridStyle}>
          <label style={labelStyle}>
            Cliente
            <select
              value={form.clienteId}
              onChange={(e) => atualizarForm('clienteId', e.target.value)}
              style={inputStyle}
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Valor emprestado
            <input
              value={form.valorEmprestado}
              onChange={(e) =>
                atualizarForm('valorEmprestado', e.target.value)
              }
              placeholder="Ex.: 5000"
              inputMode="decimal"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Juros total (%)
            <input
              value={form.taxaJuros}
              onChange={(e) => atualizarForm('taxaJuros', e.target.value)}
              placeholder="Ex.: 10"
              inputMode="decimal"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Quantidade de parcelas
            <input
              value={form.quantidadeParcelas}
              onChange={(e) =>
                atualizarForm('quantidadeParcelas', e.target.value)
              }
              type="number"
              min="1"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Data do empréstimo
            <input
              value={form.dataEmprestimo}
              onChange={(e) =>
                atualizarForm('dataEmprestimo', e.target.value)
              }
              type="date"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Primeiro vencimento
            <input
              value={form.primeiroVencimento}
              onChange={(e) =>
                atualizarForm('primeiroVencimento', e.target.value)
              }
              type="date"
              style={inputStyle}
            />
          </label>
        </div>

        <label style={{ ...labelStyle, marginTop: '14px' }}>
          Observações
          <textarea
            value={form.observacoes}
            onChange={(e) => atualizarForm('observacoes', e.target.value)}
            placeholder="Informações adicionais sobre o empréstimo"
            style={{ ...inputStyle, minHeight: '88px', resize: 'vertical' }}
          />
        </label>

        <div style={previewStyle}>
          <div>
            <span style={previewLabelStyle}>Total com juros</span>
            <strong style={previewValueStyle}>
              {formatarMoeda(previa.valorTotal || 0)}
            </strong>
          </div>

          <div>
            <span style={previewLabelStyle}>Valor aproximado da parcela</span>
            <strong style={previewValueStyle}>
              {formatarMoeda(previa.valorParcela || 0)}
            </strong>
          </div>

          <button
            onClick={salvarEmprestimo}
            disabled={salvando}
            style={{
              ...primaryButtonStyle,
              opacity: salvando ? 0.65 : 1,
            }}
          >
            {salvando
              ? 'Salvando...'
              : editandoId
                ? 'Salvar alterações'
                : 'Cadastrar empréstimo'}
          </button>
        </div>
      </section>

      <section style={listSectionStyle}>
        <div style={filtersStyle}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo nome do cliente..."
            style={{ ...inputStyle, margin: 0 }}
          />

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{ ...inputStyle, margin: 0 }}
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="atrasado">Atrasados</option>
            <option value="quitado">Quitados</option>
            <option value="renegociado">Renegociados</option>
          </select>
        </div>

        {carregando ? (
          <div style={emptyStateStyle}>Carregando empréstimos...</div>
        ) : emprestimosFiltrados.length === 0 ? (
          <div style={emptyStateStyle}>Nenhum empréstimo encontrado.</div>
        ) : (
          <div style={loanListStyle}>
            {emprestimosFiltrados.map((emprestimo) => {
              const parcelasDoEmprestimo = parcelas.filter(
                (parcela) => parcela.emprestimo_id === emprestimo.id
              )

              const parcelasPagas = parcelasDoEmprestimo.filter(
                (parcela) => parcela.status === 'paga'
              ).length

              const progresso =
                emprestimo.quantidade_parcelas > 0
                  ? (parcelasPagas / emprestimo.quantidade_parcelas) * 100
                  : 0

              const proximaParcela = parcelasDoEmprestimo.find(
                (parcela) => parcela.status !== 'paga'
              )

              const aberto = detalhesId === emprestimo.id

              return (
                <article key={emprestimo.id} style={loanCardStyle}>
                  <div style={loanTopStyle}>
                    <div style={clientIdentityStyle}>
                      <div style={avatarStyle}>
                        {emprestimo.cliente?.nome?.charAt(0).toUpperCase() ??
                          '?'}
                      </div>

                      <div>
                        <h3 style={clientNameStyle}>
                          {emprestimo.cliente?.nome ?? 'Cliente não encontrado'}
                        </h3>
                        <span style={mutedTextStyle}>
                          Empréstimo #{emprestimo.id}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        ...statusBadgeStyle,
                        ...statusStyle(emprestimo.status),
                      }}
                    >
                      {nomeStatus(emprestimo.status)}
                    </span>
                  </div>

                  <div style={loanInfoGridStyle}>
                    <InfoItem
                      titulo="Valor emprestado"
                      valor={formatarMoeda(emprestimo.valor_emprestado)}
                    />
                    <InfoItem
                      titulo="Juros"
                      valor={`${emprestimo.taxa_juros}%`}
                    />
                    <InfoItem
                      titulo="Valor total"
                      valor={formatarMoeda(emprestimo.valor_total)}
                    />
                    <InfoItem
                      titulo="Parcelas"
                      valor={`${parcelasPagas} de ${emprestimo.quantidade_parcelas}`}
                    />
                  </div>

                  <div style={progressHeaderStyle}>
                    <span style={mutedTextStyle}>Progresso do pagamento</span>
                    <strong>{Math.round(progresso)}%</strong>
                  </div>

                  <div style={progressTrackStyle}>
                    <div
                      style={{
                        ...progressBarStyle,
                        width: `${Math.min(progresso, 100)}%`,
                      }}
                    />
                  </div>

                  <div style={nextPaymentStyle}>
                    <div>
                      <span style={previewLabelStyle}>Próxima parcela</span>
                      <strong style={{ display: 'block', marginTop: '4px' }}>
                        {proximaParcela
                          ? `${formatarData(proximaParcela.vencimento)} — ${formatarMoeda(
                              proximaParcela.valor
                            )}`
                          : 'Empréstimo quitado'}
                      </strong>
                    </div>

                    <div style={actionsStyle}>
                      <button
                        onClick={() =>
                          setDetalhesId(aberto ? null : emprestimo.id)
                        }
                        style={secondaryButtonStyle}
                      >
                        {aberto ? 'Ocultar parcelas' : 'Ver parcelas'}
                      </button>

                      <button
                        onClick={() => editarEmprestimo(emprestimo)}
                        style={secondaryButtonStyle}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => excluirEmprestimo(emprestimo.id)}
                        style={dangerButtonStyle}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {aberto && (
                    <div style={installmentsWrapperStyle}>
                      {parcelasDoEmprestimo.length === 0 ? (
                        <div style={emptyInstallmentStyle}>
                          Nenhuma parcela encontrada.
                        </div>
                      ) : (
                        parcelasDoEmprestimo.map((parcela) => (
                          <div key={parcela.id} style={installmentStyle}>
                            <div>
                              <strong>Parcela {parcela.numero_parcela}</strong>
                              <span style={installmentDateStyle}>
                                Vencimento: {formatarData(parcela.vencimento)}
                              </span>
                            </div>

                            <strong>{formatarMoeda(parcela.valor)}</strong>

                            <span
                              style={{
                                ...smallBadgeStyle,
                                ...installmentStatusStyle(parcela),
                              }}
                            >
                              {nomeStatusParcela(parcela)}
                            </span>

                            {parcela.status !== 'paga' && (
                              <button
                                onClick={() => registrarPagamento(parcela)}
                                style={payButtonStyle}
                              >
                                Registrar pagamento
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function ResumoCard({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div style={summaryCardStyle}>
      <span style={summaryLabelStyle}>{titulo}</span>
      <strong style={summaryValueStyle}>{valor}</strong>
    </div>
  )
}

function InfoItem({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div style={infoItemStyle}>
      <span style={previewLabelStyle}>{titulo}</span>
      <strong style={{ display: 'block', marginTop: '5px' }}>{valor}</strong>
    </div>
  )
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor) || 0)
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR').format(
    new Date(`${data}T12:00:00`)
  )
}

function nomeStatus(status: Emprestimo['status']) {
  const nomes = {
    ativo: 'Ativo',
    quitado: 'Quitado',
    atrasado: 'Atrasado',
    renegociado: 'Renegociado',
  }

  return nomes[status]
}

function statusStyle(status: Emprestimo['status']) {
  const estilos = {
    ativo: {
      background: '#173a55',
      borderColor: '#2f83bd',
      color: '#9ed8ff',
    },
    quitado: {
      background: '#173d2b',
      borderColor: '#2f9c65',
      color: '#a7efc8',
    },
    atrasado: {
      background: '#4a2024',
      borderColor: '#ba4b55',
      color: '#ffc1c6',
    },
    renegociado: {
      background: '#3c284b',
      borderColor: '#8d59a7',
      color: '#e9c3ff',
    },
  }

  return estilos[status]
}

function nomeStatusParcela(parcela: Parcela) {
  if (parcela.status === 'paga') return 'Paga'

  const atrasada =
    new Date(`${parcela.vencimento}T23:59:59`) < new Date()

  return atrasada ? 'Atrasada' : 'Pendente'
}

function installmentStatusStyle(parcela: Parcela) {
  if (parcela.status === 'paga') {
    return {
      background: '#173d2b',
      borderColor: '#2f9c65',
      color: '#a7efc8',
    }
  }

  const atrasada =
    new Date(`${parcela.vencimento}T23:59:59`) < new Date()

  if (atrasada) {
    return {
      background: '#4a2024',
      borderColor: '#ba4b55',
      color: '#ffc1c6',
    }
  }

  return {
    background: '#4a3a17',
    borderColor: '#b9912f',
    color: '#ffe49b',
  }
}

const pageContainerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '1180px',
  margin: '0 auto',
  paddingBottom: '40px',
}

const pageHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '22px',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '30px',
}

const subtitleStyle: React.CSSProperties = {
  margin: '7px 0 0',
  color: '#97979f',
  fontSize: '14px',
}

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: '12px',
  marginBottom: '18px',
}

const summaryCardStyle: React.CSSProperties = {
  background: '#211926',
  border: '1px solid #493650',
  borderRadius: '15px',
  padding: '17px',
}

const summaryLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#aaa1ad',
  fontSize: '12px',
  marginBottom: '8px',
}

const summaryValueStyle: React.CSSProperties = {
  fontSize: '22px',
}

const formCardStyle: React.CSSProperties = {
  background: '#171717',
  border: '1px solid #2d2d2d',
  borderRadius: '18px',
  padding: '20px',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '14px',
  marginBottom: '18px',
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
}

const sectionDescriptionStyle: React.CSSProperties = {
  margin: '5px 0 0',
  color: '#919198',
  fontSize: '13px',
}

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: '13px',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '7px',
  color: '#cfcfd4',
  fontSize: '12px',
  fontWeight: 600,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: '10px',
  background: '#101010',
  color: '#fff',
  border: '1px solid #383838',
  outline: 'none',
}

const previewStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  alignItems: 'end',
  gap: '14px',
  marginTop: '16px',
  padding: '15px',
  background: '#201724',
  border: '1px solid #51345b',
  borderRadius: '13px',
}

const previewLabelStyle: React.CSSProperties = {
  color: '#aaa0ad',
  fontSize: '11px',
}

const previewValueStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '5px',
  fontSize: '18px',
}

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: '10px',
  background: '#c13bd5',
  color: '#fff',
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #55515a',
  borderRadius: '9px',
  background: '#252327',
  color: '#fff',
  padding: '9px 11px',
  cursor: 'pointer',
}

const dangerButtonStyle: React.CSSProperties = {
  border: '1px solid #6e3439',
  borderRadius: '9px',
  background: '#3b2023',
  color: '#ffb5ba',
  padding: '9px 11px',
  cursor: 'pointer',
}

const listSectionStyle: React.CSSProperties = {
  marginTop: '20px',
}

const filtersStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 1fr) minmax(160px, 220px)',
  gap: '12px',
  marginBottom: '14px',
}

const loanListStyle: React.CSSProperties = {
  display: 'grid',
  gap: '13px',
}

const loanCardStyle: React.CSSProperties = {
  background: '#2b1d33',
  border: '1px solid #6f3d7a',
  borderRadius: '17px',
  padding: '17px',
}

const loanTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '14px',
}

const clientIdentityStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '11px',
}

const avatarStyle: React.CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '12px',
  display: 'grid',
  placeItems: 'center',
  background: '#8b4a97',
  border: '1px solid #b46bc2',
  fontWeight: 800,
  fontSize: '17px',
}

const clientNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '17px',
}

const mutedTextStyle: React.CSSProperties = {
  color: '#b8abbc',
  fontSize: '11px',
}

const statusBadgeStyle: React.CSSProperties = {
  padding: '6px 9px',
  border: '1px solid',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
}

const loanInfoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
  gap: '9px',
  marginTop: '14px',
}

const infoItemStyle: React.CSSProperties = {
  background: '#36253e',
  border: '1px solid #5c4163',
  borderRadius: '11px',
  padding: '10px 11px',
}

const progressHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '14px',
  marginBottom: '7px',
}

const progressTrackStyle: React.CSSProperties = {
  height: '7px',
  background: '#1c1520',
  borderRadius: '999px',
  overflow: 'hidden',
}

const progressBarStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  background: '#ce4fe0',
  transition: 'width 0.25s ease',
}

const nextPaymentStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '15px',
  flexWrap: 'wrap',
  marginTop: '14px',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
}

const installmentsWrapperStyle: React.CSSProperties = {
  display: 'grid',
  gap: '8px',
  marginTop: '15px',
  paddingTop: '15px',
  borderTop: '1px solid #5f4667',
}

const installmentStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(130px, 1fr) auto auto auto',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 11px',
  background: '#36253e',
  border: '1px solid #5c4163',
  borderRadius: '11px',
}

const installmentDateStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '3px',
  color: '#b7aabd',
  fontSize: '11px',
}

const smallBadgeStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: '1px solid',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
}

const payButtonStyle: React.CSSProperties = {
  border: '1px solid #9756a3',
  borderRadius: '8px',
  background: '#754080',
  color: '#fff',
  padding: '8px 10px',
  cursor: 'pointer',
}

const emptyStateStyle: React.CSSProperties = {
  padding: '34px',
  textAlign: 'center',
  background: '#171717',
  border: '1px dashed #3a3a3a',
  borderRadius: '15px',
  color: '#92929a',
}

const emptyInstallmentStyle: React.CSSProperties = {
  padding: '16px',
  textAlign: 'center',
  color: '#b3a7b8',
}