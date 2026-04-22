'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Cliente = {
  id: number
  nome: string
}

type Agendamento = {
  id: number
  cliente_id: number
  cliente_nome: string
  data: string
  valor: number
  status: string
  user_id?: string
}

export default function Home() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [data, setData] = useState('')
  const [valor, setValor] = useState('')
  const [status, setStatus] = useState('agendado')

  const buscarDados = async () => {
    const { data: agData, error: agError } = await supabase
      .from('Agendamentos')
      .select('*')
      .order('data', { ascending: true })

    const { data: clData, error: clError } = await supabase
      .from('Clientes')
      .select('id, nome')

    console.log('AGENDAMENTOS:', agData)
    console.log('CLIENTES:', clData)
    console.log('AG_ERROR:', agError)
    console.log('CL_ERROR:', clError)

    if (clData) {
      setClientes(clData)
    }

    if (agData && clData) {
      const agendamentosComCliente = agData.map((ag) => {
        const cliente = clData.find((cl) => cl.id === ag.cliente_id)

        return {
          ...ag,
          cliente_nome: cliente?.nome || 'Cliente não encontrado',
        }
      })

      setAgendamentos(agendamentosComCliente)
    }
  }

  useEffect(() => {
    buscarDados()
  }, [])

  const formatarData = (valorData: string) => {
    return new Date(valorData).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const salvarAgendamento = async () => {
    if (!clienteId || !data || !valor || !status) {
      alert('Preencha todos os campos.')
      return
    }

    if (Number(valor) <= 0) {
      alert('Digite um valor maior que zero.')
      return
    }

    const agora = new Date()
    const dataEscolhida = new Date(data)

    if (dataEscolhida < agora) {
      alert('Escolha uma data e horário futuros.')
      return
    }

    const { error } = await supabase.from('Agendamentos').insert([
      {
        cliente_id: Number(clienteId),
        data,
        valor: Number(valor),
        status,
        user_id: 'b4b9a0e0-af3e-4691-a456-b02008629484',
      },
    ])

    if (error) {
      console.log(error)
      alert('Erro ao salvar agendamento.')
      return
    }

    setClienteId('')
    setData('')
    setValor('')
    setStatus('agendado')
    setMostrarFormulario(false)

    await buscarDados()
    alert('Agendamento salvo com sucesso!')
  }

  const atualizarStatus = async (
    id: number,
    novoStatus: 'feito' | 'cancelado'
  ) => {
    const { error } = await supabase
      .from('Agendamentos')
      .update({ status: novoStatus })
      .eq('id', id)

    if (error) {
      console.log(error)
      alert('Erro ao atualizar status.')
      return
    }

    await buscarDados()
  }

  const agora = new Date()

  const proximosAgendamentos = agendamentos.filter(
    (item) =>
      new Date(item.data) >= agora && item.status === 'agendado'
  )

  const historicoAgendamentos = agendamentos.filter(
    (item) =>
      new Date(item.data) < agora ||
      item.status === 'feito' ||
      item.status === 'cancelado'
  )

  const ganhosHoje = agendamentos
    .filter((item) => {
      const dataItem = new Date(item.data)
      const hoje = new Date()

      return (
        item.status === 'feito' &&
        dataItem.getDate() === hoje.getDate() &&
        dataItem.getMonth() === hoje.getMonth() &&
        dataItem.getFullYear() === hoje.getFullYear()
      )
    })
    .reduce((total, item) => total + Number(item.valor), 0)

  const totalHoje = agendamentos.filter((item) => {
    const dataItem = new Date(item.data)
    const hoje = new Date()

    return (
      dataItem.getDate() === hoje.getDate() &&
      dataItem.getMonth() === hoje.getMonth() &&
      dataItem.getFullYear() === hoje.getFullYear()
    )
  }).length

  const renderCard = (
    item: Agendamento,
    mostrarAcoes: boolean = false
  ) => (
    <div
      key={item.id}
      style={{
        border: '1px solid #2a2a2a',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        background: '#141414',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div>
          <strong style={{ fontSize: '22px' }}>{item.cliente_nome}</strong>
          <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>
            Data: {formatarData(item.data)}
          </p>
        </div>

        <span
          style={{
            background:
              item.status === 'agendado'
                ? '#2563eb'
                : item.status === 'feito'
                ? '#16a34a'
                : '#dc2626',
            padding: '6px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          {item.status}
        </span>
      </div>

      <p><strong>Valor:</strong> R$ {item.valor}</p>
      <p><strong>ID:</strong> {item.id}</p>

      {mostrarAcoes && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          <button
            onClick={() => atualizarStatus(item.id, 'feito')}
            style={{
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Concluir
          </button>

          <button
            onClick={() => atualizarStatus(item.id, 'cancelado')}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0b0b0b',
        color: 'white',
        padding: '32px 20px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <h1 style={{ fontSize: '32px', margin: 0 }}>Agenda da Lash 💅</h1>

          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            style={{
              background: '#d946ef',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 16px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            + Novo agendamento
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              borderRadius: '16px',
              padding: '18px',
            }}
          >
            <p style={{ margin: 0, opacity: 0.7 }}>Agendamentos de hoje</p>
            <h2 style={{ margin: '8px 0 0 0' }}>{totalHoje}</h2>
          </div>

          <div
            style={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              borderRadius: '16px',
              padding: '18px',
            }}
          >
            <p style={{ margin: 0, opacity: 0.7 }}>Ganhos de hoje</p>
            <h2 style={{ margin: '8px 0 0 0' }}>R$ {ganhosHoje}</h2>
          </div>
        </div>

        {mostrarFormulario && (
          <div
            style={{
              border: '1px solid #2a2a2a',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              background: '#141414',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Novo agendamento</h2>

            <div style={{ display: 'grid', gap: '12px' }}>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              >
                <option value="">Selecione a cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={data}
                onChange={(e) => setData(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              />

              <input
                type="number"
                placeholder="Valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0b0b0b',
                  color: 'white',
                  border: '1px solid #333',
                }}
              >
                <option value="agendado">agendado</option>
                <option value="feito">feito</option>
                <option value="cancelado">cancelado</option>
              </select>

              <button
                onClick={salvarAgendamento}
                style={{
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Salvar agendamento
              </button>
            </div>
          </div>
        )}

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '16px' }}>Próximos agendamentos</h2>

          {proximosAgendamentos.length === 0 ? (
            <p style={{ opacity: 0.7 }}>Nenhum agendamento futuro.</p>
          ) : (
            proximosAgendamentos.map((item) => renderCard(item, true))
          )}
        </section>

        <section>
          <h2 style={{ marginBottom: '16px' }}>Histórico</h2>

          {historicoAgendamentos.length === 0 ? (
            <p style={{ opacity: 0.7 }}>Nenhum agendamento no histórico.</p>
          ) : (
            historicoAgendamentos.map((item) => renderCard(item, false))
          )}
        </section>
      </div>
    </main>
  )
}