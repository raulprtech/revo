"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap, X } from "lucide-react";
import { PLANS } from "@/lib/plans";

/**
 * Compact pricing section to embed in the home page or other pages.
 * Shows both plans side by side with key highlights and CTA buttons.
 */
export function PricingPreview() {
  const communityPlan = PLANS[0];
  const proPlan = PLANS[1];

  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <Badge variant="secondary">Planes</Badge>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
            Gratis para empezar. Plus para crecer.
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
            Organiza torneos ilimitados sin costo, o desbloquea herramientas profesionales para venues y eventos con sponsors.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {/* Community Card */}
          <Card className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{communityPlan.badge}</span>
                <h3 className="text-xl font-bold">{communityPlan.name}</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground text-sm">/siempre</span>
              </div>
              <ul className="space-y-2 mb-6">
                {communityPlan.highlights.slice(0, 4).map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-400 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/signup">
                  {communityPlan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Pro Card */}
          <Card className="bg-card border-primary/50 hover:border-primary transition-colors relative shadow-lg shadow-primary/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs">
                Popular
              </Badge>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{proPlan.badge}</span>
                <h3 className="text-xl font-bold">{proPlan.name}</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">${proPlan.price}</span>
                <span className="text-muted-foreground text-sm">/mes</span>
              </div>
              <ul className="space-y-2 mb-6">
                {proPlan.highlights.slice(0, 4).map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full">
                <Link href="/signup">
                  {proPlan.cta} <Zap className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button asChild variant="link" className="text-muted-foreground hover:text-primary">
            <Link href="/pricing">
              Ver comparación completa <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
