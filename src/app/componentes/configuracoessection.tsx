'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type PerfilNegocio = {
  id: string
  nome_negocio: string | null
  logo_url: string | null
}

type Assinatura = {
  plan: string | null
  status: string | null
  current_period_end: string | null
}

type ConfiguracoesSectionProps = {
  assinatura: Assinatura | null
}

export default function ConfigSection({
  assinatura,
}: ConfiguracoesSectionProps) {
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [perfil, setPerfil] = useState<PerfilNegocio | null>(null)
  const [editando, setEditando] = useState(false)
  const [nomeNegocio, setNomeNegocio] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [removendoFoto, setRemovendoFoto] = useState(false)

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
    setCarregando(true)

    const userId = await pegarUserId()

    if (!userId) {
      setPerfil(null)
      setCarregando(false)
      return
    }

    const { data, error } = await supabase
      .from('Configuracoes')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.log(error)
      alert('Não foi possível carregar as configurações.')
    }

    if (data) {
      setPerfil(data)
      setNomeNegocio(data.nome_negocio || '')
      setLogoUrl(data.logo_url || '')
    }

    setCarregando(false)
  }

  // Função para fazer o upload do arquivo de foto diretamente
  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const userId = await pegarUserId()
    if (!userId) return

    setEnviandoFoto(true)

    try {
      const ext = file.name.split('.').pop()
      const filePath = `${userId}/logo-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      if (publicUrlData?.publicUrl) {
        setLogoUrl(publicUrlData.publicUrl)
        setPerfil((prev) =>
          prev
            ? {
                ...prev,
                logo_url: publicUrlData.publicUrl,
              }
            : prev
        )

        const { error: updateError } = await supabase
          .from('Configuracoes')
          .update({
            logo_url: publicUrlData.publicUrl,
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error(updateError)
          alert(updateError.message)
          return
        }

        await carregarDados()
        alert('Foto enviada com sucesso!')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message ?? JSON.stringify(err))
    } finally {
      setEnviandoFoto(false)
    }
  }

  // Remove a foto de verdade: limpa o campo no banco, não só o estado local
  async function removerFoto() {
    const userId = await pegarUserId()
    if (!userId) return

    const confirmou = confirm('Remover a foto/logomarca do negócio?')
    if (!confirmou) return

    setRemovendoFoto(true)

    const { error } = await supabase
      .from('Configuracoes')
      .update({ logo_url: null })
      .eq('user_id', userId)

    if (error) {
      console.error(error)
      alert('Não foi possível remover a foto.')
      setRemovendoFoto(false)
      return
    }

    setLogoUrl('')
    setPerfil((prev) => (prev ? { ...prev, logo_url: null } : prev))
    setRemovendoFoto(false)
  }

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)

    const userId = await pegarUserId()

    if (!userId) {
      setSalvando(false)
      return
    }

    const { error } = await supabase
      .from('Configuracoes')
      .update({
        nome_negocio: nomeNegocio,
      })
      .eq('user_id', userId)

    if (error) {
      console.log(error)
      alert(error.message)
    } else {
      alert('Perfil atualizado com sucesso!')
      await carregarDados()
      setEditando(false)
    }

    setSalvando(false)
  }

async function cancelarAssinatura() {
  const userId = await pegarUserId()

  if (!userId) {
    alert('Você precisa estar logado para cancelar a assinatura.')
    return
  }

  const confirmou = confirm(
    'Deseja cancelar sua assinatura? Você continuará tendo acesso ao Painel Emprest até o fim do período atual.'
  )

  if (!confirmou) return

  const { data: assinaturaAtual, error: buscaError } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .single()

  if (buscaError) {
    console.error(buscaError)
    alert('Não foi possível verificar sua assinatura.')
    return
  }

  if (assinaturaAtual?.cancel_at_period_end) {
    alert('Sua assinatura já está marcada para cancelamento.')
    return
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
    })
    .eq('user_id', userId)

  if (error) {
    console.error(error)
    alert('Não foi possível cancelar sua assinatura.')
    return
  }

  const dataFim =
    assinaturaAtual?.current_period_end ||
    assinaturaAtual?.trial_ends_at

  if (dataFim) {
    const dataFormatada = new Date(dataFim).toLocaleDateString('pt-BR')

    alert(
      `Assinatura cancelada com sucesso.\n\nVocê continuará tendo acesso até ${dataFormatada}.`
    )
  } else {
    alert(
      'Assinatura cancelada com sucesso. O acesso continuará disponível até o fim do período atual.'
    )
  }
}

  function excluirConta() {
    alert(
      'A exclusão de conta ainda não está disponível por aqui. Entre em contato pelo suporte para solicitar a exclusão por enquanto.'
    )
  }

  function formatarData(dataIso: string | null) {
    if (!dataIso) return '—'

    return new Date(dataIso).toLocaleDateString('pt-BR')
  }

  function formatarPlano(plano: string | null) {
    if (!plano) return 'Gratuito'
    return plano.charAt(0).toUpperCase() + plano.slice(1)
  }

function formatarStatus(status: string | null) {
  const st = status?.trim().toLowerCase()

  if (st === 'trialing') return 'Teste grátis'
  if (st === 'ativo' || st === 'active') return 'Ativo'
  if (st === 'trial') return 'Teste grátis'
  if (st === 'pendente' || st === 'past_due') return 'Pendente'
  if (st === 'cancelado' || st === 'canceled') return 'Cancelado'

  return 'Inativo'
}
function corStatus(status: string | null) {
  const st = status?.trim().toLowerCase()

  if (
    st === 'ativo' ||
    st === 'active' ||
    st === 'trial' ||
    st === 'trialing'
  ) {
    return '#22c55e'
  }

  if (st === 'pendente' || st === 'past_due') {
    return '#eab308'
  }

  return '#ef4444'
}

  // Inicial para o avatar placeholder caso não tenha foto
  const inicialEmpresa = nomeNegocio
    ? nomeNegocio.charAt(0).toUpperCase()
    : 'E'

  const statusAtual = assinatura?.status ?? null
  const statusNormalizado = statusAtual?.trim().toLowerCase()
const contaAtiva =
  statusNormalizado === 'ativo' ||
  statusNormalizado === 'active' ||
  statusNormalizado === 'trialing' ||
  statusNormalizado === 'trial'

  return (
    <div style={pageContainerStyle} className="lash-page-container">
      {/* Regras de responsividade para mobile */}
      <style>{`
        @media (max-width: 640px) {
          .lash-config-header {
            flex-direction: column;
            align-items: stretch !important;
          }

          .lash-config-header button {
            width: 100%;
          }

          .lash-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .lash-card {
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .lash-form-header {
            flex-direction: column;
            align-items: stretch !important;
          }

          .lash-form-header button {
            width: 100%;
          }

          .lash-business-info {
            flex-direction: column;
            align-items: center !important;
            text-align: center;
          }

          .lash-business-info h2 {
            font-size: 22px !important;
          }

          .lash-photo-section {
            flex-direction: column;
            align-items: center !important;
            text-align: center;
          }

          .lash-photo-actions {
            align-items: center !important;
          }

          .lash-photo-actions > div {
            justify-content: center !important;
          }

          .lash-form-actions {
            flex-direction: column-reverse;
          }

          .lash-form-actions button {
            width: 100%;
          }

          .lash-danger-actions button,
          .lash-subscription-actions button {
            width: 100%;
          }

          .lash-input {
            font-size: 16px !important;
          }
        }

      `}</style>

      {/* Cabeçalho da Página */}
      <div style={pageHeaderStyle} className="lash-config-header">
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>
            Configurações
          </h1>
          <p style={subtitleStyle}>
            Gerencie as informações da sua empresa e detalhes da sua assinatura.
          </p>
        </div>

        <button
          type="button"
          style={refreshButtonStyle}
          onClick={carregarDados}
          disabled={carregando}
        >
          {carregando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Cards de Resumo da Assinatura */}
      <div style={summaryGridStyle} className="lash-summary-grid">
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Plano Atual</span>

          <strong style={summaryValueStyle} className="lash-summary-value">
            {formatarPlano(assinatura?.plan ?? null)}
          </strong>
          <span style={summaryDetailStyle}>
            {contaAtiva ? 'Assinatura ativa' : 'Verifique a assinatura'}
          </span>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Status da Conta</span>
          <strong
            style={{
              ...summaryValueStyle,
              color: corStatus(statusAtual),
            }}
            className="lash-summary-value"
          >
            {formatarStatus(statusAtual)}
          </strong>
          <span style={summaryDetailStyle}>
            {contaAtiva ? 'Acesso total liberado' : 'Verifique a assinatura'}
          </span>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Renovação</span>

          <strong style={summaryValueStyle} className="lash-summary-value">
            {formatarData(assinatura?.current_period_end ?? null)}
          </strong>

          <span style={summaryDetailStyle}>Cobrança automática</span>
        </div>
      </div>

      {/* Formulário do Perfil */}
      <div style={formCardStyle} className="lash-card">
        <div style={formHeaderStyle} className="lash-form-header">
          <div>
            <h2 style={{ margin: 0 }}>Dados do Negócio</h2>
          </div>

          {!editando && (
            <button
              type="button"
              style={editIconButtonStyle}
              onClick={() => setEditando(true)}
              aria-label="Editar dados do negócio"
              title="Editar"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 20H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {carregando ? (
          <div style={emptyStateStyle}>Carregando perfil...</div>
        ) : !editando ? (
          <div style={businessInfoStyle} className="lash-business-info">
            <div style={avatarContainerStyle}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={avatarImageStyle} />
              ) : (
                <div style={avatarPlaceholderStyle}>{inicialEmpresa}</div>
              )}
            </div>

            <div>
              <span style={labelStyle}>Nome do negócio</span>

              <h2
                style={{
                  margin: '6px 0 0',
                  fontSize: '30px',
                  color: '#fff',
                }}
              >
                {nomeNegocio || 'Empresa'}
              </h2>
            </div>
          </div>
        ) : (
          <form onSubmit={salvarPerfil} style={formStyle}>
            {/* Bloco de Exibição e Alteração da Foto */}
            <div style={photoSectionStyle} className="lash-photo-section">
              <div style={avatarContainerStyle}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo do negócio"
                    style={avatarImageStyle}
                  />
                ) : (
                  <div style={avatarPlaceholderStyle}>{inicialEmpresa}</div>
                )}
              </div>

              <div style={photoActionsStyle} className="lash-photo-actions">
                <span style={labelStyle}>Foto / Logomarca</span>
                <p style={{ ...subtitleStyle, fontSize: '13px', margin: 0 }}>
                  Formatos aceitos: JPG, PNG ou WEBP.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleUploadFoto}
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={enviandoFoto}
                  >
                    {enviandoFoto ? 'Enviando foto...' : 'Alterar foto'}
                  </button>

                  {logoUrl && (
                    <button
                      type="button"
                      style={removeButtonStyle}
                      onClick={removerFoto}
                      disabled={removendoFoto}
                    >
                      {removendoFoto ? 'Removendo...' : 'Remover foto'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle} htmlFor="nomeNegocio">
                Nome do Negócio / Empresa
              </label>
              <input
                id="nomeNegocio"
                type="text"
                placeholder="Ex: Barber Shop MFI"
                value={nomeNegocio}
                onChange={(e) => setNomeNegocio(e.target.value)}
                style={inputStyle}
                className="lash-input"
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '10px',
              }}
              className="lash-form-actions"
            >
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setEditando(false)
                  carregarDados()
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                style={primaryButtonStyle}
                disabled={salvando || enviandoFoto}
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div style={formCardStyle} className="lash-card">
        <h2 style={{ marginTop: 0 }}>Assinatura</h2>

        <p style={subtitleStyle}>
          Gerencie sua assinatura e as cobranças do seu plano.
        </p>

        <div
          style={{
            display: 'flex',
            marginTop: '20px',
          }}
          className="lash-subscription-actions"
        >
          <button style={removeButtonStyle} onClick={cancelarAssinatura}>
            Cancelar assinatura
          </button>
        </div>
      </div>

      <div
        style={{
          ...formCardStyle,
          border: '1px solid rgba(239,68,68,.25)',
        }}
        className="lash-card"
      >
        <h2
          style={{
            marginTop: 0,
            color: '#F87171',
          }}
        >
          Zona de Perigo
        </h2>

        <p style={subtitleStyle}>
          Excluir sua conta removerá permanentemente todos os seus dados.
          Esta ação não poderá ser desfeita.
        </p>

        <div className="lash-danger-actions" style={{ display: 'flex' }}>
          <button
            style={{
              ...removeButtonStyle,
              marginTop: '10px',
            }}
            onClick={excluirConta}
          >
            Excluir conta
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   ESTILOS (Alinhados com o padrão visual da aplicação)
   ========================================================================== */

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

const refreshButtonStyle: React.CSSProperties = {
  padding: '11px 16px',
  borderRadius: '12px',
  border: '1px solid #2563EB',
  background: '#2563EB',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 700,
}

const summaryGridStyle: React.CSSProperties = {
  marginTop: '20px',
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '12px',
}

const summaryCardStyle: React.CSSProperties = {
  minHeight: '96px',
  padding: '15px 12px',
  borderRadius: '16px',
  border: '1px solid #1F3A5F',
  background:
    'linear-gradient(180deg,#11223D 0%, #0D1B2E 100%)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '5px',
  overflow: 'hidden',
}

const summaryLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#94A3B8',
  fontSize: '12px',
  whiteSpace: 'nowrap',
}

const summaryValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#F8FAFC',
  lineHeight: 1.25,
}

const summaryDetailStyle: React.CSSProperties = {
  color: '#CBD5E1',
  fontSize: '12px',
  fontWeight: 700,
}

const formCardStyle: React.CSSProperties = {
  position: 'relative',
  marginTop: '24px',
  padding: '22px',
  borderRadius: '20px',
  border: '1px solid #1F3A5F',
  background: '#0D1B2E',
}

const formHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '20px',
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
}

const photoSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  paddingBottom: '16px',
  borderBottom: '1px solid #1F3A5F',
  flexWrap: 'wrap',
}

const avatarContainerStyle: React.CSSProperties = {
  width: '96px',
  height: '96px',
  borderRadius: '50%',
  overflow: 'hidden',
  border: '2px solid #28538B',
  background: '#132641',
  flexShrink: 0,
}

const avatarImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const avatarPlaceholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '36px',
  fontWeight: 'bold',
  color: '#60A5FA',
  background: '#0D1B2E',
}

const photoActionsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
}

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const labelStyle: React.CSSProperties = {
  color: '#F8FAFC',
  fontSize: '14px',
  fontWeight: 600,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid #1F3A5F',
  background: '#132641',
  color: '#F8FAFC',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const emptyStateStyle: React.CSSProperties = {
  minHeight: '140px',
  borderRadius: '16px',
  border: '1px dashed #28538B',
  color: '#94A3B8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '20px',
}

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: '10px',
  background: '#2563EB',
  color: '#FFFFFF',
  padding: '12px 20px',
  fontWeight: 700,
  cursor: 'pointer',
}

const editIconButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  width: '34px',
  height: '34px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #1F3A5F',
  borderRadius: '9px',
  background: '#132641',
  color: '#94A3B8',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
}

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #1F3A5F',
  borderRadius: '8px',
  background: '#132641',
  color: '#F8FAFC',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const removeButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(239,68,68,.35)',
  borderRadius: '8px',
  background: 'rgba(239,68,68,.12)',
  color: '#FCA5A5',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const businessInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  padding: '10px 0',
}