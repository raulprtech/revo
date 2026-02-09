import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/coins/quests — Get quests with user progress
 * POST /api/coins/quests — Complete/claim a quest reward
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
    const email = await getUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = getServiceClient();

    const [{ data: quests }, { data: progress }] = await Promise.all([
      supabase
        .from('exploration_quests')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('user_quest_progress')
        .select('*')
        .eq('user_email', email),
    ]);

    const progressMap = new Map((progress || []).map((p: any) => [p.quest_id, p]));

    const questsWithProgress = (quests || []).map((q: any) => ({
      ...q,
      completed: progressMap.has(q.id),
      reward_claimed: progressMap.get(q.id)?.reward_claimed || false,
    }));

    // Calculate summary
    const totalQuests = questsWithProgress.length;
    const completedQuests = questsWithProgress.filter((q: any) => q.completed).length;
    const claimableQuests = questsWithProgress.filter((q: any) => q.completed && !q.reward_claimed).length;
    const totalRewards = questsWithProgress.reduce((sum: number, q: any) => sum + q.reward_amount, 0);
    const earnedRewards = questsWithProgress
      .filter((q: any) => q.reward_claimed)
      .reduce((sum: number, q: any) => sum + q.reward_amount, 0);

    return NextResponse.json({
      quests: questsWithProgress,
      summary: { totalQuests, completedQuests, claimableQuests, totalRewards, earnedRewards },
    });
  } catch (err) {
    console.error('Quests GET error:', err);
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
    const { action, questId, validationType } = body;

    const supabase = getServiceClient();

    switch (action) {
      case 'claim': {
        if (!questId) {
          return NextResponse.json({ error: 'questId requerido' }, { status: 400 });
        }

        // Get quest
        const { data: quest } = await supabase
          .from('exploration_quests')
          .select('*')
          .eq('id', questId)
          .single();

        if (!quest) {
          return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 });
        }

        // Check progress
        const { data: existing } = await supabase
          .from('user_quest_progress')
          .select('*')
          .eq('user_email', email)
          .eq('quest_id', questId)
          .maybeSingle();

        if (existing?.reward_claimed) {
          return NextResponse.json({ error: 'Recompensa ya reclamada' }, { status: 400 });
        }

        // Upsert progress
        if (!existing) {
          await supabase.from('user_quest_progress').insert({
            user_email: email,
            quest_id: questId,
            reward_claimed: true,
            reward_claimed_at: new Date().toISOString(),
          });
        } else {
          await supabase
            .from('user_quest_progress')
            .update({
              reward_claimed: true,
              reward_claimed_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        }

        // Credit wallet
        let { data: wallet } = await supabase
          .from('coin_wallets')
          .select('*')
          .eq('user_email', email)
          .maybeSingle();

        if (!wallet) {
          const { data: newWallet } = await supabase
            .from('coin_wallets')
            .insert({ user_email: email, balance: 0 })
            .select()
            .single();
          wallet = newWallet;
        }

        if (wallet) {
          const newBalance = wallet.balance + quest.reward_amount;
          await supabase
            .from('coin_wallets')
            .update({
              balance: newBalance,
              lifetime_earned: wallet.lifetime_earned + quest.reward_amount,
            })
            .eq('user_email', email);

          await supabase.from('coin_transactions').insert({
            user_email: email,
            amount: quest.reward_amount,
            balance_after: newBalance,
            type: 'exploration_reward',
            description: `Misión completada: ${quest.title}`,
            reference_id: questId,
            reference_type: 'exploration',
          });

          return NextResponse.json({
            success: true,
            reward: quest.reward_amount,
            balance: newBalance,
          });
        }

        return NextResponse.json({ error: 'Error al procesar recompensa' }, { status: 500 });
      }

      case 'mark_complete': {
        if (!validationType) {
          return NextResponse.json({ error: 'validationType requerido' }, { status: 400 });
        }

        // Find quest
        const { data: quest } = await supabase
          .from('exploration_quests')
          .select('id')
          .eq('validation_type', validationType)
          .eq('is_active', true)
          .maybeSingle();

        if (!quest) {
          return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 });
        }

        // Check if already marked
        const { data: existing } = await supabase
          .from('user_quest_progress')
          .select('id')
          .eq('user_email', email)
          .eq('quest_id', quest.id)
          .maybeSingle();

        if (existing) {
          return NextResponse.json({ already_completed: true });
        }

        await supabase.from('user_quest_progress').insert({
          user_email: email,
          quest_id: quest.id,
          reward_claimed: false,
        });

        return NextResponse.json({ success: true, quest_id: quest.id });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (err) {
    console.error('Quests POST error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
