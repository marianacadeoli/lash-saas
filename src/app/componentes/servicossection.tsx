'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Servico = {
  id: number
  nome: string
  valor: number
  duracao: number
  user_id: string
}

export default function ServicosSection() {
  const supabase = createClient()

  const [servicos, setServicos] = useState<Servico[]>([])
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [duracao, setDuracao] = useState('')
  const [busca, setBusca] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)

  useEffect(() => {
    carregarServicos()
  }, [])

  async function pegarUserId() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user.id
  }

  async function carregarServicos() {
    const userId = await pegarUserId()
    if (!userId) return

    const { data } = await supabase
      .from('Servicos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    setServicos(data || [])
  }

  function limpar() {
    setNome('')
    setValor('')
    setDuracao('')
    setEditandoId(null)
  }

  async function salvar() {
    const userId = await pegarUserId()
    if (!userId) return

    if (!nome || !valor || !duracao) {
      alert('Preencha tudo')
      return
    }

    const payload = {
      nome,
      valor: Number(valor),
      duracao: Number(duracao),
      user_id: userId,
    }

    if (editandoId) {
      await supabase.from('Servicos').update(payload).eq('id', editandoId)
    } else {
      await supabase.from('Servicos').insert(payload)
    }

    limpar()
    carregarServicos()
  }

  function editar(servico: Servico) {
    setEditandoId(servico.id)
    setNome(servico.nome)
    setValor(String(servico.valor))
    setDuracao(String(servico.duracao))
  }

  async function excluir(id: number) {
    await supabase.from('Servicos').delete().eq('id', id)
    carregarServicos()
  }

  const filtrados = servicos.filter(s =>
    s.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <h1>💅 Serviços</h1>

      <input
        placeholder="Buscar serviço..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={input}
      />

      <div style={card}>
        <h2>{editandoId ? 'Editar serviço' : 'Novo serviço'}</h2>

        <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} style={input} />
        <input placeholder="Valor (R$)" value={valor} onChange={e => setValor(e.target.value)} style={input} />
        <input placeholder="Duração (min)" value={duracao} onChange={e => setDuracao(e.target.value)} style={input} />

        <button onClick={salvar} style={btn}>
          {editandoId ? 'Salvar' : 'Cadastrar'}
        </button>
      </div>

      <div style={card}>
        <h2>Lista de serviços</h2>

        {filtrados.map(s => (
          <div key={s.id} style={item}>
            <div>
              <strong>{s.nome}</strong>
              <p>R$ {s.valor}</p>
              <p>{s.duracao} min</p>
            </div>

            <div>
              <button onClick={() => editar(s)}>Editar</button>
              <button onClick={() => excluir(s.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const input = {
  width: '100%',
  padding: '10px',
  marginBottom: '10px',
  borderRadius: '10px',
  background: '#111',
  color: 'white',
  border: '1px solid #333',
}

const card = {
  background: '#151515',
  padding: '20px',
  borderRadius: '12px',
  marginTop: '20px',
}

const btn = {
  padding: '12px',
  background: '#d946ef',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
}

const item = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '10px',
  padding: '10px',
  background: '#111',
  borderRadius: '10px',
}