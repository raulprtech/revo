import { createClient } from '@/lib/supabase/client';
import type {
  CoinWallet,
  CoinTransaction,
  CoinTransactionType,
  CosmeticItem,
  CosmeticCategory,
  UserCosmetic,
  ExplorationQuest,
  UserQuestProgress,
  CoinPackage,
  TournamentCoinUnlock,
  TournamentUnlockType,
} from '@/types/coins';
import { COIN_REWARDS, COIN_COSTS } from '@/types/coins';

// =============================================
// COINS SERVICE — All coin-related operations
// =============================================

class CoinsService {
  private get supabase() {
    return createClient();
  }

  // ─── WALLET ──────────────────────────────────
  
  /** Get or create wallet for the current user */
  async getWallet(email: string): Promise<CoinWallet | null> {
    const { data, error } = await this.supabase
      .from('coin_wallets')
      .select('*')
      .eq('user_email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching wallet:', error);
      return null;
    }

    return data;
  }

  /** Create wallet for a new user (called on first sign-in) — grants welcome bonus securely via RPC */
  async createWallet(email: string): Promise<CoinWallet | null> {
    const welcomeBonus = COIN_REWARDS.WELCOME_BONUS;
    
    const { data, error } = await this.supabase.rpc('process_coin_transaction', {
      p_user_email: email,
      p_amount: welcomeBonus,
      p_type: 'welcome_bonus',
      p_description: `¡Bienvenido! +${welcomeBonus} Duels Coins de regalo`,
    });

    if (error || !data.success) {
      if (error?.code === '23505') return this.getWallet(email);
      console.error('Error creating wallet via RPC:', error || data.error);
      return null;
    }

    return this.getWallet(email);
  }

  /** Get or create wallet — safe for any context */
  async getOrCreateWallet(email: string): Promise<CoinWallet | null> {
    const wallet = await this.getWallet(email);
    if (wallet) return wallet;
    return this.createWallet(email);
  }

  // ─── CASH WALLET (DUELS CASH) ────────────────
  
  /** Convert retirable cash to virtual coins with bonus (+10%) */
  async convertCashToCoins(email: string, amountMx: number): Promise<{ success: boolean; coinsAdded?: number; error?: string }> {
    const { data, error } = await this.supabase.rpc('convert_cash_to_coins', {
      p_user_email: email,
      p_cash_amount: amountMx
    });

    if (error || !data.success) {
      return { success: false, error: error?.message || data?.error || 'Error en la conversión' };
    }

    return { success: true, coinsAdded: data.coins_added };
  }

  /** Request a withdrawal to bank account (Fixed fee $15 MXN) */
  async requestPayout(email: string, amountMx: number): Promise<{ success: boolean; payoutId?: string; netAmount?: number; error?: string }> {
    const { data, error } = await this.supabase.rpc('request_cash_payout', {
      p_user_email: email,
      p_amount: amountMx
    });

    if (error || !data.success) {
      return { success: false, error: error?.message || data?.error || 'Error al procesar el retiro' };
    }

    return { success: true, payoutId: data.payout_id, netAmount: data.net_amount };
  }

  /** Get cash transactions for audit */
  async getCashHistory(email: string): Promise<CashTransaction[]> {
    const { data, error } = await this.supabase
      .from('cash_transactions')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data;
  }

  // ─── TRANSACTIONS ────────────────────────────

  /** Record a coin transaction and update balance securely via RPC */
  async recordTransaction(
    email: string,
    amount: number,
    type: CoinTransactionType,
    description?: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ transaction: CoinTransaction | null; wallet: CoinWallet | null; error?: string }> {
    const { data, error } = await this.supabase.rpc('process_coin_transaction', {
      p_user_email: email,
      p_amount: amount,
      p_type: type,
      p_description: description || null,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
    });

    if (error || !data.success) {
      console.error('Error processing transaction:', error || data.error);
      return { 
        transaction: null, 
        wallet: null, 
        error: error?.message || data?.error || 'Error al procesar la transacción' 
      };
    }

    // Return the updated state
    const wallet = await this.getWallet(email);
    return {
      transaction: null, // we don't return the full tx object here unless needed, 
                        // but we could fetch it if absolutely necessary
      wallet,
    };
  }

  /** Get transaction history */
  async getTransactions(email: string, limit = 20, offset = 0): Promise<CoinTransaction[]> {
    const { data, error } = await this.supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    return data || [];
  }

  // ─── DAILY ALLOWANCE ───────────────────────

  /** Claim daily allowance (10 coins, lost if not claimed) */
  async claimDailyAllowance(email: string): Promise<{ success: boolean; error?: string }> {
    const wallet = await this.getOrCreateWallet(email);
    if (!wallet) return { success: false, error: 'No se pudo obtener la billetera' };

    // Check if already claimed today
    if (wallet.daily_allowance_claimed_at) {
      const lastClaim = new Date(wallet.daily_allowance_claimed_at);
      const now = new Date();
      if (
        lastClaim.getFullYear() === now.getFullYear() &&
        lastClaim.getMonth() === now.getMonth() &&
        lastClaim.getDate() === now.getDate()
      ) {
        return { success: false, error: 'Ya reclamaste tus monedas de hoy' };
      }
    }

    // Credit coins
    const { error } = await this.recordTransaction(
      email,
      COIN_REWARDS.DAILY_ALLOWANCE,
      'daily_allowance',
      `Coins del Día: +${COIN_REWARDS.DAILY_ALLOWANCE} monedas`
    );

    if (error) return { success: false, error };

    // Update claim timestamp
    await this.supabase
      .from('coin_wallets')
      .update({ daily_allowance_claimed_at: new Date().toISOString() })
      .eq('user_email', email);

    return { success: true };
  }

  /** Check if daily allowance is available */
  async isDailyAllowanceAvailable(email: string): Promise<boolean> {
    const wallet = await this.getWallet(email);
    if (!wallet) return true; // New user, can claim
    if (!wallet.daily_allowance_claimed_at) return true;

    const lastClaim = new Date(wallet.daily_allowance_claimed_at);
    const now = new Date();
    return (
      lastClaim.getFullYear() !== now.getFullYear() ||
      lastClaim.getMonth() !== now.getMonth() ||
      lastClaim.getDate() !== now.getDate()
    );
  }

  // ─── PLAY-TO-EARN ────────────────────────────

  /** Reward for completing a tournament (no walkover) */
  async rewardTournamentComplete(email: string, tournamentId: string, tournamentName: string) {
    return this.recordTransaction(
      email,
      COIN_REWARDS.PLAY_COMPLETE_TOURNAMENT,
      'play_complete',
      `Torneo completado: ${tournamentName}`,
      tournamentId,
      'tournament'
    );
  }

  /** Reward for winning a match */
  async rewardMatchWin(email: string, tournamentId: string, roundName: string) {
    return this.recordTransaction(
      email,
      COIN_REWARDS.PLAY_WIN_MATCH,
      'play_win_match',
      `Victoria en ${roundName}`,
      tournamentId,
      'tournament'
    );
  }

  /** Reward for winning a tournament */
  async rewardTournamentWin(email: string, tournamentId: string, tournamentName: string) {
    return this.recordTransaction(
      email,
      COIN_REWARDS.PLAY_WIN_TOURNAMENT,
      'play_win_tournament',
      `¡Campeón de ${tournamentName}!`,
      tournamentId,
      'tournament'
    );
  }

  // ─── ORGANIZE-TO-EARN ────────────────────────

  /** Reward for organizing a successful tournament */
  async rewardSuccessfulOrganization(email: string, tournamentId: string, tournamentName: string) {
    return this.recordTransaction(
      email,
      COIN_REWARDS.ORGANIZE_SUCCESS,
      'organize_success',
      `Organización exitosa: ${tournamentName}`,
      tournamentId,
      'tournament'
    );
  }

  // ─── TOURNAMENT SPENDING ─────────────────────

  /** Unlock higher player cap for a tournament */
  async unlockPlayerCap(
    email: string,
    tournamentId: string,
    unlockType: TournamentUnlockType
  ): Promise<{ success: boolean; error?: string }> {
    const costMap: Record<string, number> = {
      player_cap_64: COIN_COSTS.PLAYER_CAP_64,
      player_cap_128: COIN_COSTS.PLAYER_CAP_128,
      player_cap_256: COIN_COSTS.PLAYER_CAP_256,
      station_manager: COIN_COSTS.STATION_MANAGER,
      ai_referee: COIN_COSTS.AI_REFEREE,
      featured_spot: COIN_COSTS.FEATURED_SPOT,
    };

    const cost = costMap[unlockType];
    if (!cost) return { success: false, error: 'Tipo de desbloqueo no válido' };

    // Check if already unlocked
    const { data: existing } = await this.supabase
      .from('tournament_coin_unlocks')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('unlock_type', unlockType)
      .maybeSingle();

    if (existing) return { success: false, error: 'Ya desbloqueado' };

    // Debit coins
    const { error } = await this.recordTransaction(
      email,
      -cost,
      'spend_player_cap',
      `Desbloqueo: ${unlockType} para torneo`,
      tournamentId,
      'tournament'
    );

    if (error) return { success: false, error };

    // Record unlock
    await this.supabase.from('tournament_coin_unlocks').insert({
      tournament_id: tournamentId,
      user_email: email,
      unlock_type: unlockType,
      cost,
    });

    return { success: true };
  }

  /** Get unlocks for a tournament */
  async getTournamentUnlocks(tournamentId: string): Promise<TournamentCoinUnlock[]> {
    const { data, error } = await this.supabase
      .from('tournament_coin_unlocks')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Error fetching unlocks:', error);
      return [];
    }
    return data || [];
  }

  // ─── COSMETICS SHOP ──────────────────────────

  /** Get all cosmetic items, optionally filtered by category */
  async getShopItems(category?: CosmeticCategory): Promise<CosmeticItem[]> {
    let query = this.supabase
      .from('cosmetic_items')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching shop items:', error);
      return [];
    }
    return data || [];
  }

  /** Get user's owned cosmetics */
  async getUserCosmetics(email: string): Promise<UserCosmetic[]> {
    const { data, error } = await this.supabase
      .from('user_cosmetics')
      .select('*, item:cosmetic_items(*)')
      .eq('user_email', email);

    if (error) {
      console.error('Error fetching user cosmetics:', error);
      return [];
    }
    return data || [];
  }

  /** Purchase a cosmetic item */
  async purchaseCosmetic(
    email: string,
    itemId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Get the item
    const { data: item } = await this.supabase
      .from('cosmetic_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!item) return { success: false, error: 'Artículo no encontrado' };

    // Check if already owned
    const { data: owned } = await this.supabase
      .from('user_cosmetics')
      .select('id')
      .eq('user_email', email)
      .eq('item_id', itemId)
      .maybeSingle();

    if (owned) return { success: false, error: 'Ya tienes este artículo' };

    // Debit coins
    const txType = `spend_${item.category === 'avatar_collection' ? 'avatar' : item.category}` as CoinTransactionType;
    const { error } = await this.recordTransaction(
      email,
      -item.price,
      txType,
      `Compra: ${item.name}`,
      itemId,
      'cosmetic'
    );

    if (error) return { success: false, error };

    // Record ownership
    await this.supabase.from('user_cosmetics').insert({
      user_email: email,
      item_id: itemId,
    });

    return { success: true };
  }

  /** Equip/unequip a cosmetic */
  async equipCosmetic(
    email: string,
    itemId: string,
    equip: boolean
  ): Promise<{ success: boolean; error?: string }> {
    // Get the item to know its category
    const { data: userCosmetic } = await this.supabase
      .from('user_cosmetics')
      .select('*, item:cosmetic_items(*)')
      .eq('user_email', email)
      .eq('item_id', itemId)
      .single();

    if (!userCosmetic) return { success: false, error: 'No tienes este artículo' };

    const category = (userCosmetic.item as CosmeticItem).category;

    if (equip) {
      // Unequip any other item in same category
      const { data: equipped } = await this.supabase
        .from('user_cosmetics')
        .select('id, item:cosmetic_items(category)')
        .eq('user_email', email)
        .eq('is_equipped', true);

      if (equipped) {
        for (const e of equipped) {
          if ((e.item as any)?.category === category) {
            await this.supabase
              .from('user_cosmetics')
              .update({ is_equipped: false })
              .eq('id', e.id);
          }
        }
      }
    }

    // Set equipped status
    await this.supabase
      .from('user_cosmetics')
      .update({ is_equipped: equip })
      .eq('id', userCosmetic.id);

    // Update profile with equipped slug
    const cosmeticSlug = equip ? (userCosmetic.item as CosmeticItem).slug : null;
    const profileField = getCosmeticProfileField(category);
    if (profileField) {
      await this.supabase
        .from('profiles')
        .update({ [profileField]: cosmeticSlug })
        .eq('email', email);
    }

    return { success: true };
  }

  // ─── EXPLORATION QUESTS ──────────────────────

  /** Get all available quests and user progress */
  async getQuestsWithProgress(email: string): Promise<(ExplorationQuest & { completed: boolean; reward_claimed: boolean })[]> {
    const [{ data: quests }, { data: progress }] = await Promise.all([
      this.supabase
        .from('exploration_quests')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      this.supabase
        .from('user_quest_progress')
        .select('*')
        .eq('user_email', email),
    ]);

    if (!quests) return [];

    const progressMap = new Map((progress || []).map(p => [p.quest_id, p]));

    return quests.map(q => ({
      ...q,
      completed: progressMap.has(q.id),
      reward_claimed: progressMap.get(q.id)?.reward_claimed || false,
    }));
  }

  /** Complete a quest and claim reward */
  async completeQuest(
    email: string,
    questId: string
  ): Promise<{ success: boolean; reward?: number; error?: string }> {
    // Check quest exists
    const { data: quest } = await this.supabase
      .from('exploration_quests')
      .select('*')
      .eq('id', questId)
      .single();

    if (!quest) return { success: false, error: 'Misión no encontrada' };

    // Check if already completed
    const { data: existing } = await this.supabase
      .from('user_quest_progress')
      .select('id, reward_claimed')
      .eq('user_email', email)
      .eq('quest_id', questId)
      .maybeSingle();

    if (existing?.reward_claimed) {
      return { success: false, error: 'Recompensa ya reclamada' };
    }

    if (!existing) {
      // Mark quest as completed
      await this.supabase.from('user_quest_progress').insert({
        user_email: email,
        quest_id: questId,
        reward_claimed: true,
        reward_claimed_at: new Date().toISOString(),
      });
    } else {
      // Update to claim reward
      await this.supabase
        .from('user_quest_progress')
        .update({
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }

    // Credit coins
    await this.recordTransaction(
      email,
      quest.reward_amount,
      'exploration_reward',
      `Misión completada: ${quest.title}`,
      questId,
      'exploration'
    );

    return { success: true, reward: quest.reward_amount };
  }

  /** Mark a quest as completed (without claiming reward yet) */
  async markQuestCompleted(email: string, validationType: string): Promise<void> {
    // Find quest by validation type
    const { data: quest } = await this.supabase
      .from('exploration_quests')
      .select('id')
      .eq('validation_type', validationType)
      .eq('is_active', true)
      .maybeSingle();

    if (!quest) return;

    // Check if already marked
    const { data: existing } = await this.supabase
      .from('user_quest_progress')
      .select('id')
      .eq('user_email', email)
      .eq('quest_id', quest.id)
      .maybeSingle();

    if (existing) return;

    // Create progress entry
    await this.supabase.from('user_quest_progress').insert({
      user_email: email,
      quest_id: quest.id,
      reward_claimed: false,
    });
  }

  // ─── COIN PACKAGES ──────────────────────────

  /** Get available coin packages for purchase */
  async getCoinPackages(): Promise<CoinPackage[]> {
    const { data, error } = await this.supabase
      .from('coin_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_mxn', { ascending: true });

    if (error) {
      console.error('Error fetching packages:', error);
      return [];
    }
    return data || [];
  }

  /** Credit coins from a package purchase (called after Stripe payment confirmation) */
  async creditPackagePurchase(
    email: string,
    packageSlug: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: pkg } = await this.supabase
      .from('coin_packages')
      .select('*')
      .eq('slug', packageSlug)
      .single();

    if (!pkg) return { success: false, error: 'Paquete no encontrado' };

    const totalCoins = pkg.coin_amount + (pkg.bonus_amount || 0);

    await this.recordTransaction(
      email,
      totalCoins,
      'purchase',
      `Compra de paquete: ${pkg.name} (${pkg.coin_amount} + ${pkg.bonus_amount} bonus)`,
      pkg.id,
      'purchase'
    );

    return { success: true };
  }

  // ─── USER EQUIPPED COSMETICS (for display) ───

  /** Get a user's equipped cosmetics for public display */
  async getEquippedCosmetics(email: string): Promise<Record<string, CosmeticItem | null>> {
    const { data, error } = await this.supabase
      .from('user_cosmetics')
      .select('*, item:cosmetic_items(*)')
      .eq('user_email', email)
      .eq('is_equipped', true);

    if (error || !data) return {};

    const result: Record<string, CosmeticItem | null> = {
      avatar_collection: null,
      bracket_frame: null,
      victory_effect: null,
      profile_banner: null,
      nickname_color: null,
    };

    for (const uc of data) {
      const item = uc.item as CosmeticItem;
      if (item) {
        result[item.category] = item;
      }
    }

    return result;
  }
}

// ─── HELPERS ───────────────────────────────────

function getCosmeticProfileField(category: CosmeticCategory): string | null {
  const map: Record<CosmeticCategory, string> = {
    avatar_collection: 'equipped_avatar_collection',
    bracket_frame: 'equipped_bracket_frame',
    victory_effect: 'equipped_victory_effect',
    profile_banner: 'equipped_profile_banner',
    nickname_color: 'equipped_nickname_color',
    booster: 'equipped_booster',
    organizer_booster: 'equipped_organizer_booster',
    emote: 'equipped_emote_pack',
    tournament_theme: 'equipped_tournament_theme',
  };
  return map[category] || null;
}

/** Format coin amount for display */
export function formatCoins(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  }
  return amount.toLocaleString();
}

/** Get transaction type label in Spanish */
export function getTransactionLabel(type: CoinTransactionType): string {
  const labels: Record<CoinTransactionType, string> = {
    daily_allowance: 'Recompensa Diaria',
    welcome_bonus: 'Bonus de Bienvenida',
    play_complete: 'Torneo Completado',
    play_win_match: 'Victoria en Partida',
    play_win_tournament: 'Campeón de Torneo',
    organize_success: 'Organización Exitosa',
    exploration_reward: 'Misión de Exploración',
    purchase: 'Compra de Monedas',
    refund: 'Reembolso',
    admin_grant: 'Otorgado por Admin',
    spend_player_cap: 'Desbloqueo de Jugadores',
    spend_feature_unlock: 'Función Premium',
    spend_featured_spot: 'Torneo Destacado',
    spend_cosmetic: 'Artículo Cosmético',
    spend_avatar: 'Colección de Avatares',
    spend_bracket_frame: 'Marco de Bracket',
    spend_victory_effect: 'Efecto de Victoria',
    spend_profile_banner: 'Banner de Perfil',
    spend_nickname_color: 'Color de Nickname',
    spend_booster: 'Potenciador',
    spend_organizer_booster: 'Potenciador Plus',
    spend_emote: 'Emote',
    spend_tournament_theme: 'Tema de Torneo',
  };
  return labels[type] || type;
}

// Singleton
export const coinsService = new CoinsService();
