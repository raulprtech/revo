import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

/**
 * Creates a Stripe Checkout session for a one-time Legacy Plus purchase ($299 MXN).
 * Makes a specific tournament permanently Plus.
 */
export async function POST(request: Request) {
  try {
    // Validate authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { tournamentId, tournamentName, returnUrl } = await request.json();
    const email = user?.email;

    if (!email) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para comprar.' },
        { status: 401 }
      );
    }

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'tournamentId es requerido.' },
        { status: 400 }
      );
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

    // Create one-time payment session for Legacy Plus
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Pago por Evento – Legacy Plus',
              description: `Torneo Plus permanente: "${tournamentName || 'Sin nombre'}"`,
            },
            unit_amount: 29900, // $299 MXN
          },
          quantity: 1,
        },
      ],
      success_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournamentId}?legacy=success`,
      cancel_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournamentId}?legacy=canceled`,
      metadata: {
        type: 'legacy_pro',
        tournament_id: tournamentId,
        user_email: email,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating legacy pro checkout:', error);
    return NextResponse.json(
      { error: 'No se pudo crear la sesión de pago.' },
      { status: 500 }
    );
  }
}
