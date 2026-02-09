"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CheckCircle2, Zap, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/lib/subscription";

export default function UpgradeSuccessPage() {
  const router = useRouter();
  const { refresh, isPro } = useSubscription();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Refresh subscription data
    refresh();
    // Hide confetti after 4 seconds
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [refresh]);

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti-like animated background */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            >
              {["⚡", "🎮", "🏆", "✨", "🎉"][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <Card className="max-w-lg w-full text-center border-primary/50 shadow-xl shadow-primary/10">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4 relative">
            <div className="p-4 bg-primary/20 rounded-full">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold">¡Bienvenido a Plus! ⚡</h1>
          <p className="text-muted-foreground mt-2">
            Tu upgrade a Organizer Plus se ha completado exitosamente.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center justify-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Ya puedes usar todas las funciones Plus
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-left">
              {[
                "Station Manager",
                "Premios en efectivo",
                "Cobro de entry fees",
                "Analítica avanzada",
                "Validación por IA",
                "Branding personalizado",
                "Exportación CSV",
                "Soporte prioritario",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Tu período de prueba gratuita de 14 días ha comenzado. No se realizará
            ningún cobro hasta que finalice.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/dashboard">
              Ir al Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/tournaments/create">
              Crear mi primer torneo Plus
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
