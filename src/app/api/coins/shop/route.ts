import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/coins/shop — Get shop items and user's owned cosmetics
 * POST /api/coins/shop — Purchase or equip a cosmetic
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

async function getUserEmail(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabase = getServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.email || null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const supabase = getServiceClient();

    let query = supabase
      .from('cosmetic_items')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: items, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Error al cargar tienda' }, { status: 500 });
    }

    // If authenticated, also return owned items
    const email = await getUserEmail(request);
    let owned: string[] = [];

    if (email) {
      const { data: userCosmetics } = await supabase
        .from('user_cosmetics')
        .select('item_id, is_equipped')
        .eq('user_email', email);

      owned = (userCosmetics || []).map(uc => uc.item_id);
    }

    return NextResponse.json({ items: items || [], owned });
  } catch (err) {
    console.error('Shop GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const email = await getUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, itemId } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId requerido' }, { status: 400 });
    }

    const supabase = getServiceClient();

    switch (action) {
      case 'purchase': {
        // Get item
        const { data: item } = await supabase
          .from('cosmetic_items')
          .select('*')
          .eq('id', itemId)
          .single();

        if (!item) {
          return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });
        }

        // Check ownership
        const { data: existingOwn } = await supabase
          .from('user_cosmetics')
          .select('id')
          .eq('user_email', email)
          .eq('item_id', itemId)
          .maybeSingle();

        if (existingOwn) {
          return NextResponse.json({ error: 'Ya tienes este artículo' }, { status: 400 });
        }

        // Get wallet
        const { data: wallet } = await supabase
          .from('coin_wallets')
          .select('*')
          .eq('user_email', email)
          .maybeSingle();

        if (!wallet || wallet.balance < item.price) {
          return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });
        }

        const newBalance = wallet.balance - item.price;

        // Debit wallet
        await supabase
          .from('coin_wallets')
          .update({
            balance: newBalance,
            lifetime_spent: wallet.lifetime_spent + item.price,
          })
          .eq('user_email', email);

        // Record transaction
        const txTypeMap: Record<string, string> = {
          avatar_collection: 'spend_avatar',
          bracket_frame: 'spend_bracket_frame',
          victory_effect: 'spend_victory_effect',
          profile_banner: 'spend_profile_banner',
          nickname_color: 'spend_nickname_color',
        };

        await supabase.from('coin_transactions').insert({
          user_email: email,
          amount: -item.price,
          balance_after: newBalance,
          type: txTypeMap[item.category] || 'spend_cosmetic',
          description: `Compra: ${item.name}`,
          reference_id: itemId,
          reference_type: 'cosmetic',
        });

        // Record ownership
        await supabase.from('user_cosmetics').insert({
          user_email: email,
          item_id: itemId,
        });

        return NextResponse.json({ success: true, balance: newBalance });
      }

      case 'equip': {
        const { equip = true } = body;

        // Verify ownership
        const { data: userCosmetic } = await supabase
          .from('user_cosmetics')
          .select('*, item:cosmetic_items(*)')
          .eq('user_email', email)
          .eq('item_id', itemId)
          .single();

        if (!userCosmetic) {
          return NextResponse.json({ error: 'No tienes este artículo' }, { status: 400 });
        }

        const category = (userCosmetic.item as any)?.category;

        if (equip) {
          // Unequip same-category items
          const { data: equipped } = await supabase
            .from('user_cosmetics')
            .select('id, item:cosmetic_items(category)')
            .eq('user_email', email)
            .eq('is_equipped', true);

          if (equipped) {
            for (const e of equipped) {
              if ((e.item as any)?.category === category) {
                await supabase
                  .from('user_cosmetics')
                  .update({ is_equipped: false })
                  .eq('id', e.id);
              }
            }
          }
        }

        await supabase
          .from('user_cosmetics')
          .update({ is_equipped: equip })
          .eq('id', userCosmetic.id);

        // Update profile equipped field
        const profileFieldMap: Record<string, string> = {
          avatar_collection: 'equipped_avatar_collection',
          bracket_frame: 'equipped_bracket_frame',
          victory_effect: 'equipped_victory_effect',
          profile_banner: 'equipped_profile_banner',
          nickname_color: 'equipped_nickname_color',
        };

        const field = profileFieldMap[category];
        if (field) {
          const slug = equip ? (userCosmetic.item as any)?.slug : null;
          await supabase
            .from('profiles')
            .update({ [field]: slug })
            .eq('email', email);
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (err) {
    console.error('Shop POST error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
