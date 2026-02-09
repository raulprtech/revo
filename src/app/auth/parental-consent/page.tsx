"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import Link from "next/link";

type ConsentStatus = "loading" | "confirming" | "approved" | "revoked" | "error" | "expired";

function ParentalConsentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const actionParam = searchParams.get("action"); // 'revoke' from email link
  const [status, setStatus] = useState<ConsentStatus>("loading");
  const [childName, setChildName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No se proporcionó un token de verificación válido.");
      return;
    }
    // If action=revoke from email, go directly to confirming revocation
    if (actionParam === "revoke") {
      setStatus("confirming");
    } else {
      setStatus("confirming");
    }
  }, [token, actionParam]);

  const handleAction = async (action: "approve" | "revoke") => {
    setStatus("loading");
    try {
      const response = await fetch("/api/parental-consent/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          setStatus("expired");
          setErrorMessage(data.error);
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Error al procesar la solicitud");
        }
        return;
      }

      setChildName(data.childName || "");
      if (data.action === "approved") {
        setStatus("approved");
      } else if (data.action === "revoked") {
        setStatus("revoked");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Error de conexión. Intenta de nuevo más tarde.");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Procesando solicitud...</p>
        </div>
      </div>
    );
  }

  if (status === "error" || status === "expired") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-600">
              {status === "expired" ? "Enlace Expirado" : "Error"}
            </CardTitle>
            <CardDescription className="text-base">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button variant="outline">Volver al Inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-green-700 dark:text-green-400">
              ¡Consentimiento Verificado!
            </CardTitle>
            <CardDescription className="text-base">
              Ha autorizado exitosamente la cuenta de <strong>{childName}</strong> en Duels Esports.
              El menor ahora puede acceder a todas las funcionalidades de la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>Recuerde:</strong> Como padre/madre/tutor puede en cualquier momento 
                solicitar la revisión o eliminación de los datos del menor contactándonos 
                desde el correo electrónico con el que se registró como responsable.
              </p>
            </div>
            <div className="text-center">
              <Link href="/">
                <Button>Ir a Duels Esports</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "revoked") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldX className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-600">
              Consentimiento No Autorizado
            </CardTitle>
            <CardDescription className="text-base">
              Ha decidido no autorizar la cuenta de <strong>{childName}</strong>. 
              La cuenta será eliminada junto con todos los datos recopilados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                Todos los datos personales del menor serán eliminados de nuestra plataforma 
                en un plazo máximo de 7 días. Si fue un error, puede contactarnos para revertir esta acción.
              </p>
            </div>
            <div className="text-center">
              <Link href="/">
                <Button variant="outline">Ir a Duels Esports</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Confirming state - show approval/revoke buttons
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <ShieldAlert className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <CardTitle className="text-xl">
            Verificación de Consentimiento Parental
          </CardTitle>
          <CardDescription className="text-base">
            {actionParam === "revoke" 
              ? "¿Está seguro de que desea revocar la autorización para esta cuenta?"
              : "Un menor ha solicitado su autorización para crear una cuenta en Duels Esports."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm space-y-2">
            <p><strong>Al autorizar esta cuenta, usted acepta que:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
              <li>Se recopilarán datos del menor (nombre, fecha de nacimiento, género, email)</li>
              <li>Los datos podrán compartirse con organizadores de torneos para gestión de eventos</li>
              <li>Los datos podrán compartirse con patrocinadores con fines promocionales</li>
              <li>Puede revocar este consentimiento en cualquier momento</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {actionParam !== "revoke" && (
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700" 
                size="lg"
                onClick={() => handleAction("approve")}
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Autorizar Cuenta
              </Button>
            )}
            <Button 
              variant="destructive" 
              className="flex-1" 
              size="lg"
              onClick={() => handleAction("revoke")}
            >
              <XCircle className="mr-2 h-5 w-5" />
              {actionParam === "revoke" ? "Confirmar Revocación" : "No Autorizo"}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Si no reconoce esta solicitud, puede cerrar esta página de forma segura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ParentalConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <ParentalConsentContent />
    </Suspense>
  );
}
