"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { CoinWallet } from "@/types/coins";

// =============================================
// COINS CONTEXT — Real-time wallet state
// =============================================

interface CoinsContextType {
  wallet: CoinWallet | null;
  balance: number;
  isLoading: boolean;
  dailyAvailable: boolean;
  refresh: () => Promise<void>;
  claimDaily: () => Promise<{ success: boolean; error?: string }>;
}

const CoinsContext = createContext<CoinsContextType>({
  wallet: null,
  balance: 0,
  isLoading: true,
  dailyAvailable: false,
  refresh: async () => {},
  claimDaily: async () => ({ success: false }),
});

export function useCoins() {
  return useContext(CoinsContext);
}

export function CoinsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<CoinWallet | null>(null);
  const [dailyAvailable, setDailyAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!user?.email) {
      setWallet(null);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // Get or create wallet
      let { data: walletData, error } = await supabase
        .from('coin_wallets')
        .select('*')
        .eq('user_email', user.email)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch wallet:', error.message);
        setWallet(null);
        setIsLoading(false);
        return;
      }

      if (!walletData) {
        // Create wallet for new user — with welcome bonus
        const welcomeBonus = 50;
        const { data: newWallet } = await supabase
          .from('coin_wallets')
          .insert({ user_email: user.email, balance: welcomeBonus, lifetime_earned: welcomeBonus })
          .select()
          .single();
        walletData = newWallet;
      }

      setWallet(walletData);

      // Check daily allowance
      if (walletData?.daily_allowance_claimed_at) {
        const lastClaim = new Date(walletData.daily_allowance_claimed_at);
        const now = new Date();
        setDailyAvailable(
          lastClaim.getFullYear() !== now.getFullYear() ||
          lastClaim.getMonth() !== now.getMonth() ||
          lastClaim.getDate() !== now.getDate()
        );
      } else {
        setDailyAvailable(true);
      }
    } catch (err) {
      console.warn('Wallet fetch error:', err);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Real-time subscription for wallet changes
  useEffect(() => {
    if (!user?.email) return;

    const supabase = createClient();
    const channel = supabase
      .channel('coin-wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coin_wallets',
          filter: `user_email=eq.${user.email}`,
        },
        (payload) => {
          if (payload.new) {
            setWallet(payload.new as CoinWallet);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const claimDaily = useCallback(async () => {
    if (!user?.email || !wallet) return { success: false, error: 'No autenticado' };

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/coins/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'claim_daily' }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error };
      }

      setDailyAvailable(false);
      await fetchWallet();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Error de conexión' };
    }
  }, [user?.email, wallet, fetchWallet]);

  return (
    <CoinsContext.Provider
      value={{
        wallet,
        balance: wallet?.balance || 0,
        isLoading,
        dailyAvailable,
        refresh: fetchWallet,
        claimDaily,
      }}
    >
      {children}
    </CoinsContext.Provider>
  );
}
