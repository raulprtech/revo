import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const PRICE_ID_MONTHLY = process.env.STRIPE_PRO_PRICE_ID!;
const PRICE_ID_YEARLY = process.env.STRIPE_PRO_YEARLY_PRICE_ID || '';

export async function POST(request: Request) {
  try {
    // Validate authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { email: bodyEmail, returnUrl, interval = 'monthly' } = await request.json();
    const email = user?.email || bodyEmail;
    const priceId = interval === 'yearly' && PRICE_ID_YEARLY ? PRICE_ID_YEARLY : PRICE_ID_MONTHLY;

    if (!email) {
      return NextResponse.json({ error: 'Email requerido. Inicia sesión primero.' }, { status: 401 });
    }

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
    }

    // Create checkout session for Pro subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/dashboard/upgrade-success`,
      cancel_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/pricing?upgrade=canceled`,
      metadata: {
        user_email: email,
      },
      subscription_data: {
        metadata: {
          user_email: email,
        },
        trial_period_days: 14,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'No se pudo crear la sesión de pago' },
      { status: 500 }
    );
  }
}
