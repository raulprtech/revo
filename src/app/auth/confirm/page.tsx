// Auth callback handler for email confirmation and OAuth
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function AuthCallbackContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verificando tu cuenta...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Create client inside useEffect to avoid SSR issues
        const supabase = createClient();
        
        // Supabase maneja automáticamente el token de la URL
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error en callback de autenticación:", error);
          setStatus("error");
          setMessage("Hubo un problema al verificar tu cuenta. El enlace puede haber expirado.");
          
          toast({
            title: "Error de verificación",
            description: "El enlace de verificación puede haber expirado. Intenta registrarte de nuevo.",
            variant: "destructive",
          });
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => router.push("/login"), 3000);
          return;
        }

        if (data.session?.user) {
          // Usuario verificado y con sesión activa
          // AuthProvider detectará la sesión automáticamente via onAuthStateChange

          setStatus("success");
          setMessage("¡Tu correo ha sido verificado exitosamente!");
          
          toast({
            title: "¡Cuenta verificada!",
            description: "Tu cuenta ha sido activada. Bienvenido a TournaVerse.",
          });
          
          // Redirigir al perfil después de 2 segundos
          setTimeout(() => router.push("/profile"), 2000);
        } else {
          // No hay sesión pero el callback fue procesado
          // Esto puede pasar si el email fue confirmado pero el usuario no inició sesión
          setStatus("success");
          setMessage("¡Tu correo ha sido verificado! Ahora puedes iniciar sesión.");
          
          // Redirigir al login con parámetro de confirmación
          setTimeout(() => router.push("/login?confirmed=true"), 2000);
        }
      } catch (err) {
        console.error("Error inesperado en callback:", err);
        setStatus("error");
        setMessage("Ocurrió un error inesperado. Por favor, intenta de nuevo.");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    handleAuthCallback();
  }, [router, toast]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="text-center space-y-4 p-8">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground text-lg">{message}</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-green-600 dark:text-green-400 text-lg font-medium">{message}</p>
            <p className="text-muted-foreground text-sm">Redirigiendo...</p>
          </>
        )}
        
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <p className="text-red-600 dark:text-red-400 text-lg font-medium">{message}</p>
            <p className="text-muted-foreground text-sm">Redirigiendo al inicio de sesión...</p>
          </>
        )}
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="text-center space-y-4 p-8">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground text-lg">Cargando...</p>
      </div>
    </div>
  );
}

// Main export wrapped in Suspense to handle client-side rendering properly
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}