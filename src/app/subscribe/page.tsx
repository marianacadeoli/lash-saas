'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function SubscribePage() {
  const router = useRouter()
  const supabase = createClient()

  const [carregandoPagina, setCarregandoPagina] = useState(true)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function verificarAssinatura() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      const { data: assinatura } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (
        assinatura?.status === 'active' ||
        assinatura?.status === 'trialing'
      ) {
        router.replace('/dashboard')
        return
      }

      setCarregandoPagina(false)
    }

    verificarAssinatura()
  }, [router, supabase])

  async function handleCheckout() {
    try {
      setCarregando(true)
      setErro('')

      const res = await fetch('/api/checkout', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || 'Erro ao iniciar checkout.')
        return
      }

      window.location.href = data.url
    } catch {
      setErro('Erro ao iniciar checkout.')
    } finally {
      setCarregando(false)
    }
  }

  if (carregandoPagina) {
    return (
      <main className={styles.subscribePage}>
        <div className={styles.loading}>
          Carregando...
        </div>
      </main>
    )
  }

  return (
    <main className={styles.subscribePage}>

      <div className={styles.subscribeCard}>

        {/* LOGO */}

        <img
          src="/logo.png"
          alt="PainelEmprest"
          className={styles.subscribeLogo}
        />

        {/* BADGE */}

        <div className={styles.subscribeBadgeWrapper}>
          <span className={styles.subscribeBadge}>
            3 DIAS GRÁTIS
          </span>
        </div>

        {/* TÍTULO */}

        <h1 className={styles.subscribeTitle}>
          Gerencie seus empréstimos
          <br />
          de forma simples
        </h1>

        {/* SUBTÍTULO */}

        <p className={styles.subscribeSubtitle}>
          Controle clientes, empréstimos, parcelas e recebimentos em um só lugar.
        </p>

        {/* PLANO */}

        <div className={styles.planCard}>

          <div className={styles.planHeader}>

            <div>
              <div className={styles.planLabel}>
                PLANO
              </div>

              <h2 className={styles.planName}>
                Basic
              </h2>
            </div>

            <div className={styles.planPrice}>

              <strong className={styles.price}>
                R$ 49,90
              </strong>

              <span className={styles.pricePeriod}>
                /mês
              </span>

            </div>

          </div>

          <div className={styles.divider} />

          {/* BENEFÍCIOS */}

          <div className={styles.benefits}>

            <div className={styles.benefit}>
              <span className={styles.check}>✓</span>
              Cadastro de clientes
            </div>

            <div className={styles.benefit}>
              <span className={styles.check}>✓</span>
              Controle de empréstimos
            </div>

            <div className={styles.benefit}>
              <span className={styles.check}>✓</span>
              Acompanhamento de parcelas
            </div>

            <div className={styles.benefit}>
              <span className={styles.check}>✓</span>
              Registro de recebimentos
            </div>

            <div className={styles.benefit}>
              <span className={styles.check}>✓</span>
              Visão geral financeira
            </div>

          </div>

        </div>

        {/* TESTE GRÁTIS */}

        <div className={styles.trialBox}>

          <div className={styles.trialTitle}>
            Seu teste começa agora
          </div>

          <div className={styles.trialText}>
            Use o PainelEmprest gratuitamente por 3 dias.
            A cobrança de R$ 49,90/mês acontece somente após
            o período de teste.
          </div>

        </div>

        {/* ERRO */}

        {erro && (
          <div className={styles.errorBox}>
            {erro}
          </div>
        )}

        {/* BOTÃO */}

        <button
          onClick={handleCheckout}
          disabled={carregando}
          className={styles.subscribeButton}
        >
          {carregando
            ? 'Redirecionando...'
            : 'Começar teste grátis'}
        </button>

        {/* RODAPÉ */}

        <p className={styles.subscribeFooter}>
          Você poderá cancelar quando quiser.
        </p>

      </div>

    </main>
  )
}