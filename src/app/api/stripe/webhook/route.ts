import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // ============================================================
    // VARIÁVEIS DE AMBIENTE
    // ============================================================

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!stripeSecretKey) {
      console.error('ERRO: STRIPE_SECRET_KEY não configurada.')

      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY não configurada.' },
        { status: 500 }
      )
    }

    if (!stripeWebhookSecret) {
      console.error('ERRO: STRIPE_WEBHOOK_SECRET não configurada.')

      return NextResponse.json(
        { error: 'STRIPE_WEBHOOK_SECRET não configurada.' },
        { status: 500 }
      )
    }

    if (!supabaseUrl) {
      console.error('ERRO: NEXT_PUBLIC_SUPABASE_URL não configurada.')

      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL não configurada.' },
        { status: 500 }
      )
    }

    if (!supabaseServiceKey) {
      console.error('ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada.')

      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' },
        { status: 500 }
      )
    }

    // ============================================================
    // CLIENTES
    // ============================================================

    const stripe = new Stripe(stripeSecretKey)

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    // ============================================================
    // LER WEBHOOK
    // ============================================================

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error('ERRO: Stripe-Signature ausente.')

      return NextResponse.json(
        { error: 'Assinatura ausente.' },
        { status: 400 }
      )
    }

    // ============================================================
    // VALIDAR ASSINATURA
    // ============================================================

console.log('DEBUG WEBHOOK:', {
  hasSecret: !!stripeWebhookSecret,
  secretLength: stripeWebhookSecret?.length,
  secretPrefix: stripeWebhookSecret?.slice(0, 6),
  hasSignature: !!signature,
  signatureLength: signature?.length,
})

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      )
    } catch (error) {
      console.error(
        'ERRO WEBHOOK SIGNATURE:',
        error instanceof Error
          ? error.message
          : error
      )

      return NextResponse.json(
        { error: 'Webhook inválido.' },
        { status: 400 }
      )
    }

    console.log(
      'WEBHOOK RECEBIDO:',
      event.type,
      event.id
    )

    // ============================================================
    // CHECKOUT CONCLUÍDO
    // ============================================================

    if (event.type === 'checkout.session.completed') {
      const session =
        event.data.object as Stripe.Checkout.Session

      const userId =
        session.metadata?.user_id ||
        session.client_reference_id ||
        null

      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : null

      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : null

      console.log(
        'CHECKOUT:',
        {
          sessionId: session.id,
          userId,
          customerId,
          subscriptionId,
          mode: session.mode,
          status: session.status,
        }
      )

      // ------------------------------------------------------------
      // TESTE DA STRIPE CLI
      //
      // O evento checkout.session.completed gerado pelo
      // stripe trigger pode não possuir uma assinatura real.
      //
      // Nesse caso, não tentamos buscar a assinatura.
      // ------------------------------------------------------------

      if (!subscriptionId) {
        console.log(
          'CHECKOUT SEM ASSINATURA: evento recebido corretamente.'
        )

        return NextResponse.json({
          received: true,
          message:
            'Checkout recebido sem assinatura associada.',
        })
      }

      // ------------------------------------------------------------
      // USER ID
      // ------------------------------------------------------------

      if (!userId) {
        console.error(
          'CHECKOUT SEM USER ID:',
          session.id
        )

        return NextResponse.json(
          {
            error:
              'Checkout recebido sem user_id.',
          },
          { status: 400 }
        )
      }

      // ------------------------------------------------------------
      // BUSCAR ASSINATURA NO STRIPE
      // ------------------------------------------------------------

      console.log(
        'BUSCANDO ASSINATURA:',
        subscriptionId
      )

      const subscription =
        await stripe.subscriptions.retrieve(
          subscriptionId,
          {
            expand: ['items.data.price'],
          }
        )

      console.log(
        'ASSINATURA ENCONTRADA:',
        subscription.id
      )

      // ------------------------------------------------------------
      // SALVAR NO SUPABASE
      // ------------------------------------------------------------

      await salvarAssinatura(
        supabase,
        subscription,
        userId,
        customerId
      )
    }

    // ============================================================
    // ASSINATURA CRIADA OU ATUALIZADA
    // ============================================================

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription =
        event.data.object as Stripe.Subscription

      const userId =
        subscription.metadata?.user_id

      console.log(
        'ASSINATURA EVENTO:',
        {
          type: event.type,
          subscriptionId: subscription.id,
          userId,
        }
      )

      if (!userId) {
        console.log(
          'ASSINATURA SEM USER ID. Evento ignorado.'
        )

        return NextResponse.json({
          received: true,
        })
      }

      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : null

      await salvarAssinatura(
        supabase,
        subscription,
        userId,
        customerId
      )
    }

    // ============================================================
    // ASSINATURA CANCELADA
    // ============================================================

    if (
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription =
        event.data.object as Stripe.Subscription

      const userId =
        subscription.metadata?.user_id

      console.log(
        'ASSINATURA CANCELADA:',
        {
          subscriptionId: subscription.id,
          userId,
        }
      )

      if (userId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
          })
          .eq('user_id', userId)

        if (error) {
          console.error(
            'ERRO AO ATUALIZAR CANCELAMENTO:',
            error
          )

          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          )
        }

        console.log(
          'CANCELAMENTO SALVO:',
          userId
        )
      }
    }

    // ============================================================
    // FINAL
    // ============================================================

    console.log(
      'WEBHOOK PROCESSADO COM SUCESSO:',
      event.type
    )

    return NextResponse.json({
      received: true,
    })
  } catch (error) {
    console.error(
      'ERRO GERAL WEBHOOK:',
      error instanceof Error
        ? error.message
        : error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno no webhook.',
      },
      { status: 500 }
    )
  }
}

// ================================================================
// SALVAR ASSINATURA
// ================================================================

async function salvarAssinatura(
  supabase: any,
  subscription: Stripe.Subscription,
  userId: string,
  customerId: string | null
) {
  try {
    // ============================================================
    // DATAS
    // ============================================================

    const trialEndsAt = subscription.trial_end
      ? new Date(
          subscription.trial_end * 1000
        ).toISOString()
      : null

    const periodEndTimestamp =
      subscription.items?.data?.[0]
        ?.current_period_end || null

    const currentPeriodEnd =
      periodEndTimestamp
        ? new Date(
            periodEndTimestamp * 1000
          ).toISOString()
        : null

    // ============================================================
    // DADOS DA ASSINATURA
    // ============================================================

    const payload = {
      user_id: userId,

      status:
        subscription.status || 'active',

      plan: 'basic',

      trial_ends_at:
        trialEndsAt,

      current_period_end:
        currentPeriodEnd,

      stripe_customer_id:
        customerId,

      stripe_subscription_id:
        subscription.id,
    }

    console.log(
      'SALVANDO ASSINATURA:',
      payload
    )

    // ============================================================
    // VERIFICAR SE JÁ EXISTE
    // ============================================================

    const {
      data: existingSubscription,
      error: selectError,
    } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (selectError) {
      console.error(
        'ERRO SELECT SUPABASE:',
        selectError
      )

      throw new Error(
        `Erro ao consultar assinatura: ${selectError.message}`
      )
    }

    // ============================================================
    // ATUALIZAR
    // ============================================================

    if (existingSubscription?.id) {
      console.log(
        'ATUALIZANDO ASSINATURA:',
        existingSubscription.id
      )

      const { error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq(
          'id',
          existingSubscription.id
        )

      if (error) {
        console.error(
          'ERRO UPDATE SUPABASE:',
          error
        )

        throw new Error(
          `Erro ao atualizar assinatura: ${error.message}`
        )
      }

      console.log(
        'ASSINATURA ATUALIZADA:',
        userId
      )

      return
    }

    // ============================================================
    // CRIAR
    // ============================================================

    console.log(
      'CRIANDO NOVA ASSINATURA'
    )

    const { error } = await supabase
      .from('subscriptions')
      .insert(payload)

    if (error) {
      console.error(
        'ERRO INSERT SUPABASE:',
        error
      )

      throw new Error(
        `Erro ao criar assinatura: ${error.message}`
      )
    }

    console.log(
      'ASSINATURA CRIADA:',
      userId
    )
  } catch (error) {
    console.error(
      'ERRO SALVAR ASSINATURA:',
      error instanceof Error
        ? error.message
        : error
    )

    throw error
  }
}