import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/check-availability
 * 
 * Checks whether a nickname or email is already in use.
 * Uses the service role key to call SECURITY DEFINER functions
 * that query auth.users directly — detecting ALL registered users,
 * not just those with a profiles row.
 * 
 * Body: { type: 'email' | 'nickname', value: string, excludeEmail?: string }
 * Response: { available: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, value, excludeEmail } = body as {
      type: 'email' | 'nickname';
      value: string;
      excludeEmail?: string;
    };

    if (!type || !value || !['email', 'nickname'].includes(type)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos' },
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

    const trimmedValue = value.trim();

    if (type === 'email') {
      const { data, error } = await supabaseAdmin.rpc('check_email_exists', {
        check_email: trimmedValue.toLowerCase(),
      });

      if (error) {
        console.error('Error checking email availability:', error);
        // Fallback: check profiles table (partial coverage)
        const { count } = await supabaseAdmin
          .from('profiles')
          .select('email', { count: 'exact', head: true })
          .eq('email', trimmedValue.toLowerCase());
        return NextResponse.json({ available: (count ?? 0) === 0 });
      }

      return NextResponse.json({ available: !data });
    } else {
      const { data, error } = await supabaseAdmin.rpc('check_nickname_exists', {
        check_nickname: trimmedValue,
        exclude_email: excludeEmail || null,
      });

      if (error) {
        console.error('Error checking nickname availability:', error);
        // Fallback: check profiles table only
        let query = supabaseAdmin
          .from('profiles')
          .select('email', { count: 'exact', head: true })
          .ilike('nickname', trimmedValue);
        if (excludeEmail) {
          query = query.neq('email', excludeEmail);
        }
        const { count } = await query;
        return NextResponse.json({ available: (count ?? 0) === 0 });
      }

      return NextResponse.json({ available: !data });
    }
  } catch (error) {
    console.error('Error in check-availability:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
