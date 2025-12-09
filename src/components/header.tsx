"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/auth/user-nav";
import { Swords, Trophy, Gamepad2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";

export function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center">
        <div className="mr-8 flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <Swords className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">TournaVerse</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/events" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Trophy className="h-4 w-4" />
              Eventos
            </Link>
            <Link href="/tournaments" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Gamepad2 className="h-4 w-4" />
              Torneos
            </Link>
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          {loading ? (
             <div className="h-8 w-24 bg-muted rounded-md animate-pulse" />
          ) : user ? (
            <UserNav user={user} />
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Registrarse</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}