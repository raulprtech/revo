import useSWR, { mutate } from "swr";
import { db, type Tournament, type Participant } from "@/lib/database";
import { useAuth } from "@/lib/supabase/auth-context";

// Cache keys
export const CACHE_KEYS = {
  publicTournaments: "tournaments:public",
  tournament: (id: string) => `tournament:${id}`,
  userTournaments: (email: string) => `tournaments:user:${email}`,
  participants: (tournamentId: string) => `participants:${tournamentId}`,
} as const;

// SWR configuration for optimal caching
const swrConfig = {
  revalidateOnFocus: false, // Don't refetch when window regains focus
  revalidateOnReconnect: true, // Refetch when reconnecting
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 3,
};

// Hook for public tournaments list
export function usePublicTournaments() {
  const { data, error, isLoading, mutate: revalidate } = useSWR(
    CACHE_KEYS.publicTournaments,
    () => db.getPublicTournaments(),
    {
      ...swrConfig,
      refreshInterval: 30000, // Refresh every 30 seconds for public list
    }
  );

  return {
    tournaments: data ?? [],
    isLoading,
    error,
    refresh: revalidate,
  };
}

// Hook for a single tournament
export function useTournament(id: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR(
    id ? CACHE_KEYS.tournament(id) : null,
    async () => {
      if (!id) return null;
      const result = await db.getTournament(id);
      return result.tournament;
    },
    {
      ...swrConfig,
      revalidateOnFocus: true, // Revalidate single tournament on focus
    }
  );

  return {
    tournament: data ?? null,
    isLoading,
    error,
    refresh: revalidate,
  };
}

// Hook for user's tournaments (owned and participating)
export function useUserTournaments() {
  const { user } = useAuth();
  
  const { data, error, isLoading, mutate: revalidate } = useSWR(
    user?.email ? CACHE_KEYS.userTournaments(user.email) : null,
    async () => {
      if (!user?.email) return { owned: [], participating: [] };
      return db.getUserAccessibleTournaments(user.email);
    },
    {
      ...swrConfig,
      revalidateOnFocus: true,
    }
  );

  return {
    ownedTournaments: data?.owned ?? [],
    participatingTournaments: data?.participating ?? [],
    allTournaments: [...(data?.owned ?? []), ...(data?.participating ?? [])],
    isLoading,
    error,
    refresh: revalidate,
  };
}

// Hook for tournament participants
export function useParticipants(tournamentId: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR(
    tournamentId ? CACHE_KEYS.participants(tournamentId) : null,
    async () => {
      if (!tournamentId) return [];
      return db.getParticipants(tournamentId);
    },
    {
      ...swrConfig,
      revalidateOnFocus: true,
    }
  );

  return {
    participants: data ?? [],
    isLoading,
    error,
    refresh: revalidate,
  };
}

// Hook to check if user is participating in a tournament
export function useIsParticipating(tournamentId: string | null) {
  const { user } = useAuth();
  
  const { data, error, isLoading } = useSWR(
    tournamentId && user?.email 
      ? `participating:${tournamentId}:${user.email}` 
      : null,
    async () => {
      if (!tournamentId || !user?.email) return false;
      return db.isUserParticipating(tournamentId, user.email);
    },
    swrConfig
  );

  return {
    isParticipating: data ?? false,
    isLoading,
    error,
  };
}

// Utility functions to invalidate cache
export const invalidateCache = {
  publicTournaments: () => mutate(CACHE_KEYS.publicTournaments),
  tournament: (id: string) => mutate(CACHE_KEYS.tournament(id)),
  userTournaments: (email: string) => mutate(CACHE_KEYS.userTournaments(email)),
  participants: (tournamentId: string) => mutate(CACHE_KEYS.participants(tournamentId)),
  all: () => {
    // Clear all tournament-related cache
    mutate(
      (key) => typeof key === "string" && (
        key.startsWith("tournament") || 
        key.startsWith("participants") ||
        key.startsWith("participating")
      ),
      undefined,
      { revalidate: true }
    );
  },
};

// Optimistic update helpers
export async function createTournamentOptimistic(
  tournamentData: Parameters<typeof db.createTournament>[0],
  userEmail: string
) {
  const tournament = await db.createTournament(tournamentData);
  
  // Invalidate relevant caches
  await Promise.all([
    invalidateCache.publicTournaments(),
    invalidateCache.userTournaments(userEmail),
  ]);
  
  return tournament;
}

export async function updateTournamentOptimistic(
  id: string,
  updates: Parameters<typeof db.updateTournament>[1],
  userEmail: string
) {
  const tournament = await db.updateTournament(id, updates);
  
  // Invalidate relevant caches
  await Promise.all([
    invalidateCache.tournament(id),
    invalidateCache.publicTournaments(),
    invalidateCache.userTournaments(userEmail),
  ]);
  
  return tournament;
}

export async function deleteTournamentOptimistic(id: string, userEmail: string) {
  await db.deleteTournament(id);
  
  // Invalidate relevant caches
  await Promise.all([
    invalidateCache.tournament(id),
    invalidateCache.publicTournaments(),
    invalidateCache.userTournaments(userEmail),
  ]);
}

export async function joinTournamentOptimistic(
  tournamentId: string,
  participant: Parameters<typeof db.addParticipant>[0]
) {
  const result = await db.addParticipant(participant);
  
  // Invalidate relevant caches
  await Promise.all([
    invalidateCache.participants(tournamentId),
    invalidateCache.tournament(tournamentId),
    invalidateCache.publicTournaments(),
    participant.email && invalidateCache.userTournaments(participant.email),
  ]);
  
  return result;
}
