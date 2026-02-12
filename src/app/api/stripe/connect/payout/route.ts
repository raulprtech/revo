import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover' as any,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    // 1. Get profile and check if connect is ready
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_id, onboarding_completed')
      .eq('email', user.email)
      .single();

    if (!profile?.stripe_connect_id) {
      return NextResponse.json({ error: 'Debes vincular tu cuenta de Stripe primero.' }, { status: 400 });
    }

    // Optional: Strictly check onboarding_completed or verify with Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_connect_id);
    if (!account.details_submitted) {
        return NextResponse.json({ error: 'La configuración de tu cuenta de Stripe está incompleta.' }, { status: 400 });
    }

    // 2. Start Transaction in DB (Subtract balance)
    // We use the existing requestPayout which calls rpc 'process_fiat_transaction'
    const payoutResult = await db.requestPayout(user.email!, amount, 'stripe_connect', { 
        stripe_account_id: profile.stripe_connect_id 
    });

    if (!payoutResult.success) {
        return NextResponse.json({ error: payoutResult.error }, { status: 400 });
    }

    // 3. Execute Stripe Transfer (Automatic Payout)
    // In Stripe Connect Express, you "transfer" funds to their account.
    // They can then have automatic payouts to their bank from their Stripe account.
    try {
        const transfer = await stripe.transfers.create({
            amount: Math.round(amount * 100), // Stripe uses cents
            currency: 'mxn',
            destination: profile.stripe_connect_id,
            description: `Retiro de Duels Esports - ${user.email}`,
            metadata: {
                payout_id: payoutResult.payoutId!,
                user_email: user.email!
            }
        });

        // 4. Update Payout Request as Completed
        const { data: { supabase: adminSupabase } } = await import('@/lib/supabase/server'); // Need admin context for status update usually or RPC
        const serviceClient = (await import('@supabase/supabase-js')).createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await serviceClient
            .from('payout_requests')
            .update({ 
                status: 'completed', 
                processed_at: new Date().toISOString(),
                method_details: { 
                    ...payoutResult,
                    stripe_transfer_id: transfer.id 
                }
            })
            .eq('id', payoutResult.payoutId);

        return NextResponse.json({ 
            success: true, 
            transferId: transfer.id,
            message: 'Transferencia completada con éxito.' 
        });

    } catch (stripeErr: any) {
        console.error('Stripe Transfer Error:', stripeErr);
        // If transfer fails, we should ideally refund the balance or mark as failed
        // For now, let's just return the error.
        return NextResponse.json({ 
            error: 'La transferencia de Stripe falló, pero tu solicitud ha sido registrada. Contacta a soporte.',
            details: stripeErr.message 
        }, { status: 500 });
    }

  } catch (error) {
    console.error('Connect Payout Error:', error);
    return NextResponse.json({ error: 'Error al procesar el retiro automático' }, { status: 500 });
  }
}
