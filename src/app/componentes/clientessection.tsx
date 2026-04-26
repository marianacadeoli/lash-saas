'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Cliente = {
  id: number
  nome: string
  telefone: string
  data_nascimento: string | null
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
  const [dataNascimento, setDataNascimento] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [desconto, setDesconto] = useState('10')

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

    setClientes(data || [])
  }

  function limparFormulario() {
    setNome('')
    setTelefone('')
    setDataNascimento('')
    setObservacoes('')
    setEditandoId(null)
    setMostrarFormulario(false)
  }

  async function salvarCliente() {
    const userId = await pegarUserId()
    if (!userId) return

    if (!nome.trim()) {
      alert('Digite o nome da cliente.')
      return
    }

    if (!telefone.trim()) {
      alert('Digite o WhatsApp da cliente.')
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
      data_nascimento: dataNascimento || null,
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
        alert('Erro ao editar cliente.')
        setCarregando(false)
        return
      }
    } else {
      const { error } = await supabase.from('Clientes').insert(payload)

      if (error) {
        alert('Erro ao salvar cliente.')
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
    setNome(cliente.nome)
    setTelefone(cliente.telefone)
    setDataNascimento(cliente.data_nascimento || '')
    setObservacoes(cliente.observacoes || '')
    setMostrarFormulario(true)
  }

  async function excluirCliente(id: number) {
    const confirmou = confirm('Tem certeza que deseja excluir esta cliente?')
    if (!confirmou) return

    const userId = await pegarUserId()
    if (!userId) return

    const { error } = await supabase
      .from('Clientes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      alert('Erro ao excluir cliente.')
      return
    }

    await carregarClientes()
  }

  function telefoneLimpo(telefone: string) {
    return telefone.replace(/\D/g, '')
  }

  function abrirWhatsApp(cliente: Cliente, mensagem?: string) {
    const numero = telefoneLimpo(cliente.telefone)

    if (!numero) {
      alert('Telefone inválido.')
      return
    }

    const texto = mensagem || `Oi, ${cliente.nome}! Tudo bem? 💅`
    const url = `https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`

    window.open(url, '_blank')
  }

  function diasAteAniversario(dataNascimento: string | null) {
    if (!dataNascimento) return null

    const hoje = new Date()
    const nascimento = new Date(dataNascimento + 'T00:00:00')

    const aniversarioEsteAno = new Date(
      hoje.getFullYear(),
      nascimento.getMonth(),
      nascimento.getDate()
    )

    if (aniversarioEsteAno < hoje) {
      aniversarioEsteAno.setFullYear(hoje.getFullYear() + 1)
    }

    const diferenca = aniversarioEsteAno.getTime() - hoje.getTime()
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24))
  }

  function formatarData(data: string | null) {
    if (!data) return '-'
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  const clientesFiltradas = useMemo(() => {
    return clientes.filter((cliente) =>
      cliente.nome.toLowerCase().includes(busca.toLowerCase())
    )
  }, [clientes, busca])

  const aniversariantes = useMemo(() => {
    return clientes.filter((cliente) => {
      const dias = diasAteAniversario(cliente.data_nascimento)
      return dias !== null && dias >= 0 && dias <= 5
    })
  }, [clientes])

  function mensagemAniversario(cliente: Cliente) {
    return `Oi, ${cliente.nome}! Vi que seu aniversário está chegando 🎉

Preparei um presente especial para você: ${desconto}% OFF no seu próximo atendimento 💅

Válido até o dia do seu aniversário.`
  }

  return (
    <div>
      <div style={topBarStyle}>
        <div>
          <h1 style={{ margin: 0 }}>👩‍🦰 Clientes</h1>
          <p style={subtitleStyle}>
            Cadastre, edite e acompanhe aniversários das suas clientes.
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
          {clientes.length}/{LIMITE_CLIENTES} clientes cadastradas
        </span>
      </div>

      {mostrarFormulario && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            {editandoId ? 'Editar cliente' : 'Nova cliente'}
          </h2>

          <div style={gridStyle}>
            <input
              style={inputStyle}
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="WhatsApp"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />

            <input
              style={inputStyle}
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Observações"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

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
        <h2 style={{ marginTop: 0 }}>🎂 Aniversários nos próximos 5 dias</h2>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Desconto do cupom (%)</label>

          <input
            style={{ ...inputStyle, maxWidth: '120px' }}
            type="number"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
          />
        </div>

        {aniversariantes.length === 0 ? (
          <p style={subtitleStyle}>Nenhum aniversário nos próximos dias.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            {aniversariantes.map((cliente) => (
              <div key={cliente.id} style={clientCardStyle}>
                <div>
                  <strong>{cliente.nome}</strong>
                  <p style={mutedTextStyle}>
                    Faz aniversário em {diasAteAniversario(cliente.data_nascimento)} dia(s)
                  </p>
                </div>

                <button
                  style={whatsButtonStyle}
                  onClick={() => abrirWhatsApp(cliente, mensagemAniversario(cliente))}
                >
                  Enviar cupom
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Lista de clientes</h2>

        {clientesFiltradas.length === 0 ? (
          <p style={subtitleStyle}>Nenhuma cliente encontrada.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {clientesFiltradas.map((cliente) => (
              <div key={cliente.id} style={clientCardStyle}>
                <div>
                  <strong style={{ fontSize: '18px' }}>👤 {cliente.nome}</strong>

                  <p style={mutedTextStyle}>📲 {cliente.telefone}</p>

                  <p style={mutedTextStyle}>
                    🎂 {formatarData(cliente.data_nascimento)}
                  </p>

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