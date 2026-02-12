"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap, X } from "lucide-react";
import { PLANS as STATIC_PLANS, type Plan } from "@/lib/plans";
import { useEffect, useState } from "react";
import { db } from "@/lib/database";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Compact pricing section to embed in the home page or other pages.
 * Shows both plans side by side with key highlights and CTA buttons.
 */
export function PricingPreview() {
  const [plans, setPlans] = useState<Plan[]>(STATIC_PLANS);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    async function loadPlans() {
      try {
        const dbPlans = await db.getSubscriptionPlans();
        if (dbPlans && dbPlans.length > 0) {
          const mappedPlans: Plan[] = dbPlans.map(p => ({
            id: p.id as any,
            name: p.name,
            tagline: p.tagline,
            price: Number(p.price),
            currency: p.currency,
            billingPeriod: p.billing_period as any,
            badge: p.badge,
            highlights: p.highlights,
            cta: p.cta_text,
            ctaVariant: p.cta_variant as any,
            popular: p.is_popular,
            order_index: p.order_index
          }));
          setPlans(mappedPlans);
        }
      } catch (err) {
        console.error("Error loading plans for preview:", err);
      }
    }
    loadPlans();
  }, []);

  const getGroupedTiers = () => {
    const groups: Record<string, any> = {};
    plans.forEach(plan => {
      let tierId = plan.id;
      if (plan.id.startsWith('plus_')) tierId = 'plus';
      else if (plan.id.includes('_')) tierId = plan.id.split('_')[0];

      if (!groups[tierId]) {
        groups[tierId] = {
          id: tierId,
          name: plan.name.replace(' Anual', '').replace(' Mensual', '').replace(' Pago por Evento', ''),
          badge: plan.badge,
          highlights: plan.highlights || [],
          popular: plan.popular,
          order_index: (plan as any).order_index ?? 0,
          variants: {}
        };
      }
      
      const period = plan.billingPeriod === 'free' ? 'monthly' : plan.billingPeriod;
      if (plan.billingPeriod === 'free') {
        groups[tierId].variants['monthly'] = plan;
        groups[tierId].variants['yearly'] = plan;
      } else {
        groups[tierId].variants[period as any] = plan;
      }
    });

    // Auto-calculate yearly if missing
    Object.values(groups).forEach((group: any) => {
      if (group.id !== 'community' && !group.variants.yearly && group.variants.monthly) {
        group.variants.yearly = { ...group.variants.monthly, price: Math.round(group.variants.monthly.price * 12 * 0.8) };
      }
    });

    return Object.values(groups).sort((a: any, b: any) => a.order_index - b.order_index);
  };

  const groupedTiers = getGroupedTiers();

  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
          <Badge variant="secondary">Planes</Badge>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
            Gratis para empezar. Plus para crecer.
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
            Organiza torneos ilimitados sin costo, o desbloquea herramientas profesionales.
          </p>
          
          <Tabs 
            value={billingInterval} 
            onValueChange={(v: any) => setBillingInterval(v)}
            className="w-full max-w-[200px] mt-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Mensual</TabsTrigger>
              <TabsTrigger value="yearly">Anual</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {groupedTiers.slice(0, 2).map((tier) => {
            const currentPlan = tier.variants[billingInterval] || tier.variants['monthly'];
            const isFree = currentPlan.price === 0;

            return (
              <Card key={tier.id} className={`bg-card border-border transition-all ${tier.popular ? "border-primary/50 shadow-lg shadow-primary/5 relative scale-105 z-10" : "hover:border-primary/30"}`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs">
                      Popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{tier.badge}</span>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold">${currentPlan.price}</span>
                    <span className="text-muted-foreground text-sm">
                      {isFree ? "/siempre" : billingInterval === 'yearly' ? "/año" : "/mes"}
                    </span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {(currentPlan.highlights || tier.highlights).slice(0, 4).map((h: string) => (
                      <li key={h} className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${isFree ? "text-green-400" : "text-primary"} shrink-0`} />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={isFree ? "outline" : "default"} className="w-full">
                    <Link href="/signup">
                      {isFree ? "Empezar Gratis" : "Probar Plus"} 
                      {isFree ? <ArrowRight className="ml-2 h-4 w-4" /> : <Zap className="ml-2 h-4 w-4" />}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
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
