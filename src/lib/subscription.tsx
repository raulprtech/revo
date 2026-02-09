"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth-context";
import type { PlanTier } from "@/lib/plans";

// =============================================
// TYPES
// =============================================

export interface Subscription {
  id: string;
  user_email: string;
  plan: PlanTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  trial_end?: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  plan: PlanTier;
  isPro: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Check if a specific tournament has Pro features (via subscription OR legacy purchase) */
  isTournamentPro: (tournament: { is_legacy_pro?: boolean }) => boolean;
}

// =============================================
// CONTEXT
// =============================================

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  plan: 'community',
  isPro: false,
  isLoading: true,
  refresh: async () => {},
  isTournamentPro: () => false,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

// =============================================
// PROVIDER
// =============================================

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user?.email) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_email', user.email)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Table might not exist yet — graceful fallback
        console.warn('Could not fetch subscription:', error.message);
        setSubscription(null);
      } else {
        setSubscription(data);
      }
    } catch (err) {
      console.warn('Subscription fetch error:', err);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Real-time sync: listen for subscription changes via Supabase Realtime
  useEffect(() => {
    if (!user?.email) return;

    const supabase = createClient();
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_email=eq.${user.email}`,
        },
        () => {
          // Refetch subscription when any change is detected
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, fetchSubscription]);

  const plan: PlanTier = subscription?.plan ?? 'community';
  const isPro = plan === 'plus';

  const isTournamentPro = useCallback(
    (tournament: { is_legacy_pro?: boolean }) => {
      return isPro || !!tournament.is_legacy_pro;
    },
    [isPro]
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan,
        isPro,
        isLoading,
        refresh: fetchSubscription,
        isTournamentPro,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// =============================================
// FEATURE GATE COMPONENT
// =============================================

interface ProFeatureGateProps {
  children: ReactNode;
  /** What to show when user doesn't have Pro */
  fallback?: ReactNode;
  /** If true, renders children but with a visual overlay/badge */
  showPreview?: boolean;
}

/**
 * Wraps Pro-only content.
 * - If user is Pro: renders children normally
 * - If user is Community: renders fallback or an upgrade prompt
 */
export function ProFeatureGate({ children, fallback, showPreview = false }: ProFeatureGateProps) {
  const { isPro, isLoading } = useSubscription();

  if (isLoading) {
    return <div className="animate-pulse bg-muted rounded-lg h-32" />;
  }

  if (isPro) {
    return <>{children}</>;
  }

  if (showPreview) {
    return (
      <div className="relative">
        <div className="opacity-40 pointer-events-none select-none blur-[1px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
          <ProUpgradePrompt />
        </div>
      </div>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <ProUpgradePrompt />;
}

/**
 * Inline upgrade prompt shown when a Pro feature is accessed by Community users
 */
export function ProUpgradePrompt({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <a
        href="/pricing"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
      >
        <span>⚡</span>
        <span>Disponible en Plus</span>
      </a>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <span className="text-4xl">⚡</span>
      <div>
        <h3 className="font-semibold text-lg">Función Plus</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Esta funcionalidad requiere el plan Organizer Plus
        </p>
      </div>
      <a
        href="/pricing"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Ver planes y precios
      </a>
    </div>
  );
}

// =============================================
// HOOK: Check specific feature access
// =============================================

type ProFeature =
  | 'station-manager'
  | 'prize-cash'
  | 'prize-auto-calculate'
  | 'entry-fees'
  | 'analytics-advanced'
  | 'analytics-retention'
  | 'export-csv'
  | 'bracket-branding'
  | 'sponsors'
  | 'custom-formats';

/**
 * Map of features to their required plan tier.
 * All features currently require Plus, but this map makes it easy to
 * add granular tiers (e.g., 'enterprise') or make specific features
 * available to Community in the future.
 */
const FEATURE_PLAN_REQUIREMENTS: Record<ProFeature, PlanTier> = {
  'station-manager': 'plus',
  'prize-cash': 'plus',
  'prize-auto-calculate': 'plus',
  'entry-fees': 'plus',
  'analytics-advanced': 'plus',
  'analytics-retention': 'plus',
  'export-csv': 'plus',
  'bracket-branding': 'plus',
  'sponsors': 'plus',
  'custom-formats': 'plus',
};

/**
 * Returns whether the current user can use a specific Pro feature.
 * Supports granular feature gating — each feature maps to a required plan.
 */
export function useCanUseFeature(feature: ProFeature): { allowed: boolean; isLoading: boolean } {
  const { plan, isLoading } = useSubscription();
  const requiredPlan = FEATURE_PLAN_REQUIREMENTS[feature];

  // Community plan (tier 0) < Plus (tier 1)
  const PLAN_TIERS: Record<PlanTier, number> = { community: 0, plus: 1 };
  const allowed = PLAN_TIERS[plan] >= PLAN_TIERS[requiredPlan];

  return { allowed, isLoading };
}
