import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Manage subscription: cancel, resume, or open portal
 */
export async function POST(request: Request) {
  try {
    // Validate authenticated user
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    const { action, email: bodyEmail } = await request.json();
    const email = user?.email || bodyEmail;

    if (!email || !action) {
      return NextResponse.json({ error: 'Autenticación y acción requeridas' }, { status: 401 });
    }

    // Get subscription from DB
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_email', email)
      .in('status', ['active', 'trialing'])
      .single();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    if (action === 'cancel') {
      // Cancel at period end (user keeps access until end of billing cycle)
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.stripe_subscription_id);

      return NextResponse.json({ status: 'canceling_at_period_end' });
    }

    if (action === 'resume') {
      // Resume a subscription that was set to cancel
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.stripe_subscription_id);

      return NextResponse.json({ status: 'active' });
    }

    if (action === 'portal') {
      // Create customer portal session for billing management
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_email', email)
        .single();

      if (!subData?.stripe_customer_id) {
        return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subData.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error managing subscription:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
