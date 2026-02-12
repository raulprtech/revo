import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Creates a Stripe Checkout session for a tournament entry fee.
 * The organizer must have a Plus plan to use this feature.
 */
export async function POST(request: Request) {
  try {
    const { 
      tournamentId, 
      tournamentName,
      participantEmail, 
      amount, 
      currency = 'USD',
      returnUrl 
    } = await request.json();

    if (!tournamentId || !participantEmail || !amount) {
      return NextResponse.json(
        { error: 'tournamentId, participantEmail and amount are required' },
        { status: 400 }
      );
    }

    // Validate that the tournament owner has a Plus plan or the tournament is legacy pro
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('owner_email, is_legacy_pro')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneo no encontrado' },
        { status: 404 }
      );
    }

    if (!tournament.is_legacy_pro) {
      // Check if owner has an active Plus subscription
      const { data: ownerSub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_email', tournament.owner_email)
        .in('status', ['active', 'trialing'])
        .single();

      if (!ownerSub || ownerSub.plan !== 'plus') {
        return NextResponse.json(
          { error: 'El organizador necesita el plan Plus para cobrar entry fees.' },
          { status: 403 }
        );
      }
    }

    // Apply participant tickets discount if any
    let finalAmount = amount;
    const { data: participantSub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_email', participantEmail)
      .in('status', ['active', 'trialing'])
      .maybeSingle();
    
    if (participantSub) {
      const { data: planDetails } = await supabase
        .from('subscription_plans')
        .select('metadata')
        .or(`id.eq.${participantSub.plan},id.ilike.${participantSub.plan}_%`)
        .limit(1)
        .maybeSingle();
      
      if (planDetails?.metadata?.tickets_discount) {
        const discountPercent = Number(planDetails.metadata.tickets_discount);
        finalAmount = amount * (1 - discountPercent / 100);
      }
    }

    // Find or create customer
    const customers = await stripe.customers.list({ email: participantEmail, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: participantEmail });
      customerId = customer.id;
    }

    // Create one-time payment session for entry fee
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Entry Fee: ${tournamentName || 'Torneo'}`,
              description: `Inscripción al torneo ID: ${tournamentId}`,
            },
            unit_amount: Math.round(finalAmount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      success_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournamentId}?payment=success`,
      cancel_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournamentId}?payment=canceled`,
      metadata: {
        tournament_id: tournamentId,
        participant_email: participantEmail,
        type: 'entry_fee',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating entry fee checkout:', error);
    return NextResponse.json(
      { error: 'No se pudo crear la sesión de pago' },
      { status: 500 }
    );
  }
}
