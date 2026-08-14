'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Cliente = {
  id: number
  nome: string
  telefone: string
  cpf: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  profissao: string | null
  local_trabalho: string | null
  observacoes: string | null
  user_id: string
}

type ViaCepResponse = {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

const LIMITE_CLIENTES = 500

export default function ClientesSection() {
  const supabase = createClient()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState('az')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf, setCpf] = useState('')
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [profissao, setProfissao] = useState('')
  const [localTrabalho, setLocalTrabalho] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  useEffect(() => {
    carregarClientes()
  }, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  async function carregarClientes() {
    const userId = await pegarUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from('Clientes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.log('ERRO AO BUSCAR CLIENTES:', error)
      return
    }

    setClientes((data as Cliente[]) || [])
  }

  function limparFormulario() {
    setNome('')
    setTelefone('')
    setCpf('')
    setCep('')
    setRua('')
    setNumero('')
    setComplemento('')
    setBairro('')
    setCidade('')
    setEstado('')
    setProfissao('')
    setLocalTrabalho('')
    setObservacoes('')
    setEditandoId(null)
    setMostrarFormulario(false)
  }

  function formatarCep(valor: string) {
    const numeros = valor.replace(/\D/g, '').slice(0, 8)

    if (numeros.length <= 5) {
      return numeros
    }

    return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
  }

  async function consultarCep() {
    const cepLimpo = cep.replace(/\D/g, '')

    if (!cepLimpo) return

    if (cepLimpo.length !== 8) {
      alert('Digite um CEP com 8 números.')
      return
    }

    setBuscandoCep(true)

    try {
      const resposta = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      )

      if (!resposta.ok) {
        throw new Error('Não foi possível consultar o CEP.')
      }

      const dados = (await resposta.json()) as ViaCepResponse

      if (dados.erro) {
        alert('CEP não encontrado.')
        return
      }

      setCep(formatarCep(dados.cep || cepLimpo))
      setRua(dados.logradouro || '')
      setBairro(dados.bairro || '')
      setCidade(dados.localidade || '')
      setEstado(dados.uf || '')

      if (dados.complemento && !complemento.trim()) {
        setComplemento(dados.complemento)
      }
    } catch (error) {
      console.error('ERRO AO CONSULTAR CEP:', error)
      alert('Não foi possível buscar o endereço pelo CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  async function salvarCliente() {
    const userId = await pegarUserId()
    if (!userId) return

    if (!nome.trim()) {
      alert('Digite o nome completo do cliente.')
      return
    }

    if (!telefone.trim()) {
      alert('Digite o celular do cliente.')
      return
    }

    setCarregando(true)

    if (!editandoId) {
      const { count } = await supabase
        .from('Clientes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if ((count ?? 0) >= LIMITE_CLIENTES) {
        alert('Você atingiu o limite de 500 clientes do plano.')
        setCarregando(false)
        return
      }
    }

    const payload = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      cpf: cpf.trim() || null,
      cep: cep.trim() || null,
      rua: rua.trim() || null,
      numero: numero.trim() || null,
      complemento: complemento.trim() || null,
      bairro: bairro.trim() || null,
      cidade: cidade.trim() || null,
      estado: estado.trim() || null,
      profissao: profissao.trim() || null,
      local_trabalho: localTrabalho.trim() || null,
      observacoes: observacoes.trim() || null,
      user_id: userId,
    }

    if (editandoId) {
      const { error } = await supabase
        .from('Clientes')
        .update(payload)
        .eq('id', editandoId)
        .eq('user_id', userId)

      if (error) {
        console.log('ERRO AO EDITAR CLIENTE:', error)
        alert(error.message)
        setCarregando(false)
        return
      }
    } else {
      const { error } = await supabase.from('Clientes').insert(payload)

      if (error) {
        console.log('ERRO AO SALVAR CLIENTE:', error)
        alert(error.message)
        setCarregando(false)
        return
      }
    }

    limparFormulario()
    await carregarClientes()
    setCarregando(false)
  }

  function editarCliente(cliente: Cliente) {
    setEditandoId(cliente.id)
    setNome(cliente.nome || '')
    setTelefone(cliente.telefone || '')
    setCpf(cliente.cpf || '')
    setCep(cliente.cep || '')
    setRua(cliente.rua || '')
    setNumero(cliente.numero || '')
    setComplemento(cliente.complemento || '')
    setBairro(cliente.bairro || '')
    setCidade(cliente.cidade || '')
    setEstado(cliente.estado || '')
    setProfissao(cliente.profissao || '')
    setLocalTrabalho(cliente.local_trabalho || '')
    setObservacoes(cliente.observacoes || '')
    setMostrarFormulario(true)
  }

  async function excluirCliente(id: number) {
    const confirmou = confirm('Tem certeza que deseja excluir este cliente?')
    if (!confirmou) return

    const userId = await pegarUserId()
    if (!userId) return

    await supabase
      .from('Agendamentos')
      .delete()
      .eq('cliente_id', id)
      .eq('user_id', userId)

    const { error } = await supabase
      .from('Clientes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.log('ERRO AO EXCLUIR CLIENTE:', error)
      alert(error.message)
      return
    }

    await carregarClientes()
  }

  function telefoneLimpo(telefone: string) {
    return telefone.replace(/\D/g, '')
  }

  function abrirWhatsApp(cliente: Cliente) {
    const numero = telefoneLimpo(cliente.telefone)

    if (!numero) {
      alert('Telefone inválido.')
      return
    }

    const texto = `Oi, ${cliente.nome}! Tudo bem?`
    const url = `https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`

    window.open(url, '_blank')
  }

const clientesFiltrados = useMemo(() => {
  const lista = clientes.filter((cliente) => {
    const termo = busca.toLowerCase()

    return (
      cliente.nome?.toLowerCase().includes(termo) ||
      cliente.telefone?.toLowerCase().includes(termo) ||
      cliente.cpf?.toLowerCase().includes(termo) ||
      cliente.cidade?.toLowerCase().includes(termo)
    )
  })

  switch (ordenacao) {
    case 'za':
      return [...lista].sort((a, b) =>
        b.nome.localeCompare(a.nome, 'pt-BR')
      )

    case 'recentes':
      return [...lista].sort((a, b) => b.id - a.id)

    case 'antigos':
      return [...lista].sort((a, b) => a.id - b.id)

    default:
      return [...lista].sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      )
  }
}, [clientes, busca, ordenacao])

  function montarEndereco(cliente: Cliente) {
    const partes = [
      cliente.rua,
      cliente.numero,
      cliente.complemento,
      cliente.bairro,
      cliente.cidade,
      cliente.estado,
      cliente.cep ? `CEP: ${cliente.cep}` : null,
    ].filter(Boolean)

    return partes.length > 0 ? partes.join(', ') : 'Endereço não informado'
  }

  return (
    <div style={pageContainerStyle}>
      {/* Cabeçalho no mesmo padrão do Empréstimos e correção do bloco Endereço/Comportamento no mobile */}
      <style>{`
        @media (max-width: 640px) {
          .lash-page-header {
            flex-direction: column;
            align-items: stretch;
          }

          .lash-page-header button {
            width: 100%;
          }

          .lash-details-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={pageHeaderStyle} className="lash-page-header">
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>Clientes</h1>
          <p style={subtitleStyle}>
            Consulte, cadastre e organize os dados dos clientes.
          </p>
        </div>

        <button
          style={buttonStyle}
          onClick={() => {
            limparFormulario()
            setMostrarFormulario(true)
          }}
        >
          + Cadastrar cliente
        </button>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Clientes cadastrados</span>
          <strong style={summaryValueStyle}>{clientes.length}</strong>
          <span style={summaryDetailStyle}>
            Limite de {LIMITE_CLIENTES} clientes
          </span>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Resultados encontrados</span>
          <strong style={summaryValueStyle}>{clientesFiltrados.length}</strong>
          <span style={summaryDetailStyle}>
            Conforme a busca atual
          </span>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Capacidade disponível</span>
          <strong style={summaryValueStyle}>
            {Math.max(0, LIMITE_CLIENTES - clientes.length)}
          </strong>
          <span style={summaryDetailStyle}>
            Novos cadastros permitidos
          </span>
        </div>
      </div>

      <div style={searchCardStyle}>
        <div style={searchFieldWrapperStyle}>
          <span style={searchIconStyle}>⌕</span>
          <input
            style={searchInputStyle}
            placeholder="Buscar por nome, telefone, CPF ou cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

    <select
  style={ordenacaoSelectStyle}
  value={ordenacao}
  onChange={(e) => setOrdenacao(e.target.value)}
>
  <option value="az">A → Z</option>
  <option value="za">Z → A</option>
  <option value="recentes">Mais recentes</option>
  <option value="antigos">Mais antigos</option>
</select>
      </div>

{mostrarFormulario && (
  <div
    style={modalOverlayStyle}
    onClick={limparFormulario}
  >
    <div
      style={modalStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleModalStyle}>
            {editandoId ? 'Editar cliente' : 'Novo cliente'}
          </h2>

          <p style={sectionDescriptionStyle}>
            Cadastre e organize os dados do cliente.
          </p>
        </div>

        <button
          type="button"
          style={modalCloseButtonStyle}
          onClick={limparFormulario}
        >
          ✕
        </button>
      </div>

 <div style={gridStyle}>
  <div>
    <label style={labelStyle}>Nome completo</label>
    <input
      style={inputStyle}
      placeholder="Ex.: João da Silva"
      value={nome}
      onChange={(e) => setNome(e.target.value)}
    />
  </div>

  <div>
    <label style={labelStyle}>Celular</label>
    <input
      style={inputStyle}
      placeholder="Ex.: (16) 99999-9999"
      value={telefone}
      onChange={(e) => setTelefone(e.target.value)}
    />
  </div>

  <div>
    <label style={labelStyle}>CPF</label>
    <input
      style={inputStyle}
      placeholder="Ex.: 123.456.789-00"
      value={cpf}
      onChange={(e) => setCpf(e.target.value)}
    />
  </div>
</div>

<div style={{ height: '14px' }} />

<div style={gridStyle}>
  <div>
    <label style={labelStyle}>CEP</label>

    <div style={cepFieldWrapperStyle}>
      <input
        style={inputStyle}
        placeholder="Ex.: 15990-000"
        value={cep}
        inputMode="numeric"
        maxLength={9}
        onChange={(e) => setCep(formatarCep(e.target.value))}
        onBlur={consultarCep}
      />

      <span style={cepStatusStyle}>
        {buscandoCep
          ? 'Buscando endereço...'
          : 'Preenche automaticamente'}
      </span>
    </div>
  </div>

  <div>
    <label style={labelStyle}>Rua</label>
    <input
      style={inputStyle}
      placeholder="Ex.: Rua das Flores"
      value={rua}
      onChange={(e) => setRua(e.target.value)}
    />
  </div>

  <div>
    <label style={labelStyle}>Número</label>
    <input
      style={inputStyle}
      placeholder="Ex.: 120"
      value={numero}
      onChange={(e) => setNumero(e.target.value)}
    />
  </div>

  <div>
    <label style={labelStyle}>Complemento</label>
    <input
      style={inputStyle}
      placeholder="Ex.: Apto 12"
      value={complemento}
      onChange={(e) => setComplemento(e.target.value)}
    />
  </div>

  <div>
    <label style={labelStyle}>Bairro</label>
    <input
      style={inputStyle}
      placeholder="Ex.: Centro"
      value={bairro}
      onChange={(e) => setBairro(e.target.value)}
    />
  </div>

  <div>
    <label style={labelStyle}>Cidade</label>
    <input
      style={inputStyle}
      placeholder="Ex.: Matão"
      value={cidade}
      onChange={(e) => setCidade(e.target.value)}
    />
  </div>

  <div>
    <label style={labelStyle}>Estado</label>
    <input
      style={inputStyle}
      placeholder="Ex.: SP"
      value={estado}
      onChange={(e) => setEstado(e.target.value)}
    />
  </div>
</div>

<div style={{ height: '14px' }} />

<div style={{ height: '14px' }} />

<div style={gridStyle}>
  <input
    style={inputStyle}
    placeholder="Profissão"
    value={profissao}
    onChange={(e) => setProfissao(e.target.value)}
  />

  <input
    style={inputStyle}
    placeholder="Local de trabalho"
    value={localTrabalho}
    onChange={(e) => setLocalTrabalho(e.target.value)}
  />

  <select
    style={inputStyle}
    value={observacoes}
    onChange={(e) => setObservacoes(e.target.value)}
  >
    <option value="">Comportamento do cliente</option>
    <option value="Cliente novo">🆕 Cliente novo</option>
    <option value="Paga corretamente">✅ Paga corretamente</option>
    <option value="Às vezes atrasa">🟡 Às vezes atrasa</option>
    <option value="Atrasa recorrentemente">🟠 Atrasa recorrentemente</option>
    <option value="Em observação">👀 Em observação</option>
    <option value="Negociação em andamento">🤝 Negociação em andamento</option>
    <option value="Cobrança judicial">⚖️ Cobrança judicial</option>
    <option value="Não emprestar novamente">⛔ Não emprestar novamente</option>
  </select>
</div>

<div
  style={{
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '28px',
  }}
>
  <button
    style={secondaryButtonStyle}
    onClick={limparFormulario}
  >
    Cancelar
  </button>

  <button
    style={buttonStyle}
    onClick={salvarCliente}
    disabled={carregando || buscandoCep}
  >
    {carregando
      ? 'Salvando...'
      : editandoId
      ? 'Salvar alterações'
      : 'Cadastrar cliente'}
  </button>
</div>
    </div>
  </div>
)}

      <div style={cardStyle}>
        <div style={listHeaderStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Lista de clientes</h2>
            <p style={{ ...subtitleStyle, margin: '6px 0 0' }}>
              Consulte os dados, atualize informações ou entre em contato.
            </p>
          </div>
        </div>

        {clientesFiltrados.length === 0 ? (
          <p style={subtitleStyle}>Nenhum cliente encontrado.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {clientesFiltrados.map((cliente) => (
              <div key={cliente.id} style={clientCardStyle}>
                <div style={clientHeaderStyle}>
                  <div style={clientIdentityStyle}>
                    <div style={avatarStyle}>
                      {cliente.nome?.trim().charAt(0).toUpperCase() || 'C'}
                    </div>

                    <div>
                      <strong style={clientNameStyle}>{cliente.nome}</strong>
                      <span style={clientPhoneStyle}>{cliente.telefone}</span>
                    </div>
                  </div>

                  <div style={actionsStyle}>
                    <button
                      style={whatsButtonStyle}
                      onClick={() => abrirWhatsApp(cliente)}
                    >
                      WhatsApp
                    </button>

                    <button
                      style={secondaryButtonStyle}
                      onClick={() => editarCliente(cliente)}
                    >
                      Editar
                    </button>

                    <button
                      style={dangerButtonStyle}
                      onClick={() => excluirCliente(cliente.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div style={compactInfoRowStyle}>
                  <span style={compactInfoItemStyle}>
                    <span style={compactLabelStyle}>CPF</span>
                    <strong>{cliente.cpf || 'Não informado'}</strong>
                  </span>

                  <span style={compactInfoItemStyle}>
                    <span style={compactLabelStyle}>Cidade</span>
                    <strong>{cliente.cidade || 'Não informada'}</strong>
                  </span>

                  <span style={compactInfoItemStyle}>
                    <span style={compactLabelStyle}>Profissão</span>
                    <strong>{cliente.profissao || 'Não informada'}</strong>
                  </span>

                  <span style={compactInfoItemStyle}>
                    <span style={compactLabelStyle}>Trabalho</span>
                    <strong>{cliente.local_trabalho || 'Não informado'}</strong>
                  </span>
                </div>

              <div style={detailsRowStyle} className="lash-details-row">

  <div style={compactDetailStyle}>
    <span style={compactLabelStyle}>Endereço</span>

    <span style={compactTextStyle}>
      {montarEndereco(cliente)}
    </span>
  </div>

  {cliente.observacoes && (
    <div style={compactObservationStyle}>
      <span style={compactLabelStyle}>Comportamento</span>

      <span style={compactTextStyle}>
        {cliente.observacoes}
      </span>
    </div>
  )}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const compactInfoRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '6px',
  marginTop: '10px',
}

const detailsRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(220px, 0.8fr)',
  gap: '6px',
  marginTop: '6px',
}

const compactDetailStyle: React.CSSProperties = {
  minWidth: 0,
  padding: '8px 9px',
  borderRadius: '9px',
  border: '1px solid #1F3A5F',
  background: '#0B1828',
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
  overflow: 'hidden',
  boxSizing: 'border-box',
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
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '12px',
  marginTop: '20px',
}

const summaryCardStyle: React.CSSProperties = {
  minHeight: '96px',
  padding: '15px 16px',
  borderRadius: '16px',
  border: '1px solid #1F3A5F',
  background: 'linear-gradient(180deg,#11223D 0%, #0D1B2E 100%)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '5px',
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
  fontSize: '13px',
  fontWeight: 700,
}

const searchCardStyle: React.CSSProperties = {
  marginTop: '22px',
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
}

const searchFieldWrapperStyle: React.CSSProperties = {
  position: 'relative',
  flex: '1 1 520px',
}

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '15px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#60A5FA',
  fontSize: '20px',
  pointerEvents: 'none',
}

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px 14px 44px',
  borderRadius: '14px',
  border: '1px solid #1F3A5F',
  background: '#132641',
  color: '#F8FAFC',
  fontSize: '15px',
  boxSizing: 'border-box',
}

const counterBadgeStyle: React.CSSProperties = {
  padding: '10px 13px',
  borderRadius: '999px',
  border: '1px solid #2563EB',
  background: 'rgba(37,99,235,.18)',
  color: '#60A5FA',
  fontSize: '13px',
  fontWeight: 800,
}

const cardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: '#0D1B2E',
  border: '1px solid #1F3A5F',
  borderRadius: '20px',
  padding: '22px',
}

const listHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
  marginBottom: '18px',
}

const sectionTitleStyle: React.CSSProperties = {
 marginTop: '18px',
  marginBottom: '12px',
  fontSize: '15px',
  color: '#F8FAFC',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '12px',
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
   fontSize: '14px',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: '110px',
  resize: 'vertical',
}

const cepFieldWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const cepStatusStyle: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: '11px',
  paddingLeft: '3px',
}

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: '10px',
  background: '#2563EB',
  color: '#fff',
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '10px',
  border: '1px solid #1F3A5F',
  background: '#132641',
  color: '#F8FAFC',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '12px',
}

const whatsButtonStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '10px',
  border: 'none',
  background: '#22c55e',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '12px',
}

const dangerButtonStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '10px',
  border: 'none',
  background: '#dc2626',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '12px',
}

const clientInfoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '6px',
  width: '100%',
  boxSizing: 'border-box',
};

const clientInfoItemStyle: React.CSSProperties = {
  background: '#0b1a2b',
  border: '1px solid #1c354b',
  borderRadius: '8px',
  padding: '7px 8px',
  minWidth: 0,
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const clientInfoLabelStyle: React.CSSProperties = {
  color: '#8494a8',
  fontSize: '9px',
  marginBottom: '3px',
};

const clientInfoValueStyle: React.CSSProperties = {
  color: '#f8fafc',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: '1.3',
  overflowWrap: 'anywhere',
};

const clientHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '12px',
  flexWrap: 'wrap',
}

const clientsListStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '10px',
  width: '100%',
};

const clientIdentityStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '11px',
  minWidth: 0,
}

const avatarStyle: React.CSSProperties = {
  width: '34px',
  height: '34px',
  borderRadius: '10px',
  background: '#2563EB',
  border: '1px solid #60A5FA',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 900,
  flexShrink: 0,
}

const clientNameStyle: React.CSSProperties = {
  display: 'block',
  color: '#F8FAFC',
  fontSize: '15px',
  marginBottom: '2px',
}

const clientPhoneStyle: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: '12px',
}

const compactInfoItemStyle: React.CSSProperties = {
  minWidth: 0,
  padding: '7px 8px',
  borderRadius: '9px',
  border: '1px solid #1F3A5F',
  background: '#0B1828',
  color: '#F8FAFC',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  fontSize: '11px',
  overflow: 'hidden',
  boxSizing: 'border-box',
}

const compactLabelStyle: React.CSSProperties = {
  color: '#94A3B8',
  fontSize: '10px',
  fontWeight: 600,
}

const compactObservationStyle: React.CSSProperties = {
  padding: '8px 9px',
  borderRadius: '9px',
  border: '1px solid #1F3A5F',
  background: '#0B1828',
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
  minWidth: 0,
  overflow: 'hidden',
  boxSizing: 'border-box',
}

const compactTextStyle: React.CSSProperties = {
  color: '#CBD5E1',
  fontSize: '12px',
  lineHeight: 1.4,
  overflowWrap: 'anywhere',
}

const clientCardStyle: React.CSSProperties = {
  background: '#060C11',
  borderRadius: '13px',
  padding: '10px',
  border: '1px solid #1C354B',
  width: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'nowrap',
  alignItems: 'center',
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.75)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px',
  zIndex: 9999,
}

const modalStyle: React.CSSProperties = {
 position: 'relative',
  width: '100%',
  maxWidth: '1120px',
  maxHeight: '95vh',
  overflowY: 'auto',
  background: '#0D1B2E',
  border: '1px solid #1F3A5F',
  borderRadius: '18px',
  padding: '24px',
  boxShadow: '0 20px 60px rgba(0,0,0,.55)',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '24px',
}

const sectionTitleModalStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  fontWeight: 700,
  color: '#F8FAFC',
}

const sectionDescriptionStyle: React.CSSProperties = {
  marginTop: '6px',
  color: '#94A3B8',
  fontSize: '14px',
  lineHeight: 1.5,
}

const modalCloseButtonStyle: React.CSSProperties = {
  width: '46px',
  height: '46px',
  borderRadius: '50%',
  border: '1px solid #1F3A5F',
  background: '#132641',
  color: '#F8FAFC',
  cursor: 'pointer',
  fontSize: '22px',
}

const ordenacaoSelectStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderRadius: '12px',
  border: '1px solid #1F3A5F',
  background: '#132641',
  color: '#F8FAFC',
  fontSize: '14px',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '180px',
}

const sectionCardStyle: React.CSSProperties = {
  marginTop: '18px',
  padding: 0,
  border: 'none',
  background: 'transparent',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '7px',
  color: '#CBD5E1',
  fontSize: '12px',
  fontWeight: 600,
}
