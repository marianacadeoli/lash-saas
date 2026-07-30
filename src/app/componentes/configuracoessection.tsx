'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type PerfilNegocio = {
  id: string
  nome_negocio: string | null
  logo_url: string | null
  plano: string | null
  status_assinatura: string | null
  renovacao: string | null
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
        const { data } = await supabase
          .from('Configuracoes')
          .select('logo_url')
          .eq('user_id', userId)
          .single()

        console.log('Logo salva:', data)
        alert('Foto enviada com sucesso!')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message ?? JSON.stringify(err))
    } finally {
      setEnviandoFoto(false)
    }
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
    if (st === 'ativo' || st === 'active') return 'Ativo'
    if (st === 'pendente') return 'Pendente'
    if (st === 'cancelado') return 'Cancelado'
    return 'Inativo'
  }

  function corStatus(status: string | null) {
    const st = status?.trim().toLowerCase()
    if (st === 'ativo' || st === 'active') return '#22c55e'
    if (st === 'pendente') return '#eab308'
    return '#ef4444'
  }

  function fundoStatus(status: string | null) {
    const st = status?.trim().toLowerCase()
    if (st === 'ativo' || st === 'active') return 'rgba(34,197,94,0.12)'
    if (st === 'pendente') return 'rgba(234,179,8,0.12)'
    return 'rgba(239,68,68,0.12)'
  }

  // Inicial para o avatar placeholder caso não tenha foto
  const inicialEmpresa = nomeNegocio
    ? nomeNegocio.charAt(0).toUpperCase()
    : 'E'

  return (
    <div style={pageContainerStyle}>
      {/* Cabeçalho da Página */}
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>Configurações</h1>
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
      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
   <span style={summaryLabelStyle}>Plano Atual</span>

<strong style={summaryValueStyle}>
  {formatarPlano(assinatura?.plan ?? null)}
</strong>
          <span style={summaryDetailStyle}>Assinatura Ativa</span>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Status da Conta</span>
          <strong
            style={{
              ...summaryValueStyle,
              color: corStatus(perfil?.status_assinatura ?? null),
            }}
          >
        {formatarStatus(perfil?.status_assinatura ?? null)}
          </strong>
          <span style={summaryDetailStyle}>
            {perfil?.status_assinatura === 'ativo'
              ? 'Acesso total liberado'
              : 'Verifique a assinatura'}
          </span>
        </div>

        <div style={summaryCardStyle}>
      <span style={summaryLabelStyle}>Próxima Renovação</span>

<strong style={summaryValueStyle}>
  {formatarData(assinatura?.current_period_end ?? null)}
</strong>

<span style={summaryDetailStyle}>
  Cobrança automática
</span>
        </div>
      </div>




      {/* Formulário do Perfil */}
      <div style={formCardStyle}>
        <div style={formHeaderStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Dados do Negócio</h2>
            <p style={{ ...subtitleStyle, marginBottom: 0 }}>
        
            </p>
          </div>

          {!editando && (
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => setEditando(true)}
            >
              Editar
            </button>
          )}
        </div>

        {carregando ? (
          <div style={emptyStateStyle}>Carregando perfil...</div>
        ) : !editando ? (
          <div style={businessInfoStyle}>
            <div style={avatarContainerStyle}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={avatarImageStyle}
                />
              ) : (
                <div style={avatarPlaceholderStyle}>
                  {inicialEmpresa}
                </div>
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
            <div style={photoSectionStyle}>
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

              <div style={photoActionsStyle}>
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

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
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
                      onClick={() => setLogoUrl('')}
                    >
                      Remover foto
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
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '10px',
              }}
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
<div style={formCardStyle}>
  <h2 style={{ marginTop: 0 }}>Assinatura</h2>

  <p style={subtitleStyle}>
    Gerencie sua assinatura e as cobranças do seu plano.
  </p>

  <div
    style={{
      display: 'flex',
      gap: '12px',
      marginTop: '20px',
      flexWrap: 'wrap',
    }}
  >
    <button style={secondaryButtonStyle}>
      Gerenciar assinatura
    </button>

    <button style={removeButtonStyle}>
      Cancelar assinatura
    </button>
  </div>
</div>

<div
  style={{
    ...formCardStyle,
    border: '1px solid rgba(239,68,68,.25)',
  }}
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

  <button
    style={{
      ...removeButtonStyle,
      marginTop: '10px',
    }}
  >
    Excluir conta
  </button>
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
 color: '#CBD5E1',
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
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: '16px',
  marginTop: '24px',
}

const summaryCardStyle: React.CSSProperties = {
 minHeight: '125px',
  padding: '20px',
  borderRadius: '18px',
  border: '1px solid #1F3A5F',
  background: '#0D1B2E',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '7px',
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
  fontSize: '14px',
  fontWeight: 700,
}

const formCardStyle: React.CSSProperties = {
 marginTop: '24px',
  padding: '22px',
  borderRadius: '20px',
  border: '1px solid #1F3A5F',
  background: '#0D1B2E',
}

const formHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
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

const listCardStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '22px',
  borderRadius: '20px',
  border: '1px solid #2a2a2a',
  background: '#101010',
}

const listHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '18px',
}

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '14px',
}

const infoBoxStyle: React.CSSProperties = {
  padding: '14px',
  borderRadius: '13px',
  background: '#151515',
  border: '1px solid #292929',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const infoLabelStyle: React.CSSProperties = {
  color: '#8f8f97',
  fontSize: '12px',
}

const infoValueStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  wordBreak: 'break-all',
}

const statusBadgeStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '12px',
  fontWeight: 800,
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

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #28538B',
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