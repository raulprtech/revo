"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mail, CheckCircle, Loader2 } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "true";
  const emailConfirmed = searchParams.get("confirmed") === "true";

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Banner cuando el usuario acaba de registrarse */}
      {justRegistered && (
        <div className="w-full max-w-md mx-auto mt-6 px-4">
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <Mail className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">
              ¡Revisa tu correo electrónico!
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              Te hemos enviado un enlace de verificación a tu correo electrónico. 
              <strong> Debes hacer clic en ese enlace para activar tu cuenta</strong> antes de poder iniciar sesión.
              <br /><br />
              <span className="text-sm">
                💡 Si no ves el correo, revisa tu carpeta de spam o correo no deseado.
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Banner cuando el email fue confirmado exitosamente */}
      {emailConfirmed && (
        <div className="w-full max-w-md mx-auto mt-6 px-4">
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">
              ¡Correo verificado exitosamente!
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Tu cuenta ha sido activada. Ahora puedes iniciar sesión con tu correo y contraseña.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <AuthForm mode="login" />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
