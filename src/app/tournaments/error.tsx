"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Gamepad2 } from "lucide-react";

export default function TournamentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Tournaments error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Error al cargar torneos</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        No pudimos cargar la información de torneos. Esto puede ser un problema
        temporal.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4">
          Código: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>Intentar de nuevo</Button>
        <Button variant="outline" asChild>
          <Link href="/tournaments">
            <Gamepad2 className="mr-2 h-4 w-4" />
            Volver a torneos
          </Link>
        </Button>
      </div>
    </div>
  );
}
