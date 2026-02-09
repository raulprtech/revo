import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route sends a parental consent verification email
// It uses the Supabase service role to access admin features
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      parentEmail, 
      parentFullName, 
      childName, 
      childEmail,
      userId 
    } = body;

    if (!parentEmail || !parentFullName || !childName || !userId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate a secure token for parental consent verification
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

    // Store the consent token in the database
    const { error: insertError } = await supabaseAdmin
      .from('parental_consent_tokens')
      .insert({
        token,
        user_id: userId,
        parent_email: parentEmail,
        parent_full_name: parentFullName,
        child_name: childName,
        child_email: childEmail,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      });

    if (insertError) {
      console.error('Error storing consent token:', insertError);
      return NextResponse.json(
        { error: 'Error al generar el token de consentimiento' },
        { status: 500 }
      );
    }

    // Build the consent verification URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const consentUrl = `${baseUrl}/auth/parental-consent?token=${token}`;
    const revokeUrl = `${baseUrl}/auth/parental-consent?token=${token}&action=revoke`;

    // Send email using Supabase's built-in email (via auth.admin)
    // We use a custom email approach: insert into a simple email queue table
    // or use Supabase's built-in email sending via Edge Functions
    
    // For now, we'll use the parental_consent_tokens table and 
    // Supabase's built-in SMTP to send a custom email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consentimiento Parental - Duels Esports</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #6366f1; margin: 0;">🎮 Duels Esports</h1>
      <p style="color: #666; font-size: 14px;">Plataforma de Torneos de Videojuegos</p>
    </div>

    <h2 style="color: #1a1a1a; font-size: 20px;">Solicitud de Consentimiento Parental</h2>
    
    <p>Estimado/a <strong>${parentFullName}</strong>,</p>
    
    <p>El menor <strong>${childName}</strong> (${childEmail}) ha solicitado crear una cuenta en Duels Esports, 
    una plataforma para la organización y participación en torneos de videojuegos.</p>

    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #92400e;">⚠️ Aviso COPPA - Protección de Privacidad Infantil</p>
      <p style="margin: 8px 0 0 0; color: #78350f; font-size: 14px;">
        De acuerdo con la Ley de Protección de la Privacidad Infantil en Línea (COPPA), 
        se requiere su consentimiento verificable para recopilar datos personales de un menor de 13 años.
      </p>
    </div>

    <h3 style="color: #1a1a1a; font-size: 16px;">Datos que se recopilarán:</h3>
    <ul style="color: #4a4a4a; font-size: 14px; line-height: 1.8;">
      <li>Nombre, apellido y nickname del menor</li>
      <li>Fecha de nacimiento y género</li>
      <li>Correo electrónico</li>
      <li>Historial de participación en torneos y resultados</li>
    </ul>

    <h3 style="color: #1a1a1a; font-size: 16px;">Compartición de datos:</h3>
    <ul style="color: #4a4a4a; font-size: 14px; line-height: 1.8;">
      <li><strong>Organizadores de torneos:</strong> Podrán acceder a los datos del menor para gestionar torneos y contactar sobre futuros eventos</li>
      <li><strong>Patrocinadores:</strong> Podrán recibir datos como nombre/nickname, edad, ubicación y resultados con fines promocionales</li>
    </ul>

    <h3 style="color: #1a1a1a; font-size: 16px;">Sus derechos como padre/madre/tutor:</h3>
    <ul style="color: #4a4a4a; font-size: 14px; line-height: 1.8;">
      <li>Revisar los datos personales recopilados del menor en cualquier momento</li>
      <li>Solicitar la eliminación de los datos y la cuenta del menor</li>
      <li>Revocar este consentimiento en cualquier momento</li>
      <li>Oponerse al uso o compartición de los datos del menor</li>
    </ul>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${consentUrl}" 
         style="display: inline-block; background-color: #22c55e; color: white; padding: 14px 32px; 
                text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 8px;">
        ✅ Autorizar Cuenta del Menor
      </a>
      <br/>
      <a href="${revokeUrl}" 
         style="display: inline-block; background-color: #ef4444; color: white; padding: 10px 24px; 
                text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 8px;">
        ❌ No Autorizo
      </a>
    </div>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #6b7280;">
        <strong>Importante:</strong> Este enlace expira en 7 días. Si no realiza ninguna acción, 
        la cuenta del menor permanecerá con funcionalidad restringida hasta que se verifique el consentimiento. 
        Si no reconoce esta solicitud, puede ignorar este correo de manera segura.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      Duels Esports - Plataforma de Torneos de Videojuegos<br/>
      Este correo fue enviado porque el menor indicó su dirección como padre/madre/tutor al registrarse.<br/>
      Si tiene preguntas, puede contactarnos respondiendo a este correo.
    </p>
  </div>
</body>
</html>
    `.trim();

    const emailSubject = `Consentimiento Parental Requerido - Cuenta de ${childName} en Duels Esports`;

    // Send email directly via Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || 'Duels Esports <onboarding@resend.dev>';

    let emailSent = false;

    if (resendApiKey) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: resendFrom,
            to: parentEmail,
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        const resendData = await resendResponse.json();

        if (resendResponse.ok) {
          emailSent = true;
          console.log('✅ Parental consent email sent via Resend:', resendData);
        } else {
          console.error('❌ Resend API error:', resendData);
        }
      } catch (resendError) {
        console.error('❌ Error calling Resend API:', resendError);
      }
    } else {
      console.warn('⚠️ RESEND_API_KEY not configured in .env.local');
    }

    // Also log to email_queue table for audit trail
    await supabaseAdmin
      .from('email_queue')
      .insert({
        to_email: parentEmail,
        to_name: parentFullName,
        subject: emailSubject,
        html_body: emailHtml,
        status: emailSent ? 'sent' : 'pending',
        sent_at: emailSent ? new Date().toISOString() : null,
        type: 'parental_consent',
        metadata: { token, userId, childEmail },
      })
      .then(({ error }) => {
        if (error) console.warn('Email queue insert failed (non-critical):', error);
      });

    return NextResponse.json({
      success: true,
      emailSent,
      message: emailSent 
        ? 'Correo de consentimiento parental enviado' 
        : 'Token generado pero hubo un problema al enviar el correo',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' ? { consentUrl } : {}),
    });

  } catch (error) {
    console.error('Error in parental consent API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
