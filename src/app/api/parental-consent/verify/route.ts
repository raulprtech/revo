import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route verifies or revokes parental consent via token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action } = body; // action: 'approve' | 'revoke'

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      );
    }

    const validActions = ['approve', 'revoke'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up the consent token
    const { data: consentToken, error: lookupError } = await supabaseAdmin
      .from('parental_consent_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (lookupError || !consentToken) {
      return NextResponse.json(
        { error: 'Token no válido o no encontrado' },
        { status: 404 }
      );
    }

    // Check if token is already used
    if (consentToken.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Este enlace ya fue utilizado',
        status: consentToken.status,
      }, { status: 400 });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(consentToken.expires_at);
    if (now > expiresAt) {
      // Mark as expired
      await supabaseAdmin
        .from('parental_consent_tokens')
        .update({ status: 'expired' })
        .eq('token', token);

      return NextResponse.json({
        success: false,
        error: 'Este enlace ha expirado. El menor deberá solicitar un nuevo registro.',
      }, { status: 410 });
    }

    if (action === 'approve') {
      // Approve: update user metadata to mark consent as verified
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        consentToken.user_id,
        {
          user_metadata: {
            parental_consent_verified: true,
            parental_consent_verified_at: now.toISOString(),
            parental_consent_method: 'email_verification',
          },
        }
      );

      if (updateError) {
        console.error('Error updating user metadata:', updateError);
        return NextResponse.json(
          { error: 'Error al actualizar la cuenta del menor' },
          { status: 500 }
        );
      }

      // Update the profiles table
      await supabaseAdmin
        .from('profiles')
        .update({
          parental_consent_verified: true,
          parental_consent_at: now.toISOString(),
        })
        .eq('id', consentToken.user_id);

      // Mark token as used
      await supabaseAdmin
        .from('parental_consent_tokens')
        .update({
          status: 'approved',
          verified_at: now.toISOString(),
        })
        .eq('token', token);

      return NextResponse.json({
        success: true,
        action: 'approved',
        message: 'Consentimiento parental verificado exitosamente',
        childName: consentToken.child_name,
      });

    } else if (action === 'revoke') {
      // Revoke: mark the consent as revoked and disable the account
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        consentToken.user_id,
        {
          user_metadata: {
            parental_consent_verified: false,
            parental_consent_revoked: true,
            parental_consent_revoked_at: now.toISOString(),
            pending_deletion: true,
            deletion_requested_at: now.toISOString(),
          },
        }
      );

      if (updateError) {
        console.error('Error revoking consent:', updateError);
        return NextResponse.json(
          { error: 'Error al revocar el consentimiento' },
          { status: 500 }
        );
      }

      // Update profiles table
      await supabaseAdmin
        .from('profiles')
        .update({
          parental_consent_verified: false,
          is_minor: true,
        })
        .eq('id', consentToken.user_id);

      // Mark token as revoked
      await supabaseAdmin
        .from('parental_consent_tokens')
        .update({
          status: 'revoked',
          verified_at: now.toISOString(),
        })
        .eq('token', token);

      return NextResponse.json({
        success: true,
        action: 'revoked',
        message: 'Consentimiento revocado. La cuenta del menor será eliminada.',
        childName: consentToken.child_name,
      });
    }

  } catch (error) {
    console.error('Error in parental consent verification:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
