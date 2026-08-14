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
  cliente_id?: number
  numero_parcela: number
  valor: number
  vencimento?: string | null
  data_vencimento?: string | null
  status: 'pendente' | 'pago' | 'paga' | 'atrasada' | 'renegociado'
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

  const [drawerAberto, setDrawerAberto] = useState(false)
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
  const [emprestimoAbertoId, setEmprestimoAbertoId] = useState<number | null>(null)
  const [datasParcelas, setDatasParcelas] = useState<string[]>([])
  const [mostrarEdicao, setMostrarEdicao] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    void carregarDados()
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

  useEffect(() => {
    const quantidade = Number(form.quantidadeParcelas)

    if (!form.primeiroVencimento || quantidade < 1) {
      setDatasParcelas([])
      return
    }

    setDatasParcelas((atuais) => {
      if (
        editandoId &&
        atuais.length === quantidade &&
        atuais.every(Boolean)
      ) {
        return atuais
      }

      return gerarDatasMensais(form.primeiroVencimento, quantidade)
    })
  }, [
    form.primeiroVencimento,
    form.quantidadeParcelas,
    editandoId,
  ])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id ?? null
  }

  function mostrarErroSupabase(
    origem: string,
    error: {
      message?: string
      details?: string
      hint?: string
      code?: string
    }
  ) {
    console.warn(`[Supabase] Erro em ${origem}`, {
      message: error.message ?? 'Sem mensagem',
      details: error.details ?? 'Sem detalhes',
      hint: error.hint ?? 'Sem dica',
      code: error.code ?? 'Sem código',
    })

    return `${origem}: ${error.message ?? 'erro desconhecido'}`
  }

  async function carregarDados() {
    setCarregando(true)

    try {
      const userId = await pegarUserId()

      if (!userId) {
        alert('Sua sessão expirou. Entre novamente no sistema.')
        return
      }

      const clientesResposta = await supabase
        .from('Clientes')
        .select('id, nome, telefone')
        .eq('user_id', userId)
        .order('nome')

      if (clientesResposta.error) {
        throw new Error(
          mostrarErroSupabase('Clientes', clientesResposta.error)
        )
      }

      const emprestimosResposta = await supabase
        .from('Emprestimos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (emprestimosResposta.error) {
        throw new Error(
          mostrarErroSupabase('Emprestimos', emprestimosResposta.error)
        )
      }

      const parcelasResposta = await supabase
        .from('Parcelas')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento')

      if (parcelasResposta.error) {
        throw new Error(
          mostrarErroSupabase('Parcelas', parcelasResposta.error)
        )
      }

      const listaClientes = clientesResposta.data ?? []
      const mapaClientes = new Map(
        listaClientes.map((cliente) => [cliente.id, cliente])
      )

      const listaEmprestimos = (emprestimosResposta.data ?? []).map(
        (emprestimo) => ({
          ...emprestimo,
          cliente: mapaClientes.get(emprestimo.cliente_id) ?? null,
        })
      )

      setClientes(listaClientes)
      setEmprestimos(listaEmprestimos as Emprestimo[])
      const parcelasNormalizadas = (parcelasResposta.data ?? []).map(
        (parcela) => ({
          ...parcela,
          vencimento:
            parcela.data_vencimento ?? parcela.vencimento ?? null,
        })
      )

      setParcelas(parcelasNormalizadas as Parcela[])
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido'

      console.error('Erro detalhado ao carregar empréstimos:', mensagem)
      alert(`Não foi possível carregar os empréstimos.\n\n${mensagem}`)
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
  setDatasParcelas([])
  setMostrarEdicao(false)
  setDrawerAberto(false) // <- ESTA LINHA É O QUE FECHA O MODAL
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

  function gerarDatasMensais(
    primeiraData: string,
    quantidade: number
  ) {
    if (!primeiraData || quantidade < 1) return []

    const base = new Date(`${primeiraData}T12:00:00`)

    return Array.from({ length: quantidade }, (_, indice) =>
      dataParaBanco(adicionarMes(base, indice))
    )
  }

  function atualizarDataParcela(indice: number, valor: string) {
    setDatasParcelas((anteriores) =>
      anteriores.map((data, posicao) =>
        posicao === indice ? valor : data
      )
    )
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

    if (!userId) {
      alert('Sua sessão expirou. Entre novamente no sistema.')
      return
    }

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
      !form.primeiroVencimento ||
      datasParcelas.length !== quantidadeParcelas ||
      datasParcelas.some((data) => !data)
    ) {
      alert('Preencha corretamente todos os campos obrigatórios.')
      return
    }

    setSalvando(true)

    let novoEmprestimoId: number | null = null

    try {
      const payload = {
        cliente_id: Number(form.clienteId),
        valor_emprestado: valorEmprestado,
        taxa_juros: taxaJuros,
        valor_total: Number(valorTotal.toFixed(2)),
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

        if (error) {
          throw new Error(
            mostrarErroSupabase('Atualização de Emprestimos', error)
          )
        }

        const { error: erroExcluirParcelas } = await supabase
          .from('Parcelas')
          .delete()
          .eq('emprestimo_id', editandoId)
          .eq('user_id', userId)

        if (erroExcluirParcelas) {
          throw new Error(
            mostrarErroSupabase(
              'Atualização das Parcelas',
              erroExcluirParcelas
            )
          )
        }

        const parcelasAtualizadas = datasParcelas.map(
          (dataParcela, indice) => ({
            emprestimo_id: editandoId,
            cliente_id: Number(form.clienteId),
            numero_parcela: indice + 1,
            valor: Number(valorParcela.toFixed(2)),
            vencimento: dataParcela,
            data_vencimento: dataParcela,
            status: 'pendente',
            data_pagamento: null,
            user_id: userId,
          })
        )

        const { error: erroInserirParcelas } = await supabase
          .from('Parcelas')
          .insert(parcelasAtualizadas)

        if (erroInserirParcelas) {
          throw new Error(
            mostrarErroSupabase(
              'Recriação das Parcelas',
              erroInserirParcelas
            )
          )
        }
      } else {
        const { data: novoEmprestimo, error: erroEmprestimo } = await supabase
          .from('Emprestimos')
          .insert(payload)
          .select('id')
          .single()

        if (erroEmprestimo) {
          throw new Error(
            mostrarErroSupabase('Cadastro em Emprestimos', erroEmprestimo)
          )
        }

        novoEmprestimoId = Number(novoEmprestimo.id)

        const novasParcelas = datasParcelas.map(
          (dataParcela, indice) => ({
            emprestimo_id: novoEmprestimoId,
            cliente_id: Number(form.clienteId),
            numero_parcela: indice + 1,
            valor: Number(valorParcela.toFixed(2)),
            vencimento: dataParcela,
            data_vencimento: dataParcela,
            status: 'pendente',
            data_pagamento: null,
            user_id: userId,
          })
        )

        const { error: erroParcelas } = await supabase
          .from('Parcelas')
          .insert(novasParcelas)

        if (erroParcelas) {
          await supabase
            .from('Emprestimos')
            .delete()
            .eq('id', novoEmprestimoId)
            .eq('user_id', userId)

          throw new Error(
            mostrarErroSupabase('Cadastro em Parcelas', erroParcelas)
          )
        }
      }

      limparFormulario()
      await carregarDados()
      alert(
        editandoId
          ? 'Empréstimo atualizado com sucesso.'
          : 'Empréstimo cadastrado com sucesso.'
      )
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido'

      console.warn('Erro detalhado ao salvar empréstimo:', mensagem)
      alert(`Não foi possível salvar o empréstimo.\n\n${mensagem}`)
    } finally {
      setSalvando(false)
    }
  }

function editarEmprestimo(emprestimo: Emprestimo) {
  const parcelasDoEmprestimo = parcelas
    .filter((parcela) => parcela.emprestimo_id === emprestimo.id)
    .sort((a, b) => a.numero_parcela - b.numero_parcela)

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

  setDatasParcelas(
    parcelasDoEmprestimo.length > 0
      ? parcelasDoEmprestimo.map(
          (parcela) =>
            parcela.data_vencimento ??
            parcela.vencimento ??
            ''
        )
      : gerarDatasMensais(
          emprestimo.primeiro_vencimento,
          emprestimo.quantidade_parcelas
        )
  )

  setMostrarEdicao(true)
  setDrawerAberto(true)
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
          status: 'pago',
          data_pagamento: new Date().toISOString().slice(0, 10),
        })
        .eq('id', parcela.id)
        .eq('user_id', userId)

      if (error) {
        throw new Error(
          mostrarErroSupabase('Registro de pagamento', error)
        )
      }

      const parcelasDoEmprestimo = parcelas.filter(
        (item) => item.emprestimo_id === parcela.emprestimo_id
      )

      const todasPagas = parcelasDoEmprestimo.every(
        (item) =>
          item.id === parcela.id ||
          item.status === 'pago' ||
          item.status === 'paga'
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
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido'

      console.warn('Erro ao registrar pagamento:', mensagem)
      alert(`Não foi possível registrar o pagamento.\n\n${mensagem}`)
    }
  }

  async function reabrirParcela(parcela: Parcela) {
    const confirmou = window.confirm(
      'Deseja voltar esta parcela para pendente?'
    )

    if (!confirmou) return

    const userId = await pegarUserId()
    if (!userId) return

    try {
      const { error } = await supabase
        .from('Parcelas')
        .update({
          status: 'pendente',
          data_pagamento: null,
        })
        .eq('id', parcela.id)
        .eq('user_id', userId)

      if (error) {
        throw new Error(
          mostrarErroSupabase('Reabertura da parcela', error)
        )
      }

      const { error: erroEmprestimo } = await supabase
        .from('Emprestimos')
        .update({ status: 'ativo' })
        .eq('id', parcela.emprestimo_id)
        .eq('user_id', userId)

      if (erroEmprestimo) {
        throw new Error(
          mostrarErroSupabase(
            'Reabertura do empréstimo',
            erroEmprestimo
          )
        )
      }

      await carregarDados()
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido'

      console.warn('Erro ao reabrir parcela:', mensagem)
      alert(`Não foi possível reabrir a parcela.\n\n${mensagem}`)
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
      .filter(
        (parcela) =>
          parcela.status !== 'pago' &&
          parcela.status !== 'paga' &&
          parcela.status !== 'renegociado'
      )
      .reduce((total, parcela) => total + Number(parcela.valor), 0)

    const ativos = emprestimos.filter(
      (item) => item.status === 'ativo'
    ).length

    const atrasados = parcelas.filter((parcela) => {
      return (
        parcela.status !== 'pago' &&
        parcela.status !== 'paga' &&
        parcela.status !== 'renegociado' &&
        new Date(`${parcela.data_vencimento ?? parcela.vencimento}T23:59:59`) < new Date()
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
      {/* Regras de responsividade só para os pontos que quebravam no mobile */}
      <style>{`
        @media (max-width: 640px) {
          .lash-page-header {
            flex-direction: column;
            align-items: stretch;
          }

          .lash-page-header button {
            width: 100%;
          }

          .lash-modal {
  width: 100% !important;
  max-width: 100% !important;
  max-height: calc(100dvh - 20px) !important;
  padding: 16px !important;
  border-radius: 14px !important;
  box-sizing: border-box !important;
}

          .lash-filters {
            grid-template-columns: 1fr !important;
          }

          .lash-loan-top {
            flex-wrap: wrap;
            row-gap: 10px;
          }

          .lash-next-payment {
            flex-direction: column;
            align-items: stretch !important;
          }

          .lash-actions-row {
            width: 100%;
            flex-wrap: wrap;
          }

          .lash-actions-row button {
            flex: 1 1 calc(50% - 5px);
            text-align: center;
          }

.lash-installment {
  grid-template-columns: minmax(0, 1fr) auto !important;
  gap: 7px;
  padding: 8px !important;
}

.lash-installment > span {
  justify-self: end;
}

.lash-installment > button {
  grid-column: 1 / -1;
  width: 100%;
  padding: 7px 9px !important;
}
        }
      `}</style>

   <div style={pageHeaderStyle} className="lash-page-header">
  <div>
    <h1 style={{ margin: 0, marginBottom: '8px' }}>
      Empréstimos
    </h1>

    <p style={subtitleStyle}>
      Cadastre empréstimos, acompanhe parcelas e registre pagamentos.
    </p>
  </div>

  <button
    onClick={() => {
      limparFormulario()
      setDrawerAberto(true)
    }}
    style={primaryButtonStyle}
  >
    + Novo empréstimo
  </button>
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

{drawerAberto && (
  <div
    style={modalOverlayStyle}
    onClick={() => limparFormulario()}
  >
<div
  className="lash-modal"
  onClick={(e) => e.stopPropagation()}
  style={{
    ...modalStyle,
    ...(editandoId ? editingFormCardStyle : {}),
  }}
>
  
<div style={sectionHeaderStyle}>
  <div>
    <h2 style={sectionTitleStyle}>
      {editandoId ? 'Editar empréstimo' : 'Novo empréstimo'}
    </h2>

    <p style={sectionDescriptionStyle}>
      Informe os dados para calcular o total e gerar as parcelas.
    </p>
  </div>

  <button
    type="button"
    onClick={limparFormulario}
style={{
  ...modalCloseButtonStyle,
  transform: 'translateY(-22px)',
  width: '32px',
  height: '32px',
  minWidth: '32px',
  minHeight: '32px',
  fontSize: '16px',
}}
  >
    ✕
  </button>
</div>

        <div style={formGridStyle}>
<label style={labelStyle}>
  Cliente

  {editandoId ? (
    <div
      style={{
        ...inputStyle,
        display: 'flex',
        alignItems: 'center',
        minHeight: '40px',
        boxSizing: 'border-box',
      }}
    >
      {clientes.find(
        (cliente) => String(cliente.id) === form.clienteId
      )?.nome ?? 'Cliente'}
    </div>
  ) : (
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
  )}
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

        <div style={installmentDatesSectionStyle}>
          <div style={installmentDatesHeaderStyle}>
            <div>
              <h3 style={installmentDatesTitleStyle}>
                Datas das parcelas
              </h3>
              <p style={installmentDatesDescriptionStyle}>
                As datas são sugeridas mensalmente, mas você pode alterar
                cada vencimento individualmente.
              </p>
            </div>

            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() =>
                setDatasParcelas(
                  gerarDatasMensais(
                    form.primeiroVencimento,
                    Number(form.quantidadeParcelas)
                  )
                )
              }
            >
              Recalcular mensalmente
            </button>
          </div>

          {datasParcelas.length === 0 ? (
            <div style={emptyInstallmentDatesStyle}>
              Informe o primeiro vencimento e a quantidade de parcelas.
            </div>
          ) : (
            <div style={installmentDatesGridStyle}>
              {datasParcelas.map((dataParcela, indice) => (
                <label key={indice} style={labelStyle}>
                  Parcela {indice + 1}
                  <input
                    type="date"
                    value={dataParcela}
                    onChange={(e) =>
                      atualizarDataParcela(indice, e.target.value)
                    }
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>
          )}
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
    </div>
  </div>
)}

      <section style={listSectionStyle}>
        <div style={filtersStyle} className="lash-filters">
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

const possuiParcelaAtrasada = parcelasDoEmprestimo.some((parcela) => {
  const vencimento =
    parcela.data_vencimento ?? parcela.vencimento

  return (
    parcela.status !== 'pago' &&
    parcela.status !== 'paga' &&
    parcela.status !== 'renegociado' &&
    new Date(`${vencimento}T23:59:59`) < new Date()
  )
})

const todasPagas =
  parcelasDoEmprestimo.length > 0 &&
  parcelasDoEmprestimo.every(
    (parcela) =>
      parcela.status === 'pago' ||
      parcela.status === 'paga' 
  )

const statusEmprestimo: Emprestimo['status'] =
  todasPagas
    ? 'quitado'
    : possuiParcelaAtrasada
      ? 'atrasado'
      : 'ativo'

              const parcelasResolvidas = parcelasDoEmprestimo.filter(
                (parcela) =>
                  parcela.status === 'pago' ||
                  parcela.status === 'paga' ||
                  parcela.status === 'renegociado'
              ).length

              const parcelasPagas = parcelasDoEmprestimo.filter(
                (parcela) =>
                  parcela.status === 'pago' ||
                  parcela.status === 'paga'
              ).length

              const progresso =
                emprestimo.quantidade_parcelas > 0
                  ? (parcelasResolvidas /
                      emprestimo.quantidade_parcelas) *
                    100
                  : 0

              const proximaParcela = parcelasDoEmprestimo.find(
                (parcela) =>
                  parcela.status !== 'pago' &&
                  parcela.status !== 'paga' &&
                  parcela.status !== 'renegociado'
              )

             const aberto = emprestimoAbertoId === emprestimo.id
const parcelasAbertas = detalhesId === emprestimo.id

              return (
<article key={emprestimo.id} style={loanCardStyle}>

  {/* CABEÇALHO COMPACTO */}
  <div
    style={{
      ...loanTopStyle,
      cursor: 'pointer',
      minWidth: 0,
    }}
    className="lash-loan-top"
    onClick={() =>
      setEmprestimoAbertoId(
        aberto ? null : emprestimo.id
      )
    }
  >

    <div
      style={{
        ...clientIdentityStyle,
        minWidth: 0,
        flex: 1,
      }}
    >

      <div style={avatarStyle}>
        {emprestimo.cliente?.nome?.charAt(0).toUpperCase() ?? '?'}
      </div>

      <div
        style={{
          minWidth: 0,
          overflow: 'hidden',
        }}
      >

        <h3
          style={{
            ...clientNameStyle,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {emprestimo.cliente?.nome ?? 'Cliente não encontrado'}
        </h3>

        <span style={mutedTextStyle}>
          Criado em {formatarData(emprestimo.data_emprestimo)}
        </span>

      </div>

    </div>

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}
    >

      <span
        style={{
          ...statusBadgeStyle,
          ...statusStyle(statusEmprestimo),
        }}
      >
        {nomeStatus(statusEmprestimo)}
      </span>

      {/* SETINHA */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setEmprestimoAbertoId(
            aberto ? null : emprestimo.id
          )
        }}
        style={chevronButtonStyle}
        aria-label={
          aberto
            ? 'Recolher empréstimo'
            : 'Expandir empréstimo'
        }
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

  </div>


  {/* DETALHES DO EMPRÉSTIMO */}
  {aberto && (
    <div>

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


      {/* PROGRESSO */}
      <div style={progressHeaderStyle}>
        <span style={mutedTextStyle}>
          Progresso do pagamento
        </span>

        <strong>
          {Math.round(progresso)}%
        </strong>
      </div>

      <div style={progressTrackStyle}>
        <div
          style={{
            ...progressBarStyle,
            width: `${Math.min(progresso, 100)}%`,
          }}
        />
      </div>


      {/* PRÓXIMA PARCELA */}
      <div
        className="lash-next-payment"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginTop: '14px',
          flexWrap: 'wrap',
        }}
      >

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >

          <span style={previewLabelStyle}>
            Próxima parcela
          </span>

          <strong
            style={{
              display: 'block',
              marginTop: '4px',
            }}
          >
            {proximaParcela
              ? `${formatarData(
                  proximaParcela.data_vencimento ??
                    proximaParcela.vencimento ??
                    ''
                )} — ${formatarMoeda(proximaParcela.valor)}`
              : statusEmprestimo === 'quitado'
                ? 'Aguardando nova negociação'
                : 'Empréstimo quitado'}
          </strong>

        </div>


        {/* AÇÕES */}
        <div
          className="lash-actions-row"
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >

          {/* ESTE BOTÃO AGORA CONTROLA SOMENTE AS PARCELAS */}
          <button
            type="button"
            onClick={() =>
              setDetalhesId(
                parcelasAbertas ? null : emprestimo.id
              )
            }
            style={secondaryButtonStyle}
          >
            {parcelasAbertas
              ? 'Ocultar parcelas'
              : 'Ver parcelas'}
          </button>

          <button
            type="button"
            onClick={() => editarEmprestimo(emprestimo)}
            style={secondaryButtonStyle}
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => excluirEmprestimo(emprestimo.id)}
            style={dangerButtonStyle}
          >
            Excluir
          </button>

        </div>

      </div>


      {/* PARCELAS — SÓ APARECEM AO CLICAR EM VER PARCELAS */}
      {parcelasAbertas && (
        <div style={installmentsWrapperStyle}>

          {parcelasDoEmprestimo.length === 0 ? (

            <div style={emptyInstallmentStyle}>
              Nenhuma parcela vinculada a este empréstimo.
            </div>

          ) : (

            parcelasDoEmprestimo.map((parcela) => (

              <div
                key={parcela.id}
                style={installmentStyle}
                className="lash-installment"
              >

                <div
                  style={{
                    minWidth: 0,
                  }}
                >

                  <strong>
                    Parcela {parcela.numero_parcela}
                  </strong>

                  <span style={installmentDateStyle}>
                    Vencimento:{' '}
                    {formatarData(
                      parcela.data_vencimento ??
                        parcela.vencimento ??
                        ''
                    )}
                  </span>

                </div>


                <strong>
                  {formatarMoeda(parcela.valor)}
                </strong>


                <span
                  style={{
                    ...smallBadgeStyle,
                    ...installmentStatusStyle(parcela),
                  }}
                >
                  {nomeStatusParcela(parcela)}
                </span>


                {parcela.status === 'pago' ||
                parcela.status === 'paga' ||
                parcela.status === 'renegociado' ? (

                  <button
                    onClick={() => reabrirParcela(parcela)}
                    style={reopenButtonStyle}
                  >
                    {parcela.status === 'renegociado'
                      ? 'Reabrir parcela'
                      : 'Voltar para pendente'}
                  </button>

                ) : (

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
      background: '#4ab04a',
      borderColor: '#4ab04a',
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
  if (parcela.status === 'pago' || parcela.status === 'paga') {
    return 'Pago'
  }

  if (parcela.status === 'renegociado') {
    return 'Renegociada'
  }

  const atrasada =
    new Date(`${parcela.data_vencimento ?? parcela.vencimento}T23:59:59`) < new Date()

  return atrasada ? 'Atrasada' : 'Pendente'
}

function installmentStatusStyle(parcela: Parcela) {
  if (parcela.status === 'renegociado') {
    return {
      background: '#3c284b',
      borderColor: '#8d59a7',
      color: '#e9c3ff',
    }
  }

  if (parcela.status === 'pago' || parcela.status === 'paga') {
    return {
      background: '#173d2b',
      borderColor: '#2f9c65',
      color: '#a7efc8',
    }
  }

  const atrasada =
    new Date(`${parcela.data_vencimento ?? parcela.vencimento}T23:59:59`) < new Date()

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
  gap: '16px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
}

const subtitleStyle: React.CSSProperties = {
  color: '#CBD5E1',
  lineHeight: 1.6,
  marginTop: 0,
}

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '12px',
  marginTop: '24px',
  marginBottom: '18px',
}

const summaryCardStyle: React.CSSProperties = {
  background: '#0D1B2E',
  border: '1px solid #1F3A5F',
  borderRadius: '15px',
  padding: '17px',
}

const summaryLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#94A3B8',
  fontSize: '12px',
  marginBottom: '8px',
}

const summaryValueStyle: React.CSSProperties = {
  fontSize: '22px',
  color: '#F8FAFC',
}

const editingFormCardStyle: React.CSSProperties = {
  border: '2px solid #2563EB',
  boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.20)',
}

const editingBannerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '14px',
  flexWrap: 'wrap',
  marginBottom: '18px',
  padding: '13px 14px',
  borderRadius: '12px',
  background: '#132641',
  border: '1px solid #28538B',
}

const editingBannerTitleStyle: React.CSSProperties = {
  display: 'block',
  color: '#F8FAFC',
  fontSize: '15px',
}

const editingBannerTextStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '3px',
  color: '#CBD5E1',
  fontSize: '12px',
}

const editingCloseButtonStyle: React.CSSProperties = {
  border: '1px solid #1F3A5F',
  borderRadius: '9px',
  background: '#162E4A',
  color: '#F8FAFC',
  padding: '8px 11px',
  cursor: 'pointer',
  fontWeight: 700,
}

const installmentDatesSectionStyle: React.CSSProperties = {
  marginTop: '17px',
  padding: '15px',
  borderRadius: '13px',
  background: '#0D1B2E',
  border: '1px solid #1F3A5F',
}

const installmentDatesHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '12px',
  flexWrap: 'wrap',
  marginBottom: '13px',
}

const installmentDatesTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '15px',
  color: '#F8FAFC',
}

const installmentDatesDescriptionStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: '#94A3B8',
  fontSize: '12px',
}

const installmentDatesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: '11px',
}

const emptyInstallmentDatesStyle: React.CSSProperties = {
  padding: '13px',
  borderRadius: '10px',
  border: '1px dashed #28538B',
  color: '#94A3B8',
  fontSize: '12px',
  textAlign: 'center',
}

const formCardStyle: React.CSSProperties = {
  background: '#0D1B2E',
  border: '1px solid #1F3A5F',
  borderRadius: '18px',
  padding: '20px',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
 justifyContent: 'space-between',
  gap: '14px',
  marginBottom: '18px',
  position: 'relative',
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
  color: '#F8FAFC',
}

const sectionDescriptionStyle: React.CSSProperties = {
  margin: '5px 0 0',
  color: '#94A3B8',
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
  color: '#CBD5E1',
  fontSize: '12px',
  fontWeight: 600,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: '10px',
  background: '#132641',
  color: '#F8FAFC',
  border: '1px solid #1F3A5F',
  outline: 'none',
}

const previewStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  alignItems: 'end',
  gap: '14px',
  marginTop: '16px',
  padding: '15px',
  background: '#132641',
  border: '1px solid #28538B',
  borderRadius: '13px',
}

const previewLabelStyle: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: '11px',
}

const previewValueStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '5px',
  fontSize: '18px',
  color: '#F8FAFC',
}

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: '10px',
  background: '#2563EB',
  color: '#ffffff',
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #28538B',
  borderRadius: '9px',
  background: '#132641',
  color: '#F8FAFC',
  padding: '9px 11px',
  cursor: 'pointer',
}

const dangerButtonStyle: React.CSSProperties = {
  border: '1px solid #ef4444',
  borderRadius: '9px',
  background: 'rgba(239, 68, 68, 0.15)',
  color: '#fca5a5',
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
  background: '#1a3663',
  border: '1px solid #1F3A5F',
  borderRadius: '17px',
  padding: '17px',
  width: '100%',
  boxSizing: 'border-box',
overflow: 'visible',
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
  background: '#132641',
  border: '1px solid #28538B',
  color: '#60A5FA',
  fontWeight: 800,
  fontSize: '17px',
  flexShrink: 0,
}

const clientNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '17px',
  color: '#F8FAFC',
}

const mutedTextStyle: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: '11px',
}

const statusBadgeStyle: React.CSSProperties = {
  padding: '6px 9px',
  border: '1px solid',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
  whiteSpace: 'nowrap',
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

const loanInfoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
  gap: '9px',
  marginTop: '14px',
}

const infoItemStyle: React.CSSProperties = {
  background: '#132641',
  border: '1px solid #1F3A5F',
  borderRadius: '11px',
  padding: '10px 11px',
}

const progressHeaderStyle: React.CSSProperties = {
 display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  columnGap: '12px',
  marginTop: '14px',
  marginBottom: '7px',
}
const progressTrackStyle: React.CSSProperties = {
  height: '7px',
  background: '#1A3152',
  borderRadius: '999px',
  overflow: 'hidden',
}

const progressBarStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  background: '#4ab04a',
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
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '10px',
  marginLeft: '0',
}

const installmentsWrapperStyle: React.CSSProperties = {
  display: 'grid',
  gap: '8px',
  marginTop: '15px',
  paddingTop: '15px',
  borderTop: '1px solid #1F3A5F',
}

const installmentStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(120px, 1fr) auto auto',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  background: '#132641',
  border: '1px solid #1F3A5F',
  borderRadius: '9px',
  width: '100%',
  boxSizing: 'border-box',
  minWidth: 0,
}

const installmentDateStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '3px',
  color: '#94A3B8',
  fontSize: '11px',
}

const smallBadgeStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: '1px solid',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  justifySelf: 'start',
}

const reopenButtonStyle: React.CSSProperties = {
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  background: 'rgba(245, 158, 11, 0.15)',
  color: '#fbbf24',
  padding: '8px 10px',
  cursor: 'pointer',
}

const payButtonStyle: React.CSSProperties = {
  background: '#0b5f2a',
  color: '#fff',
  borderRadius: '8px',
  padding: '8px 10px',
  cursor: 'pointer',
  fontWeight: 600,
}

const emptyStateStyle: React.CSSProperties = {
  padding: '34px',
  textAlign: 'center',
  background: '#0D1B2E',
  border: '1px dashed #28538B',
  borderRadius: '15px',
  color: '#94A3B8',
}

const emptyInstallmentStyle: React.CSSProperties = {
  padding: '16px',
  textAlign: 'center',
  color: '#94A3B8',
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,

  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',

  background: 'rgba(7,20,38,.85)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',

  padding: '24px',
  zIndex: 999999,
}

const modalStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: '1120px',
  maxHeight: 'calc(100dvh - 32px)',
  overflowY: 'auto',
  boxSizing: 'border-box',

  background: '#0D1B2E',
  border: '1px solid #1F3A5F',
  borderRadius: '18px',
  padding: '24px',

  boxShadow: '0 20px 60px rgba(0,0,0,.55)',
}

const modalCloseButtonStyle: React.CSSProperties = {
 position: 'absolute',
right: '5px',

  width: '46px',
  height: '46px',
  borderRadius: '50%',
  border: '1px solid #1F3A5F',
  background: '#132641',
  color: '#F8FAFC',

  cursor: 'pointer',
  fontSize: '22px',

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  zIndex: 10,
}