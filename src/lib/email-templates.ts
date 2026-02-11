import { createClient } from '@supabase/supabase-js';
import { formatCurrency } from './utils';

// =============================================
// TRANSACTIONAL EMAIL TEMPLATES (Stripe/Billing)
// =============================================
// Queues emails in the `email_queue` table processed by
// the `process-email-queue` Supabase Edge Function via Resend.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://duelsesports.com';
const APP_NAME = 'Duels Esports';

// =============================================
// HELPER: Queue an email
// =============================================

interface QueueEmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  type: string;
  metadata?: Record<string, unknown>;
}

async function queueEmail({ to, toName, subject, html, type, metadata }: QueueEmailParams) {
  const { error } = await supabase.from('email_queue').insert({
    to_email: to,
    to_name: toName || null,
    subject,
    html_body: html,
    type,
    metadata: metadata || {},
    status: 'pending',
  });

  if (error) {
    console.error(`Failed to queue email [${type}] to ${to}:`, error.message);
  }

  // Optionally invoke the edge function immediately for faster delivery
  try {
    await supabase.functions.invoke('process-email-queue', {
      body: {},
    });
  } catch {
    // Non-blocking — the cron job will pick it up
  }
}

// =============================================
// SHARED LAYOUT
// =============================================

function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 16px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">⚡ ${APP_NAME}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 16px 32px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                ${APP_NAME} — Crea, gestiona y compite en torneos.<br>
                <a href="${APP_URL}" style="color: #888; text-decoration: none;">duelsesports.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buttonHtml(text: string, url: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px auto;">
      <tr>
        <td style="background-color: #7c3aed; border-radius: 8px;">
          <a href="${url}" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

// =============================================
// EMAIL TEMPLATES
// =============================================

/** Sent when a user successfully subscribes to Plus */
export async function sendSubscriptionWelcomeEmail(email: string) {
  const html = emailLayout(`
    <h2 style="color: #ffffff; margin: 0 0 16px; font-size: 20px;">¡Bienvenido a Organizer Plus! 🎉</h2>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      Tu suscripción a <strong style="color: #fff;">Organizer Plus</strong> está activa. 
      Ya tienes acceso a todas las herramientas profesionales de ${APP_NAME}.
    </p>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      Esto incluye:
    </p>
    <ul style="color: #ccc; line-height: 1.8; padding-left: 20px; margin: 0 0 16px;">
      <li>Station Manager para hardware</li>
      <li>Premios en dinero real con Stripe</li>
      <li>Cobro de entry fees</li>
      <li>Analítica avanzada y KPIs</li>
      <li>Validación de scores por IA</li>
      <li>Personalización de marca</li>
      <li>Soporte prioritario</li>
    </ul>
    <p style="color: #999; font-size: 13px; margin: 0 0 8px;">
      Tu período de prueba gratuita de 14 días ha comenzado. No se realizará ningún cobro hasta que finalice.
    </p>
    ${buttonHtml('Ir al Dashboard', `${APP_URL}/dashboard`)}
  `);

  await queueEmail({
    to: email,
    subject: '¡Bienvenido a Organizer Plus! ⚡',
    html,
    type: 'subscription_welcome',
  });
}

/** Sent when a subscription is canceled (at period end) */
export async function sendSubscriptionCanceledEmail(email: string, periodEnd: string) {
  const endDate = new Date(periodEnd).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = emailLayout(`
    <h2 style="color: #ffffff; margin: 0 0 16px; font-size: 20px;">Tu suscripción Plus se cancelará</h2>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      Hemos recibido tu solicitud de cancelación. Tu plan <strong style="color: #fff;">Organizer Plus</strong> 
      se mantendrá activo hasta el <strong style="color: #fff;">${endDate}</strong>.
    </p>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      Después de esa fecha, tu cuenta volverá al plan Community. Tus datos no se eliminarán — 
      los torneos con Pago por Evento mantienen su acceso Plus para siempre.
    </p>
    <p style="color: #999; font-size: 13px; margin: 0 0 8px;">
      Puedes reactivar tu suscripción en cualquier momento desde la página de facturación.
    </p>
    ${buttonHtml('Reactivar Suscripción', `${APP_URL}/billing`)}
  `);

  await queueEmail({
    to: email,
    subject: 'Tu suscripción Plus será cancelada',
    html,
    type: 'subscription_canceled',
    metadata: { period_end: periodEnd },
  });
}

/** Sent when a payment fails */
export async function sendPaymentFailedEmail(email: string) {
  const html = emailLayout(`
    <h2 style="color: #ff6b6b; margin: 0 0 16px; font-size: 20px;">⚠️ Problema con tu pago</h2>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      No pudimos procesar el pago de tu suscripción <strong style="color: #fff;">Organizer Plus</strong>. 
      Por favor actualiza tu método de pago para mantener tu acceso a las funciones Plus.
    </p>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      Si no se resuelve pronto, tu suscripción podría suspenderse.
    </p>
    ${buttonHtml('Actualizar Método de Pago', `${APP_URL}/billing`)}
    <p style="color: #999; font-size: 13px; margin: 16px 0 0; text-align: center;">
      Si crees que es un error, contacta a soporte.
    </p>
  `);

  await queueEmail({
    to: email,
    subject: '⚠️ Problema con tu pago — Acción requerida',
    html,
    type: 'payment_failed',
  });
}

/** Sent when a subscription is successfully renewed (invoice paid) */
export async function sendPaymentSuccessEmail(email: string, amount: number, currency: string, periodEnd: string) {
  const endDate = new Date(periodEnd).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const formattedAmount = `$${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;

  const html = emailLayout(`
    <h2 style="color: #ffffff; margin: 0 0 16px; font-size: 20px;">Pago procesado correctamente ✅</h2>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      Tu pago de <strong style="color: #fff;">${formattedAmount}</strong> por Organizer Plus ha sido procesado exitosamente.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 16px 0; background-color: #222; border-radius: 8px;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 8px; color: #999; font-size: 13px;">Monto</p>
          <p style="margin: 0 0 16px; color: #fff; font-weight: 600;">${formattedAmount}</p>
          <p style="margin: 0 0 8px; color: #999; font-size: 13px;">Próxima renovación</p>
          <p style="margin: 0; color: #fff; font-weight: 600;">${endDate}</p>
        </td>
      </tr>
    </table>
    ${buttonHtml('Ver Facturación', `${APP_URL}/billing`)}
  `);

  await queueEmail({
    to: email,
    subject: `Recibo de pago — ${formattedAmount}`,
    html,
    type: 'payment_success',
    metadata: { amount, currency, period_end: periodEnd },
  });
}

/** Sent when entry fee is paid for a tournament */
export async function sendEntryFeeConfirmationEmail(
  email: string, 
  tournamentName: string, 
  tournamentId: string,
  amount: number, 
  currency: string
) {
  const formattedAmount = formatCurrency(amount, currency);

  const html = emailLayout(`
    <h2 style="color: #ffffff; margin: 0 0 16px; font-size: 20px;">Inscripción confirmada 🎮</h2>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      Tu pago de <strong style="color: #fff;">${formattedAmount}</strong> para el torneo 
      <strong style="color: #fff;">${tournamentName}</strong> ha sido procesado correctamente.
    </p>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      ¡Ya estás inscrito! Revisa la página del torneo para más detalles sobre el horario y las reglas.
    </p>
    ${buttonHtml('Ver Torneo', `${APP_URL}/tournaments/${tournamentId}`)}
  `);

  await queueEmail({
    to: email,
    subject: `Inscripción confirmada — ${tournamentName}`,
    html,
    type: 'entry_fee_confirmation',
    metadata: { tournament_id: tournamentId, amount, currency },
  });
}

/** Sent when a Legacy Pro purchase is completed */
export async function sendLegacyProPurchaseEmail(
  email: string,
  tournamentName: string,
  tournamentId: string
) {
  const html = emailLayout(`
    <h2 style="color: #ffffff; margin: 0 0 16px; font-size: 20px;">Pago por Evento completado 🏛️</h2>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      Tu compra de <strong style="color: #fff;">Pago por Evento ($299 MXN)</strong> para el torneo 
      <strong style="color: #fff;">"${tournamentName}"</strong> ha sido procesada exitosamente.
    </p>
    <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
      Este torneo ahora tiene funciones <strong style="color: #7c3aed;">Plus permanentes</strong>. 
      Los brackets, estadísticas y datos se preservarán para siempre como un Legacy.
    </p>
    <ul style="color: #ccc; line-height: 1.8; padding-left: 20px; margin: 0 0 16px;">
      <li>Funciones Plus activas de por vida para este torneo</li>
      <li>Brackets, estadísticas y fotos preservadas</li>
      <li>No requiere suscripción mensual</li>
    </ul>
    ${buttonHtml('Ver Torneo', `${APP_URL}/tournaments/${tournamentId}`)}
  `);

  await queueEmail({
    to: email,
    subject: `Pago por Evento completado — "${tournamentName}"`,
    html,
    type: 'legacy_pro_purchase',
    metadata: { tournament_id: tournamentId },
  });
}
