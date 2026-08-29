import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripePriceId = process.env.STRIPE_PRICE_ID

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY não configurada.' },
        { status: 500 }
      )
    }

    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'STRIPE_PRICE_ID não configurada.' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeSecretKey)

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // Não é necessário fazer nada aqui.
            }
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado.' },
        { status: 401 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',

      customer_email: user.email,

      client_reference_id: user.id,

      metadata: {
        user_id: user.id,
      },

      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],

      subscription_data: {
        trial_period_days: 3,

        metadata: {
          user_id: user.id,
        },
      },

      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error('ERRO CHECKOUT:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao criar checkout.',
      },
      { status: 500 }
    )
  }
}