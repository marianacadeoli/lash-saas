import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente.' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('ERRO WEBHOOK:', error)
    return NextResponse.json({ error: 'Webhook inválido.' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : null

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ausente.' },
        { status: 400 }
      )
    }

    const subscription: any = await stripe.subscriptions.retrieve(subscriptionId)

    const userId =
      session.metadata?.user_id ||
      session.client_reference_id ||
      subscription.metadata?.user_id

    const customerId =
      typeof session.customer === 'string' ? session.customer : null

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id ausente.' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      status: subscription.status,
      plan: 'basic',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })

    if (error) {
      console.error('ERRO SUPABASE:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar assinatura.' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}