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
  // This is a mock auth state. In a real app, you'd use Firebase Auth context.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate fetching auth state
    const timer = setTimeout(() => {
      // To test both states, you can toggle this value
      const isLoggedIn = false;
      if (isLoggedIn) {
        setUser({
          displayName: "Test User",
          email: "test@example.com",
          photoURL: "https://placehold.co/40x40.png"
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="container flex h-16 items-center">
        <div className="mr-8 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Swords className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">TournaVerse</span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          {loading ? (
             <div className="h-8 w-24 bg-muted rounded-md animate-pulse" />
          ) : user ? (
            <UserNav user={user} />
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
