// =============================================
// DUELS COINS — Type definitions
// =============================================

// --- Wallet ---
export interface CoinWallet {
  id: string;
  user_email: string;
  balance: number; // Duels Coins (Virtual)
  cash_balance: number; // Duels Cash (Retirable MXN)
  lifetime_earned: number;
  lifetime_spent: number;
  lifetime_cash_earned: number;
  lifetime_cash_withdrawn: number;
  daily_allowance_claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Cash Transactions ---
export type CashTransactionType = 
  | 'prize_payout'
  | 'organizer_earnings'
  | 'cash_withdrawal'
  | 'conversion_to_coins'
  | 'admin_adjustment';

export interface CashTransaction {
  id: string;
  user_email: string;
  amount: number;
  balance_after: number;
  type: CashTransactionType;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string | null;
  fee_amount: number;
  created_at: string;
}

// --- Transaction types ---
export type CoinTransactionType =
  // Credits
  | 'daily_allowance'
  | 'welcome_bonus'
  | 'play_complete'
  | 'play_win_match'
  | 'play_win_tournament'
  | 'organize_success'
  | 'exploration_reward'
  | 'purchase'
  | 'refund'
  | 'admin_grant'
  // Debits
  | 'spend_player_cap'
  | 'spend_feature_unlock'
  | 'spend_featured_spot'
  | 'spend_cosmetic'
  | 'spend_avatar'
  | 'spend_bracket_frame'
  | 'spend_victory_effect'
  | 'spend_profile_banner'
  | 'spend_nickname_color'
  | 'spend_booster'
  | 'spend_organizer_booster'
  | 'spend_emote'
  | 'spend_tournament_theme';

export interface CoinTransaction {
  id: string;
  user_email: string;
  amount: number; // positive = credit, negative = debit
  balance_after: number;
  type: CoinTransactionType;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

// --- Cosmetics ---
export type CosmeticCategory =
  | 'avatar_collection'
  | 'bracket_frame'
  | 'victory_effect'
  | 'profile_banner'
  | 'nickname_color'
  | 'booster'
  | 'organizer_booster'
  | 'emote'
  | 'tournament_theme';

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: CosmeticCategory;
  price: number;
  image_preview: string | null;
  rarity: CosmeticRarity;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface UserCosmetic {
  id: string;
  user_email: string;
  item_id: string;
  is_equipped: boolean;
  purchased_at: string;
  // Joined
  item?: CosmeticItem;
}

// --- Exploration Quests ---
export type QuestCategory =
  | 'onboarding'
  | 'social'
  | 'competitive'
  | 'organizing'
  | 'discovery';

export type QuestValidationType =
  | 'profile_complete'
  | 'first_tournament_join'
  | 'first_tournament_create'
  | 'first_match_played'
  | 'avatar_uploaded'
  | 'social_linked'
  | 'event_visited'
  | 'bracket_viewed'
  | 'first_badge_earned'
  | 'five_tournaments_joined'
  | 'first_cosmetic_bought'
  | 'share_tournament'
  | 'manual';

export interface ExplorationQuest {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  reward_amount: number;
  category: QuestCategory;
  validation_type: QuestValidationType;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface UserQuestProgress {
  id: string;
  user_email: string;
  quest_id: string;
  completed_at: string;
  reward_claimed: boolean;
  reward_claimed_at: string | null;
  // Joined
  quest?: ExplorationQuest;
}

// --- Coin Packages (real money purchase) ---
export interface CoinPackage {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coin_amount: number;
  bonus_amount: number;
  price_mxn: number;
  original_price_mxn?: number;
  is_subscriber_discount?: boolean;
  stripe_price_id: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

// --- Tournament Unlock ---
export type TournamentUnlockType =
  | 'player_cap_64'
  | 'player_cap_128'
  | 'player_cap_256'
  | 'station_manager'
  | 'ai_referee'
  | 'featured_spot';

export interface TournamentCoinUnlock {
  id: string;
  tournament_id: string;
  user_email: string;
  unlock_type: TournamentUnlockType;
  cost: number;
  created_at: string;
}

// --- Reward amounts (config) ---
export const COIN_REWARDS = {
  WELCOME_BONUS: 50,
  DAILY_ALLOWANCE: 10,
  PLAY_COMPLETE_TOURNAMENT: 25,
  PLAY_WIN_MATCH: 10,
  PLAY_WIN_TOURNAMENT: 100,
  ORGANIZE_SUCCESS: 150,
} as const;

// --- Spending costs ---
export const COIN_COSTS = {
  PLAYER_CAP_64: 100,   // 33-64 players
  PLAYER_CAP_128: 250,  // 65-128 players
  PLAYER_CAP_256: 500,  // 129-256 players
  STATION_MANAGER: 200,
  AI_REFEREE: 150,
  FEATURED_SPOT: 300,
} as const;

// --- Rarity colors ---
export const RARITY_COLORS: Record<CosmeticRarity, { bg: string; text: string; border: string }> = {
  common: { bg: 'bg-zinc-500/20', text: 'text-zinc-300', border: 'border-zinc-500' },
  rare: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500' },
  epic: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500' },
  legendary: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500' },
};

export const RARITY_LABELS: Record<CosmeticRarity, string> = {
  common: 'Común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
};

// --- Category labels & icons ---
export const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  avatar_collection: 'Avatares',
  bracket_frame: 'Marcos',
  victory_effect: 'Efectos de Victoria',
  profile_banner: 'Banners',
  nickname_color: 'Color de Nombre',
  booster: 'Potenciadores',
  organizer_booster: 'Potenciadores',
  emote: 'Emotes',
  tournament_theme: 'Temas de Torneo',
};

export const CATEGORY_ICONS: Record<CosmeticCategory, string> = {
  avatar_collection: '👤',
  bracket_frame: '🖼️',
  victory_effect: '✨',
  profile_banner: '🏞️',
  nickname_color: '🎨',
  booster: '⚡',
  organizer_booster: '⚡',
  emote: '😎',
  tournament_theme: '🎭',
};
