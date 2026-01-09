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
};

type AuthContextType = {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get a safe avatar URL (no base64)
function getSafeAvatarUrl(user: User): string {
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  
  // If avatar_url is base64 data, use generated avatar instead
  if (avatarUrl && avatarUrl.startsWith('data:')) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
  }
  
  // If it's a valid URL, use it
  if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
    return avatarUrl;
  }
  
  // Default to generated avatar
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
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
  };
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
        localStorage.removeItem("user");
        return;
      }

      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error refreshing user:", error);
        setUser(null);
        localStorage.removeItem("user");
        return;
      }
      const appUser = mapSupabaseUser(supabaseUser);
      setUser(appUser);
      
      if (appUser) {
        localStorage.setItem("user", JSON.stringify(appUser));
      } else {
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Unexpected error refreshing user:", error);
      setUser(null);
      localStorage.removeItem("user");
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
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage"));
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
          if (appUser) {
            localStorage.setItem("user", JSON.stringify(appUser));
          }
        } else {
          // Clear any stale localStorage
          localStorage.removeItem("user");
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
          if (appUser) {
            localStorage.setItem("user", JSON.stringify(appUser));
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          localStorage.removeItem("user");
        }
        
        window.dispatchEvent(new Event("storage"));
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
