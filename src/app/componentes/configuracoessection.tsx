'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Configuracao = {
  id?: number
  user_id: string
  nome_negocio: string | null
  hora_inicio: string | null
  hora_fim: string | null
  desconto_aniversario: number | null
  dias_aviso: number | null
}

export default function ConfiguracoesSection() {
  const supabase = createClient()

  const [nomeNegocio, setNomeNegocio] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [descontoAniversario, setDescontoAniversario] = useState('10')
  const [diasAviso, setDiasAviso] = useState('5')

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  async function carregarConfiguracoes() {
    const userId = await pegarUserId()

    if (!userId) {
      setCarregando(false)
      return
    }

    const { data, error } = await supabase
      .from('Configuracoes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.log('ERRO AO CARREGAR CONFIGURAÇÕES:', error)
      setCarregando(false)
      return
    }

    if (data) {
      const config = data as Configuracao

      setNomeNegocio(config.nome_negocio || '')
      setHoraInicio(config.hora_inicio || '')
      setHoraFim(config.hora_fim || '')
      setDescontoAniversario(String(config.desconto_aniversario ?? 10))
      setDiasAviso(String(config.dias_aviso ?? 5))
    }

    setCarregando(false)
  }

  async function salvarConfiguracoes() {
    const userId = await pegarUserId()

    if (!userId) {
      alert('Usuário não encontrado.')
      return
    }

    if (!nomeNegocio.trim()) {
      alert('Digite o nome do negócio.')
      return
    }

    if (!horaInicio || !horaFim) {
      alert('Preencha o horário de início e fim.')
      return
    }

    setSalvando(true)

    const payload = {
      user_id: userId,
      nome_negocio: nomeNegocio.trim(),
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      desconto_aniversario: Number(descontoAniversario),
      dias_aviso: Number(diasAviso),
    }

    const { error } = await supabase
      .from('Configuracoes')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      console.log('ERRO AO SALVAR CONFIGURAÇÕES:', error)
      alert('Erro ao salvar configurações.')
      setSalvando(false)
      return
    }

    setSalvando(false)
    alert('Configurações salvas com sucesso!')
  }

  if (carregando) {
    return (
      <div>
        <h1 style={{ margin: 0 }}>⚙️ Configurações</h1>
        <p style={subtitleStyle}>Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ margin: 0 }}>⚙️ Configurações</h1>

      <p style={subtitleStyle}>
        Ajuste informações do negócio, agenda, cupons e assinatura.
      </p>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>💅 Dados do negócio</h2>

        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Nome do negócio</label>
            <input
              style={inputStyle}
              placeholder="Ex: Mari Lash Designer"
              value={nomeNegocio}
              onChange={(e) => setNomeNegocio(e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Horário de início</label>
            <input
              style={inputStyle}
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Horário de fim</label>
            <input
              style={inputStyle}
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>🎂 Cupom de aniversário</h2>

        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Desconto padrão (%)</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              max="100"
              placeholder="10"
              value={descontoAniversario}
              onChange={(e) => setDescontoAniversario(e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Avisar quantos dias antes?</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              max="30"
              placeholder="5"
              value={diasAviso}
              onChange={(e) => setDiasAviso(e.target.value)}
            />
          </div>
        </div>

        <p style={mutedStyle}>
          Esse desconto será usado para montar a mensagem de aniversário no WhatsApp.
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>💳 Plano e assinatura</h2>

        <p style={mutedStyle}>
          Gerenciamento de assinatura será conectado ao Stripe depois.
        </p>
      </div>

      <button
        onClick={salvarConfiguracoes}
        disabled={salvando}
        style={buttonStyle}
      >
        {salvando ? 'Salvando...' : 'Salvar configurações'}
      </button>

      <div style={dangerCardStyle}>
        <h2 style={{ marginTop: 0 }}>🚨 Zona de perigo</h2>

        <p style={mutedStyle}>
          Para excluir a conta, primeiro será necessário cancelar a assinatura ativa.
        </p>

        <button
          style={dangerButtonStyle}
          onClick={() =>
            alert('Em breve vamos conectar a exclusão segura da conta.')
          }
        >
          Excluir conta
        </button>
      </div>
    </div>
  )
}

const subtitleStyle: React.CSSProperties = {
  color: '#b4b4b4',
  lineHeight: 1.6,
}

const cardStyle: React.CSSProperties = {
  marginTop: '24px',
  background: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: '18px',
  padding: '18px',
}

const dangerCardStyle: React.CSSProperties = {
  ...cardStyle,
  border: '1px solid #7f1d1d',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '14px',
  marginTop: '12px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#d4d4d4',
  marginBottom: '8px',
  fontSize: '14px',
  fontWeight: 700,
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

const mutedStyle: React.CSSProperties = {
  color: '#b4b4b4',
  lineHeight: 1.6,
}

const buttonStyle: React.CSSProperties = {
  marginTop: '20px',
  padding: '14px 18px',
  borderRadius: '14px',
  border: 'none',
  background: '#d946ef',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '15px',
}

const dangerButtonStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '12px 14px',
  borderRadius: '12px',
  border: 'none',
  background: '#dc2626',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}