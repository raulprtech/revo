"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Mail, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PendingConsentPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Periodically check if consent has been verified
  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshUser();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [refreshUser]);

  // If consent was verified, redirect
  useEffect(() => {
    if (user && !user.isMinor) {
      router.push("/profile");
    }
    
    // Check user_metadata directly for verified status
    const checkVerification = async () => {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.user_metadata?.parental_consent_verified === true) {
        router.push("/profile");
      }
    };
    
    checkVerification();
  }, [user, router]);

  const handleCheckStatus = async () => {
    setChecking(true);
    await refreshUser();
    
    const supabase = createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (supabaseUser?.user_metadata?.parental_consent_verified === true) {
      router.push("/profile");
    }
    
    setChecking(false);
  };

  const handleResendEmail = async () => {
    if (!user) return;
    setResending(true);

    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (!supabaseUser) return;

      const meta = supabaseUser.user_metadata || {};
      
      const response = await fetch("/api/parental-consent/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentEmail: meta.parent_email,
          parentFullName: meta.parent_full_name,
          childName: meta.full_name || `${meta.first_name} ${meta.last_name}`,
          childEmail: supabaseUser.email,
          userId: supabaseUser.id,
        }),
      });

      if (response.ok) {
        setResent(true);
        setTimeout(() => setResent(false), 10000);
      }
    } catch (error) {
      console.error("Error resending consent email:", error);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldAlert className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <CardTitle className="text-xl">Esperando Autorización Parental</CardTitle>
          <CardDescription className="text-base">
            Tu cuenta requiere la autorización de tu padre, madre o tutor legal para ser activada completamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Se envió un correo de verificación a tu padre/madre/tutor
              </p>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Pídele a tu padre, madre o tutor que revise su correo electrónico y haga clic en el 
              enlace de autorización. Hasta entonces, tu cuenta tendrá funcionalidad limitada.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleCheckStatus}
              disabled={checking}
            >
              {checking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar Estado de Autorización"
              )}
            </Button>

            <Button 
              className="w-full" 
              variant="secondary"
              onClick={handleResendEmail}
              disabled={resending || resent}
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : resent ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Correo reenviado
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Reenviar correo al padre/tutor
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            El enlace de verificación expira en 7 días. Si tu padre/madre/tutor no recibe el correo, 
            puede revisar la carpeta de spam o solicitar un reenvío.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
