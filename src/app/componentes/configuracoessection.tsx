'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Configuracao = {
  id: number
  user_id: string
  nome_negocio: string | null
  hora_inicio: string | null
  hora_fim: string | null
  desconto_aniversario: number | null
  dias_aviso: number | null
  logo_url: string | null
}

type Assinatura = {
  plan: string | null
  status: string | null
  current_period_end: string | null
}

export default function ConfiguracoesSection() {
  const supabase = createClient()
  const router = useRouter()

  const [configId, setConfigId] = useState<number | null>(null)
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)

  const [nomeNegocio, setNomeNegocio] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [descontoAniversario, setDescontoAniversario] = useState('10')
  const [diasAviso, setDiasAviso] = useState('5')
  const [logoUrl, setLogoUrl] = useState('')

  const [editandoNegocio, setEditandoNegocio] = useState(false)
  const [editandoCupom, setEditandoCupom] = useState(false)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [enviandoLogo, setEnviandoLogo] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function pegarUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.user.id
  }

  function formatarData(data?: string | null) {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  async function carregarDados() {
    const userId = await pegarUserId()

    if (!userId) {
      setCarregando(false)
      return
    }

    const { data: configData } = await supabase
      .from('Configuracoes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (configData) {
      const config = configData as Configuracao

      setConfigId(config.id)
      setNomeNegocio(config.nome_negocio || '')
      setHoraInicio(config.hora_inicio || '')
      setHoraFim(config.hora_fim || '')
      setDescontoAniversario(String(config.desconto_aniversario ?? 10))
      setDiasAviso(String(config.dias_aviso ?? 5))
      setLogoUrl(config.logo_url || '')
    }

    const { data: assinaturaData } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle()

    if (assinaturaData) {
      setAssinatura(assinaturaData as Assinatura)
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
      logo_url: logoUrl || null,
    }

    let error = null

    if (configId) {
      const resultado = await supabase
        .from('Configuracoes')
        .update(payload)
        .eq('id', configId)
        .eq('user_id', userId)

      error = resultado.error
    } else {
      const resultado = await supabase
        .from('Configuracoes')
        .insert(payload)
        .select('id')
        .single()

      error = resultado.error

      if (resultado.data?.id) {
        setConfigId(resultado.data.id)
      }
    }

    if (error) {
      console.log('ERRO AO SALVAR CONFIGURAÇÕES:', error)
      alert('Erro ao salvar configurações.')
      setSalvando(false)
      return
    }

    setEditandoNegocio(false)
    setEditandoCupom(false)
    setSalvando(false)
    alert('Configurações salvas com sucesso!')
  }

  async function enviarLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const userId = await pegarUserId()
    if (!userId) return

    setEnviandoLogo(true)

    const extensao = file.name.split('.').pop()
    const nomeArquivo = `${userId}/logo-${Date.now()}.${extensao}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(nomeArquivo, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.log('ERRO AO ENVIAR LOGO:', uploadError)
      alert('Erro ao enviar logo.')
      setEnviandoLogo(false)
      return
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(nomeArquivo)

    setLogoUrl(data.publicUrl)
    setEnviandoLogo(false)
  }

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function excluirConta() {
    alert(
      'Para excluir sua conta com segurança, primeiro será necessário cancelar a assinatura ativa.'
    )
  }

  if (carregando) {
    return (
      <div>
        <h1 style={{ margin: 0 }}>Configurações</h1>
        <p style={subtitleStyle}>Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div>
    <h1 style={{ margin: 0, marginBottom: '8px' }}>Configurações</h1>

      <p style={subtitleStyle}>
        Gerencie os dados do negócio, cupom de aniversário, plano e conta.
      </p>

      <div style={resumoGridStyle}>
        <div style={resumoCardStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={{ margin: 0 }}>Resumo do negócio</h2>

            <button
              onClick={() => setEditandoNegocio(!editandoNegocio)}
              style={editButtonStyle}
            >
              Editar
            </button>
          </div>

          {!editandoNegocio ? (
            <div style={{ marginTop: '16px' }}>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo do negócio"
                  style={logoPreviewStyle}
                />
              )}

              <p style={resumoTextStyle}>
                <strong>Nome:</strong> {nomeNegocio || '-'}
              </p>

              <p style={resumoTextStyle}>
                <strong>Atendimento:</strong>{' '}
                {horaInicio && horaFim ? `${horaInicio} às ${horaFim}` : '-'}
              </p>

              <p style={resumoTextStyle}>
                <strong>Logo:</strong> {logoUrl ? 'Adicionada' : 'Não adicionada'}
              </p>
            </div>
          ) : (
            <div style={{ marginTop: '16px' }}>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Nome do negócio</label>
                  <input
                    style={inputStyle}
                    placeholder="Ex: Mariana Lash Designer"
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

              <div style={{ marginTop: '18px' }}>
                <label style={labelStyle}>Logo do negócio</label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={enviarLogo}
                  style={fileInputStyle}
                />

                {enviandoLogo && <p style={mutedStyle}>Enviando logo...</p>}

                {logoUrl && (
                  <div style={logoPreviewBoxStyle}>
                    <img
                      src={logoUrl}
                      alt="Logo do negócio"
                      style={logoPreviewStyle}
                    />
                    <p style={mutedStyle}>Logo carregada.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={resumoCardStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={{ margin: 0 }}>Resumo do cupom</h2>

            <button
              onClick={() => setEditandoCupom(!editandoCupom)}
              style={editButtonStyle}
            >
              Editar
            </button>
          </div>

          {!editandoCupom ? (
            <div style={{ marginTop: '16px' }}>
              <p style={resumoTextStyle}>
                <strong>Desconto:</strong> {descontoAniversario || '-'}%
              </p>

              <p style={resumoTextStyle}>
                <strong>Aviso:</strong> {diasAviso || '-'} dias antes
              </p>
            </div>
          ) : (
            <div style={{ marginTop: '16px' }}>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Desconto padrão (%)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    max="100"
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
                    value={diasAviso}
                    onChange={(e) => setDiasAviso(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {(editandoNegocio || editandoCupom) && (
        <button
          onClick={salvarConfiguracoes}
          disabled={salvando}
          style={buttonStyle}
        >
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      )}

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Plano e assinatura</h2>

        <div style={infoGridStyle}>
          <p>
            <strong>Plano:</strong> {assinatura?.plan || 'basic'}
          </p>

          <p>
            <strong>Status:</strong>{' '}
            {assinatura?.status === 'active' ? 'Ativo' : assinatura?.status || '-'}
          </p>

          <p>
            <strong>Vence em:</strong>{' '}
            {formatarData(assinatura?.current_period_end)}
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Conta</h2>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={sair} style={secondaryButtonStyle}>
            Sair da conta
          </button>

          <button onClick={excluirConta} style={dangerButtonStyle}>
            Excluir conta
          </button>
        </div>
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

const resumoGridStyle: React.CSSProperties = {
  marginTop: '24px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '14px',
}

const resumoCardStyle: React.CSSProperties = {
  background: '#151515',
  border: '1px solid #2a2a2a',
  borderRadius: '18px',
  padding: '18px',
}

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
}

const editButtonStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: '12px',
  border: '1px solid #333',
  background: '#27272a',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '14px',
  marginTop: '12px',
}

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: '8px',
  color: '#d4d4d4',
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

const fileInputStyle: React.CSSProperties = {
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

const logoPreviewBoxStyle: React.CSSProperties = {
  marginTop: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const logoPreviewStyle: React.CSSProperties = {
  width: '52px',
  height: '52px',
  objectFit: 'cover',
  borderRadius: '50%',
  border: '1px solid #333',
}

const resumoTextStyle: React.CSSProperties = {
  color: '#d4d4d4',
  margin: '8px 0',
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

const secondaryButtonStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #333',
  background: '#27272a',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}

const dangerButtonStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: '12px',
  border: 'none',
  background: '#dc2626',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}