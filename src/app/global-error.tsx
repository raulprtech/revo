"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="es" className="dark" style={{ colorScheme: "dark" }}>
      <body className="min-h-screen bg-[hsl(224,71.4%,4.1%)] text-[hsl(210,20%,98%)] flex items-center justify-center font-sans antialiased">
        <div className="text-center space-y-6 px-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">Algo salió muy mal</h1>
          <p className="text-[hsl(217.9,10.6%,64.9%)] max-w-md mx-auto">
            Ocurrió un error crítico en la aplicación. Nuestro equipo ha sido
            notificado.
          </p>
          {error.digest && (
            <p className="text-xs text-[hsl(217.9,10.6%,64.9%)]">
              Código de error: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-md bg-[hsl(22,96%,54%)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Intentar de nuevo
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-[hsl(215,27.9%,16.9%)] px-6 py-2.5 text-sm font-medium hover:bg-[hsl(215,27.9%,16.9%)] transition-colors"
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
