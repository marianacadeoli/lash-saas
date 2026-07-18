'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Cliente = {
  id: number
  nome: string
}

export default function VisaoGeralSection() {
  const supabase = useMemo(() => createClient(), [])
  const [clientes, setClientes] = useState<Cliente[]>([])

  useEffect(() => {
    carregarDados()
  }, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  async function carregarDados() {
    const userId = await pegarUserId()

    if (!userId) {
      setClientes([])
      return
    }

    const { data, error } = await supabase
      .from('Clientes')
      .select('id, nome')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('ERRO VISÃO GERAL:', error)
      setClientes([])
      return
    }

    setClientes(data || [])
  }

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return (
    <div style={pageContainerStyle}>
      <div>
        <h1 style={{ margin: 0, marginBottom: '8px' }}>Visão geral</h1>

        <p style={{ ...subtitleStyle, margin: 0 }}>
          Resumo financeiro do sistema de empréstimos.
        </p>
      </div>

      <div style={cardsGridStyle}>
        <div style={cardStyle}>
          <span style={labelStyle}>Total emprestado</span>
          <strong style={numberStyle}>{formatarMoeda(0)}</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Total a receber</span>
          <strong style={numberStyle}>{formatarMoeda(0)}</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Recebido no mês</span>
          <strong style={numberStyle}>{formatarMoeda(0)}</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Parcelas em atraso</span>
          <strong style={numberStyle}>0</strong>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Clientes cadastrados</span>
          <strong style={numberStyle}>{clientes.length}</strong>
        </div>
      </div>

      <div style={sectionCardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Próximos vencimentos</h2>
        <p style={{ ...subtitleStyle, margin: 0 }}>Nenhum vencimento registrado ainda.</p>
      </div>

      <div style={sectionCardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Clientes em atraso</h2>
        <p style={{ ...subtitleStyle, margin: 0 }}>Nenhum cliente em atraso no momento.</p>
      </div>

      <div style={sectionCardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Últimos clientes cadastrados</h2>

        {clientes.length === 0 ? (
          <p style={{ ...subtitleStyle, margin: 0 }}>Nenhum cliente cadastrado ainda.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {clientes.slice(0, 5).map((cliente) => (
              <div key={cliente.id} style={itemStyle}>
                <strong>👤 {cliente.nome}</strong>
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
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
}

const subtitleStyle: React.CSSProperties = {
  color: '#b4b4b4',
  lineHeight: 1.6,
}

const cardsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '16px',
}

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(217,70,239,0.18), rgba(88,28,135,0.18))',
  border: '1px solid rgba(217,70,239,0.35)',
  borderRadius: '18px',
  padding: '18px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#a1a1aa',
  marginBottom: '10px',
}

const numberStyle: React.CSSProperties = {
  fontSize: '24px',
}

const sectionCardStyle: React.CSSProperties = {
  background: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: '18px',
  padding: '18px',
}

const itemStyle: React.CSSProperties = {
  background: '#151515',
  border: '1px solid #2a2a2a',
  borderRadius: '16px',
  padding: '16px',
}