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
    <div>
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

      <div style={searchCardStyle}>
        <input
          style={inputStyle}
          placeholder="Buscar cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <span style={{ color: '#a1a1aa', fontSize: '14px' }}>
          {clientes.length}/{LIMITE_CLIENTES} clientes cadastrados
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
            <input
              style={inputStyle}
              placeholder="CEP"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
            />

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
            <button style={buttonStyle} onClick={salvarCliente} disabled={carregando}>
              {carregando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar'}
            </button>

            <button style={secondaryButtonStyle} onClick={limparFormulario}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Lista de clientes</h2>

        {clientesFiltrados.length === 0 ? (
          <p style={subtitleStyle}>Nenhum cliente encontrado.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {clientesFiltrados.map((cliente) => (
              <div key={cliente.id} style={clientCardStyle}>
                <div>
                  <strong style={{ fontSize: '18px' }}>👤 {cliente.nome}</strong>

                  <p style={mutedTextStyle}>📱 {cliente.telefone}</p>

                  {cliente.cpf && (
                    <p style={mutedTextStyle}>🪪 CPF: {cliente.cpf}</p>
                  )}

                  <p style={mutedTextStyle}>📍 {montarEndereco(cliente)}</p>

                  {(cliente.profissao || cliente.local_trabalho) && (
                    <p style={mutedTextStyle}>
                      💼 {cliente.profissao || 'Profissão não informada'}
                      {cliente.local_trabalho ? ` — ${cliente.local_trabalho}` : ''}
                    </p>
                  )}

                  {cliente.observacoes && (
                    <p style={mutedTextStyle}>📝 {cliente.observacoes}</p>
                  )}
                </div>

                <div style={actionsStyle}>
                  <button style={whatsButtonStyle} onClick={() => abrirWhatsApp(cliente)}>
                    WhatsApp
                  </button>

                  <button style={secondaryButtonStyle} onClick={() => editarCliente(cliente)}>
                    Editar
                  </button>

                  <button style={dangerButtonStyle} onClick={() => excluirCliente(cliente.id)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
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
}

const searchCardStyle: React.CSSProperties = {
  marginTop: '22px',
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
}

const cardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: '18px',
  padding: '18px',
}

const sectionTitleStyle: React.CSSProperties = {
  marginTop: '20px',
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
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: '110px',
  resize: 'vertical',
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
  border: '1px solid #333',
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
  background: '#151515',
  border: '1px solid #2a2a2a',
  borderRadius: '16px',
  padding: '16px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap',
}

const mutedTextStyle: React.CSSProperties = {
  color: '#b4b4b4',
  margin: '6px 0',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  alignItems: 'center',
}