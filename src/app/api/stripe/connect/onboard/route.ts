import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

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

    // Get current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_id')
      .eq('email', user.email)
      .single();

    let accountId = profile?.stripe_connect_id;

    if (!accountId) {
      // Create a Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
            user_email: user.email!
        }
      });
      
      accountId = account.id;

      // Save to profile
      await supabase
        .from('profiles')
        .update({ stripe_connect_id: accountId })
        .eq('email', user.email);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?connect=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?connect=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error in Connect onboarding:', error);
    return NextResponse.json({ error: 'No se pudo iniciar la vinculación con Stripe' }, { status: 500 });
  }
}
