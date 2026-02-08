"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createClient } from "./client";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  // Extended profile fields
  firstName?: string;
  lastName?: string;
  nickname?: string;
  bio?: string;
  birthDate?: string;
  gender?: string;
  location?: string;
  country?: string;
  // Gaming
  favoriteGames?: string;
  gamingPlatforms?: string;
  discordUsername?: string;
  twitchUsername?: string;
  // Social
  twitterUsername?: string;
  instagramUsername?: string;
  youtubeChannel?: string;
  // Account deletion status
  pendingDeletion?: boolean;
  deletionRequestedAt?: string;
  // COPPA compliance fields
  isMinor?: boolean;
  parentEmail?: string;
  parentFullName?: string;
  parentalConsentAt?: string;
  dataSharingConsent?: boolean;
};

type AuthContextType = {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to build initials avatar URL from user's name
function getInitialsAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=6366f1,8b5cf6,ec4899,f43f5e,f97316,eab308,22c55e,06b6d4&fontFamily=Arial&fontSize=40`;
}

// Helper to get a safe avatar URL (no base64)
function getSafeAvatarUrl(user: User): string {
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  
  // If avatar_url is base64 data, use generated avatar instead
  if (avatarUrl && avatarUrl.startsWith('data:')) {
    const name = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email || 'User';
    return getInitialsAvatarUrl(name);
  }
  
  // If it's a valid URL, use it
  if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
    return avatarUrl;
  }
  
  // Default to initials avatar based on first name + last name
  const name = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email || 'User';
  return getInitialsAvatarUrl(name);
}

function mapSupabaseUser(user: User | null): AppUser | null {
  if (!user || !user.email) return null;
  
  const meta = user.user_metadata || {};
  
  return {
    id: user.id,
    email: user.email,
    displayName: meta.nickname || meta.full_name || meta.name || user.email.split("@")[0],
    photoURL: getSafeAvatarUrl(user),
    // Extended profile fields
    firstName: meta.first_name,
    lastName: meta.last_name,
    nickname: meta.nickname,
    bio: meta.bio,
    birthDate: meta.birth_date,
    gender: meta.gender,
    location: meta.location,
    country: meta.country,
    // Gaming
    favoriteGames: meta.favorite_games,
    gamingPlatforms: meta.gaming_platforms,
    discordUsername: meta.discord_username,
    twitchUsername: meta.twitch_username,
    // Social
    twitterUsername: meta.twitter_username,
    instagramUsername: meta.instagram_username,
    youtubeChannel: meta.youtube_channel,
    // Account deletion status
    pendingDeletion: meta.pending_deletion,
    deletionRequestedAt: meta.deletion_requested_at,
    // COPPA compliance fields
    isMinor: meta.is_minor,
    parentEmail: meta.parent_email,
    parentFullName: meta.parent_full_name,
    parentalConsentAt: meta.parental_consent_at,
    dataSharingConsent: meta.data_sharing_consent,
  };
}

/**
 * Ensure a profiles row exists for the user.
 * Creates one from auth metadata if missing.
 * This runs silently in the background on sign-in.
 */
async function ensureProfileExists(supabase: ReturnType<typeof createClient>, user: User) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!data) {
      const meta = user.user_metadata || {};
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        nickname: meta.nickname || null,
        first_name: meta.first_name || null,
        last_name: meta.last_name || null,
        full_name: meta.full_name || meta.name || null,
        birth_date: meta.birth_date || null,
        gender: meta.gender || null,
        location: meta.location || null,
      }, { onConflict: 'id' });
    }
  } catch (error) {
    // Non-critical: log but don't block the user
    console.warn('Could not auto-create profile row:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Start with true to wait for session check

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setUser(null);
        return;
      }

      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error refreshing user:", error);
        setUser(null);
        return;
      }
      const appUser = mapSupabaseUser(supabaseUser);
      setUser(appUser);
    } catch (error) {
      console.error("Unexpected error refreshing user:", error);
      setUser(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setUser(null);
      setSession(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          if (mounted) setLoading(false);
          return;
        }

        if (!mounted) return;

        setSession(initialSession);
        
        if (initialSession?.user) {
          const appUser = mapSupabaseUser(initialSession.user);
          setUser(appUser);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set a hard timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth initialization timed out");
        setLoading(false);
      }
    }, 3000);

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;
        
        setSession(newSession);
        
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const appUser = mapSupabaseUser(newSession?.user ?? null);
          setUser(appUser);

          // Auto-create profile row on first sign-in (if missing)
          if (event === "SIGNED_IN" && newSession?.user) {
            ensureProfileExists(supabase, newSession.user);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // Empty deps - only run once on mount

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
