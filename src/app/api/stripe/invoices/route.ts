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
 * Fetches the latest invoices for a user from Stripe.
 */
export async function POST(request: Request) {
  try {
    // Validate authenticated user
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    const { email: bodyEmail } = await request.json();
    const email = user?.email || bodyEmail;

    if (!email) {
      return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
    }

    // Get Stripe customer ID from subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] });
    }

    // Fetch latest invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: sub.stripe_customer_id,
      limit: 12,
    });

    const formattedInvoices = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
    }));

    return NextResponse.json({ invoices: formattedInvoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener las facturas' },
      { status: 500 }
    );
  }
}
