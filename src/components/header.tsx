
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/auth/user-nav";
import { Swords } from "lucide-react";

type User = {
  displayName: string;
  email: string;
  photoURL: string;
};

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        setUser(null);
    } finally {
        setLoading(false);
    }

    const handleStorageChange = () => {
        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage on storage event", error);
            setUser(null);
        }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    }

  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center">
        <div className="mr-8 flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <Swords className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">TournaVerse</span>
          </Link>
          <nav className="hidden md:flex">
             <Link href="/tournaments" className="text-sm font-medium text-muted-foreground hover:text-foreground">
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
