import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { 
  sendSubscriptionWelcomeEmail, 
  sendSubscriptionCanceledEmail, 
  sendPaymentFailedEmail, 
  sendPaymentSuccessEmail,
  sendLegacyProPurchaseEmail,
  sendEntryFeeConfirmationEmail
} from '@/lib/email-templates';
import { calculatePlatformFee, calculateNetRevenue } from '@/lib/utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle Legacy Pro purchase (one-time)
        if (session.metadata?.type === 'legacy_pro') {
          const tournamentId = session.metadata.tournament_id;
          const buyerEmail = session.metadata.user_email;

          if (tournamentId) {
            await supabase
              .from('tournaments')
              .update({
                is_legacy_pro: true,
                legacy_pro_purchased_at: new Date().toISOString(),
                legacy_pro_purchased_by: buyerEmail || null,
              })
              .eq('id', tournamentId);

            // Send Legacy Pro purchase confirmation email
            if (buyerEmail) {
              const { data: t } = await supabase
                .from('tournaments')
                .select('name')
                .eq('id', tournamentId)
                .single();
              await sendLegacyProPurchaseEmail(buyerEmail, t?.name || 'Torneo', tournamentId);
            }
          }
          break;
        }

        // Handle entry fee payments (one-time)
        if (session.metadata?.type === 'entry_fee') {
          const tournamentId = session.metadata.tournament_id;
          const participantEmail = session.metadata.participant_email;
          const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
          const paymentIntentId = session.payment_intent as string;

          if (tournamentId && participantEmail && paymentIntentId) {
            // Idempotency check — skip if already recorded
            const { data: existingPayment } = await supabase
              .from('tournament_payments')
              .select('id')
              .eq('stripe_payment_intent_id', paymentIntentId)
              .maybeSingle();

            if (!existingPayment) {
              const platformFee = calculatePlatformFee(amountTotal);
              const netAmount = calculateNetRevenue(amountTotal);

              // Record payment with fee breakdown
              await supabase.from('tournament_payments').insert({
                tournament_id: tournamentId,
                participant_email: participantEmail,
                amount: amountTotal,
                platform_fee: platformFee,
                net_amount: netAmount,
                currency: session.currency?.toUpperCase() || 'USD',
                stripe_payment_intent_id: paymentIntentId,
                status: 'completed',
              });

              // Update collected fees on tournament
              const { data: tournament } = await supabase
                .from('tournaments')
                .select('collected_fees')
                .eq('id', tournamentId)
                .single();

              await supabase
                .from('tournaments')
                .update({
                  collected_fees: (tournament?.collected_fees || 0) + amountTotal,
                })
                .eq('id', tournamentId);

              // Send entry fee confirmation email
              const { data: t } = await supabase
                .from('tournaments')
                .select('name')
                .eq('id', tournamentId)
                .single();
              await sendEntryFeeConfirmationEmail(
                participantEmail,
                t?.name || 'Torneo',
                tournamentId,
                amountTotal,
                session.currency?.toUpperCase() || 'USD'
              );
            }
          }
          break;
        }

        // Handle subscription OR one-time plan checkout
        const email = session.metadata?.user_email;
        const planId = session.metadata?.plan_id;
        const subscriptionId = session.subscription as string;

        if (email && planId && session.mode === 'payment') {
          // One-time payment (Legacy/Event Plan)
          await supabase.from('subscriptions').upsert({
            user_email: email,
            plan: planId,
            status: 'active',
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_email', // This will replace any current active plan
          });
          
          // Send welcome email
          await sendSubscriptionWelcomeEmail(email);
        } else if (email && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          
          const periodStart = subscription.current_period_start 
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : new Date().toISOString();
          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          const planId = subscription.metadata?.plan_id || session.metadata?.plan_id || 'plus';

          await supabase.from('subscriptions').upsert({
            user_email: email,
            plan: planId,
            status: subscription.status === 'trialing' ? 'trialing' : 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            trial_end: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString() 
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'stripe_subscription_id',
          });

          // Send welcome email for new subscription
          await sendSubscriptionWelcomeEmail(email);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const email = subscription.metadata?.user_email;

        if (email) {
          const statusMap: Record<string, string> = {
            active: 'active',
            trialing: 'trialing',
            past_due: 'past_due',
            canceled: 'canceled',
            unpaid: 'canceled',
          };

          const periodStart = subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : new Date().toISOString();
          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          await supabase
            .from('subscriptions')
            .update({
              status: statusMap[subscription.status] || 'canceled',
              current_period_start: periodStart,
              current_period_end: periodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          // Send canceled email if subscription is being canceled at period end
          if (subscription.cancel_at_period_end && periodEnd) {
            await sendSubscriptionCanceledEmail(email, periodEnd);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          // Send payment failed email
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_email')
            .eq('stripe_subscription_id', subscriptionId)
            .single();
          if (sub?.user_email) {
            await sendPaymentFailedEmail(sub.user_email);
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Confirm subscription is active after successful renewal
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          const periodStart = subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : new Date().toISOString();
          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: periodStart,
              current_period_end: periodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          // Send payment success email (for renewals, not first payment)
          const inv = event.data.object as any;
          if (inv.billing_reason === 'subscription_cycle' || inv.billing_reason === 'subscription_update') {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('user_email')
              .eq('stripe_subscription_id', subscriptionId)
              .single();
            if (sub?.user_email && periodEnd) {
              await sendPaymentSuccessEmail(
                sub.user_email,
                inv.amount_paid || 0,
                inv.currency || 'mxn',
                periodEnd
              );
            }
          }
        }
        break;
      }

      // --- DUELS CASH PAYOUTS (Stripe Connect) ---
      
      case 'payout.created':
      case 'payout.updated':
      case 'payout.paid':
      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        const payoutRequestId = payout.metadata?.payout_request_id;
        
        if (payoutRequestId) {
          let newStatus = 'processing';
          if (event.type === 'payout.paid') newStatus = 'completed';
          if (event.type === 'payout.failed') newStatus = 'failed';

          // 1. Update Payout Request
          const { data: updatedReq, error: reqError } = await supabase
            .from('payout_requests')
            .update({ 
              status: newStatus,
              updated_at: new Date().toISOString(),
              stripe_payout_id: payout.id,
              error_message: event.type === 'payout.failed' ? payout.failure_message : null,
              bank_account_last4: (payout as any).destination_details?.bank_account?.last4 || null
            })
            .eq('id', payoutRequestId)
            .select('user_email, amount')
            .single();

          // 2. Sync Cash Transaction status
          if (!reqError && updatedReq) {
            await supabase
              .from('cash_transactions')
              .update({ status: newStatus })
              .eq('reference_id', payoutRequestId)
              .eq('reference_type', 'payout_request');

            // 3. Handle failure: Refund the user's cash balance
            if (newStatus === 'failed' && updatedReq.user_email) {
               // Re-sumar el dinero al balance (RPC payout_cash_reward se encarga de sumar)
               await supabase.rpc('payout_cash_reward', {
                 p_user_email: updatedReq.user_email,
                 p_amount: updatedReq.amount,
                 p_type: 'admin_adjustment',
                 p_ref_id: payoutRequestId,
                 p_description: `Reembolso por retiro fallido (Stripe ID: ${payout.id})`
               });
            }
          }
        }
        break;
      }

      default:
        // Unhandled event type — log and continue
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    // Log event for audit/retry purposes
    try {
      await supabase.from('stripe_events').insert({
        event_id: event.id,
        event_type: event.type,
        processed: true,
        payload: event.data.object,
      });
    } catch { /* table may not exist yet — non-blocking */ }

  } catch (err) {
    console.error('Error processing webhook:', err);

    // Log failed event for retry
    try {
      await supabase.from('stripe_events').insert({
        event_id: event.id,
        event_type: event.type,
        processed: false,
        error_message: err instanceof Error ? err.message : 'Unknown error',
        payload: event.data.object,
      });
    } catch { /* non-blocking */ }

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
