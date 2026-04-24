import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
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
      console.error('ERRO WEBHOOK SIGNATURE:', error)
      return NextResponse.json({ error: 'Webhook inválido.' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const userId = session.metadata?.user_id || session.client_reference_id
      const customerId = typeof session.customer === 'string' ? session.customer : null
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : null

      if (!userId || !subscriptionId) {
        return NextResponse.json(
          { error: 'Dados incompletos no webhook.' },
          { status: 400 }
        )
      }

      const subscription: any = await stripe.subscriptions.retrieve(subscriptionId)

      const periodEnd =
        subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null

      const payload = {
        user_id: userId,
        status: subscription.status || 'active',
        plan: 'basic',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        current_period_end: periodEnd,
      }

      const { data: existingSubscription, error: selectError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (selectError) {
        console.error('ERRO SELECT SUPABASE:', selectError)
        return NextResponse.json({ error: selectError.message }, { status: 500 })
      }

      if (existingSubscription?.id) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update(payload)
          .eq('id', existingSubscription.id)

        if (updateError) {
          console.error('ERRO UPDATE SUPABASE:', updateError)
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
      } else {
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert(payload)

        if (insertError) {
          console.error('ERRO INSERT SUPABASE:', insertError)
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('ERRO GERAL WEBHOOK:', error)
    return NextResponse.json(
      { error: 'Erro interno no webhook.' },
      { status: 500 }
    )
  }
}