"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Algo salió mal</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Ocurrió un error inesperado. Puedes intentar recargar la página o volver
        al inicio.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4">
          Código: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>Intentar de nuevo</Button>
        <Button variant="outline" asChild>
          <a href="/">Ir al inicio</a>
        </Button>
      </div>
    </div>
  );
}
