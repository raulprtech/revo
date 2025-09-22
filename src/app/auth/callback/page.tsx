// Temporarily disabled OAuth callback
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login since OAuth is temporarily disabled
    router.push("/login");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">OAuth temporalmente deshabilitado. Redirigiendo...</p>
      </div>
    </div>
  );
}

// Original OAuth callback code (temporarily commented out)
/*
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          toast({
            title: "Error de Autenticación",
            description: "Hubo un problema al iniciar sesión. Inténtalo de nuevo.",
            variant: "destructive",
          });
          router.push("/login");
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;
          const userData = {
            displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
            email: user.email || '',
            photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
          };

          localStorage.setItem('user', JSON.stringify(userData));

          // Trigger storage event for header to update
          window.dispatchEvent(new Event('storage'));

          toast({
            title: "Inicio de Sesión Exitoso",
            description: "Bienvenido a TournaVerse!",
          });

          router.push("/profile");
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast({
          title: "Error de Autenticación",
          description: "Hubo un problema al procesar tu inicio de sesión.",
          variant: "destructive",
        });
        router.push("/login");
      }
    };

    handleAuthCallback();
  }, [router, supabase, toast]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="text-center space-y-4">
        <Loader2 className="h-16 w-16 animate-spin mx-auto" />
        <p className="text-muted-foreground">Completando tu inicio de sesión...</p>
      </div>
    </div>
  );
}
*/