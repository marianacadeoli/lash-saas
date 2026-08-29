import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY não configurada.' },
        { status: 500 }
      )
    }

    if (!stripeWebhookSecret) {
      return NextResponse.json(
        { error: 'STRIPE_WEBHOOK_SECRET não configurada.' },
        { status: 500 }
      )
    }

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL não configurada.' },
        { status: 500 }
      )
    }

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeSecretKey)
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Assinatura ausente.' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      )
    } catch (error) {
      console.error('ERRO WEBHOOK SIGNATURE:', error)

      return NextResponse.json(
        { error: 'Webhook inválido.' },
        { status: 400 }
      )
    }

    // ============================================================
    // CHECKOUT CONCLUÍDO
    // ============================================================

    if (event.type === 'checkout.session.completed') {
      const session =
        event.data.object as Stripe.Checkout.Session

      const userId =
        session.metadata?.user_id ||
        session.client_reference_id

      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : null

      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : null

      if (!userId || !subscriptionId) {
        return NextResponse.json(
          { error: 'Dados incompletos no webhook.' },
          { status: 400 }
        )
      }

      const subscription: any =
        await stripe.subscriptions.retrieve(
          subscriptionId,
          {
            expand: ['items.data.price'],
          }
        )

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
        event.data.object as any

      const userId =
        subscription.metadata?.user_id

      if (userId) {
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
    }

    // ============================================================
    // ASSINATURA CANCELADA
    // ============================================================

    if (event.type === 'customer.subscription.deleted') {
      const subscription =
        event.data.object as any

      const userId =
        subscription.metadata?.user_id

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
      }
    }

    return NextResponse.json({
      received: true,
    })
  } catch (error) {
    console.error('ERRO GERAL WEBHOOK:', error)

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
  subscription: any,
  userId: string,
  customerId: string | null
) {
  const trialEndsAt = subscription.trial_end
    ? new Date(
        subscription.trial_end * 1000
      ).toISOString()
    : null

  const periodEndTimestamp =
    subscription.items?.data?.[0]?.current_period_end ||
    null

  const currentPeriodEnd =
    periodEndTimestamp
      ? new Date(
          periodEndTimestamp * 1000
        ).toISOString()
      : null

  const payload = {
    user_id: userId,

    status: subscription.status || 'active',

    plan: 'basic',

    trial_ends_at: trialEndsAt,

    current_period_end: currentPeriodEnd,

    stripe_customer_id: customerId,

    stripe_subscription_id: subscription.id,
  }

  console.log(
    'SALVANDO ASSINATURA:',
    payload
  )

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

    return
  }

  if (existingSubscription?.id) {
    const { error } = await supabase
      .from('subscriptions')
      .update(payload)
      .eq('id', existingSubscription.id)

    if (error) {
      console.error(
        'ERRO UPDATE SUPABASE:',
        error
      )

      return
    }

    console.log(
      'ASSINATURA ATUALIZADA:',
      userId
    )
  } else {
    const { error } = await supabase
      .from('subscriptions')
      .insert(payload)

    if (error) {
      console.error(
        'ERRO INSERT SUPABASE:',
        error
      )

      return
    }

    console.log(
      'ASSINATURA CRIADA:',
      userId
    )
  }
}