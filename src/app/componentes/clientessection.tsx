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
    return clientes.filter((cliente) => {
      const termo = busca.toLowerCase()

      return (
        cliente.nome?.toLowerCase().includes(termo) ||
        cliente.telefone?.toLowerCase().includes(termo) ||
        cliente.cpf?.toLowerCase().includes(termo) ||
        cliente.cidade?.toLowerCase().includes(termo)
      )
    })
  }, [clientes, busca])

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
      <div style={topBarStyle}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>Clientes</h1>
          <p style={subtitleStyle}>
            Cadastre e organize os dados dos clientes.
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

        <span style={counterBadgeStyle}>
          {clientes.length}/{LIMITE_CLIENTES} clientes
        </span>
      </div>

      {mostrarFormulario && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            {editandoId ? 'Editar cliente' : 'Novo cliente'}
          </h2>

          <h3 style={sectionTitleStyle}>Dados do cliente</h3>

          <div style={gridStyle}>
            <input
              style={inputStyle}
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Celular"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
          </div>

          <h3 style={sectionTitleStyle}>Endereço completo</h3>

          <div style={gridStyle}>
            <div style={cepFieldWrapperStyle}>
              <input
                style={inputStyle}
                placeholder="CEP"
                value={cep}
                inputMode="numeric"
                maxLength={9}
                onChange={(e) => setCep(formatarCep(e.target.value))}
                onBlur={consultarCep}
              />

              <span style={cepStatusStyle}>
                {buscandoCep ? 'Buscando endereço...' : 'Preenche automaticamente'}
              </span>
            </div>

            <input
              style={inputStyle}
              placeholder="Rua"
              value={rua}
              onChange={(e) => setRua(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Número"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Complemento"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            />
          </div>

          <h3 style={sectionTitleStyle}>Informações profissionais</h3>

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
          </div>

          <h3 style={sectionTitleStyle}>Observações</h3>

          <textarea
            style={textareaStyle}
            placeholder="Ex: prefere pagar por PIX, cobrar após as 18h, cliente antigo..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
            <button style={buttonStyle} onClick={salvarCliente} disabled={carregando || buscandoCep}>
              {carregando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar'}
            </button>

            <button style={secondaryButtonStyle} onClick={limparFormulario}>
              Cancelar
            </button>
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

                <div style={detailsRowStyle}>
                  <div style={compactDetailStyle}>
                    <span style={compactLabelStyle}>Endereço</span>
                    <span style={compactTextStyle}>
                      {montarEndereco(cliente)}
                    </span>
                  </div>

                  {cliente.observacoes && (
                    <div style={compactObservationStyle}>
                      <span style={compactLabelStyle}>Observações</span>
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

const pageContainerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '1180px',
  margin: '0 auto',
}

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
}

const subtitleStyle: React.CSSProperties = {
  color: '#b4b4b4',
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
  minHeight: '122px',
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
  color: '#8f8f97',
  fontSize: '20px',
  pointerEvents: 'none',
}

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px 14px 44px',
  borderRadius: '14px',
  border: '1px solid #333',
  background: '#0f0f0f',
  color: '#ffffff',
  fontSize: '15px',
  boxSizing: 'border-box',
}

const counterBadgeStyle: React.CSSProperties = {
  padding: '10px 13px',
  borderRadius: '999px',
  border: '1px solid rgba(217,70,239,0.35)',
  background: 'rgba(217,70,239,0.10)',
  color: '#e879f9',
  fontSize: '13px',
  fontWeight: 800,
}

const cardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: '#101010',
  border: '1px solid #2a2a2a',
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
  marginTop: '22px',
  marginBottom: '12px',
  fontSize: '15px',
  color: '#f5f5f5',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: '14px',
  border: '1px solid #333',
  background: '#0f0f0f',
  color: 'white',
  fontSize: '15px',
  boxSizing: 'border-box',
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
  color: '#8f8f97',
  fontSize: '11px',
  paddingLeft: '3px',
}

const buttonStyle: React.CSSProperties = {
  padding: '13px 16px',
  borderRadius: '14px',
  border: 'none',
  background: '#d946ef',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid #3f3f46',
  background: '#27272a',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}

const whatsButtonStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '12px',
  border: 'none',
  background: '#22c55e',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}

const dangerButtonStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '12px',
  border: 'none',
  background: '#dc2626',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}

const clientCardStyle: React.CSSProperties = {
  background: '#2b1d33',
  border: '1px solid #6f3d7a',
  borderRadius: '16px',
  padding: '16px',
}

const clientHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '14px',
  flexWrap: 'wrap',
}

const clientIdentityStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '11px',
  minWidth: 0,
}

const avatarStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '12px',
  background: '#8b4a97',
  border: '1px solid #b46bc2',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  fontWeight: 900,
  flexShrink: 0,
}

const clientNameStyle: React.CSSProperties = {
  display: 'block',
  color: '#ffffff',
  fontSize: '17px',
  marginBottom: '3px',
}

const clientPhoneStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '13px',
}

const compactInfoRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
  gap: '8px',
  marginTop: '14px',
}

const compactInfoItemStyle: React.CSSProperties = {
  minWidth: 0,
  padding: '10px 11px',
  borderRadius: '11px',
  border: '1px solid #5c4163',
  background: '#36253e',
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '13px',
}

const compactLabelStyle: React.CSSProperties = {
  color: '#8f8f97',
  fontSize: '11px',
  fontWeight: 600,
}

const detailsRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(220px, 0.8fr)',
  gap: '8px',
  marginTop: '8px',
}

const compactDetailStyle: React.CSSProperties = {
  padding: '10px 11px',
  borderRadius: '11px',
  border: '1px solid #5c4163',
  background: '#36253e',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0,
}

const compactObservationStyle: React.CSSProperties = {
  padding: '10px 11px',
  borderRadius: '11px',
  border: '1px solid #725977',
  background: '#403047',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0,
}

const compactTextStyle: React.CSSProperties = {
  color: '#d4d4d8',
  fontSize: '13px',
  lineHeight: 1.45,
  overflowWrap: 'anywhere',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '7px',
  flexWrap: 'wrap',
  alignItems: 'center',
}