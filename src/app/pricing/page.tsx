"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Check,
  X,
  Zap,
  Shield,
  Gamepad2,
  Monitor,
  Trophy,
  BarChart3,
  Bot,
  Palette,
  HeadphonesIcon,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  Landmark,
} from "lucide-react";
import {
  PLANS as STATIC_PLANS,
  PLAN_FEATURES,
  CATEGORY_LABELS,
  EVENT_PAYMENT_PLAN,
  type PlanFeature,
  type FeatureCategory,
  type Plan,
} from "@/lib/plans";
import { useAuth } from "@/lib/supabase/auth-context";
import { useSubscription } from "@/lib/subscription";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/database";
import { useEffect } from "react";

const CATEGORY_ICONS: Record<FeatureCategory, React.ReactNode> = {
  tournaments: <Gamepad2 className="h-5 w-5" />,
  social: <Users className="h-5 w-5" />,
  prizes: <Trophy className="h-5 w-5" />,
  hardware: <Monitor className="h-5 w-5" />,
  analytics: <BarChart3 className="h-5 w-5" />,
  ai: <Bot className="h-5 w-5" />,
  branding: <Palette className="h-5 w-5" />,
  support: <HeadphonesIcon className="h-5 w-5" />,
};

function FeatureStatusCell({ status }: { status: string }) {
  if (status === "included") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-400">
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (status === "excluded") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground">
        <X className="h-4 w-4" />
      </span>
    );
  }
  // Custom text (e.g., "Manual / Confianza", "Validación por IA")
  return (
    <span className="text-sm font-medium text-primary">{status}</span>
  );
}

function FeatureComparisonTable({ tiers }: { tiers: any[] }) {
  const [expandedCategories, setExpandedCategories] = useState<Set<FeatureCategory>>(
    new Set(Object.keys(CATEGORY_LABELS) as FeatureCategory[])
  );

  const toggleCategory = (category: FeatureCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const groupedFeatures = (Object.keys(CATEGORY_LABELS) as FeatureCategory[]).map(
    (category) => ({
      category,
      ...CATEGORY_LABELS[category],
      features: PLAN_FEATURES.filter((f) => f.category === category),
    })
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-4 px-4 font-semibold text-foreground min-w-[200px]">
              Característica
            </th>
            {tiers.map(tier => (
              <th key={tier.id} className="text-center py-4 px-4 font-semibold text-foreground min-w-[120px]">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm">{tier.badge}</span>
                  <span>{tier.name}</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">
                  {tier.variants.monthly?.price === 0 ? "Gratis" : `$${tier.variants.monthly?.price}/mes`}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupedFeatures.map(({ category, label, features }) => (
            <CategoryGroup
              key={category}
              category={category}
              label={label}
              features={features}
              isExpanded={expandedCategories.has(category)}
              onToggle={() => toggleCategory(category)}
              columnCount={tiers.length + 1}
              tiers={tiers}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryGroup({
  category,
  label,
  features,
  isExpanded,
  onToggle,
  columnCount,
  tiers,
}: {
  category: FeatureCategory;
  label: string;
  features: PlanFeature[];
  isExpanded: boolean;
  onToggle: () => void;
  columnCount: number;
  tiers: any[];
}) {
  return (
    <>
      <tr
        className="bg-card/50 cursor-pointer hover:bg-card transition-colors"
        onClick={onToggle}
      >
        <td colSpan={columnCount} className="py-3 px-4">
          <div className="flex items-center gap-3">
            <span className="text-primary">{CATEGORY_ICONS[category]}</span>
            <span className="font-semibold text-foreground">{label}</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
            )}
          </div>
        </td>
      </tr>
      {isExpanded &&
        features.map((feature) => (
          <tr
            key={feature.name}
            className="border-b border-border/50 hover:bg-card/30 transition-colors"
          >
            <td className="py-3 px-4 pl-12">
              <div>
                <p className="text-sm font-medium text-foreground">{feature.name}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </td>
            {tiers.map(tier => {
              // Extract status from highlights or fixed mapping
              let status: string = 'excluded';
              if (tier.id === 'community') status = feature.community;
              else if (tier.id === 'plus') status = feature.plus;
              else {
                // For custom plans, check if they have "Todo lo de..." in highlights
                const highlights = (tier.highlights || []).join(' ').toLowerCase();
                const isCommunity = highlights.includes('todo lo de community');
                const isPlus = highlights.includes('todo lo de organizer plus') || highlights.includes('todo lo de plus');
                
                if (isPlus) status = feature.plus;
                else if (isCommunity) status = feature.community;
                else status = 'excluded';
              }

              return (
                <td key={tier.id} className="py-3 px-4 text-center">
                  <FeatureStatusCell status={status} />
                </td>
              );
            })}
          </tr>
        ))}
    </>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(STATIC_PLANS);
  const { user } = useAuth();
  const { isPro, isLoading: subLoading } = useSubscription();
  const { toast } = useToast();
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly" | "event">("monthly");

  useEffect(() => {
    async function loadPlans() {
      try {
        const dbPlans = await db.getSubscriptionPlans();
        if (dbPlans && dbPlans.length > 0) {
          // Map DB schema to Plan interface
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
        console.error("Error loading plans:", err);
      }
    }
    loadPlans();
  }, []);

  // Grouping and Derivation Logic
  const getGroupedTiers = () => {
    const groups: Record<string, any> = {};
    
    plans.forEach(plan => {
      // Basic grouping: community, plus (from plus_monthly/plus_yearly/legacy_plus)
      let tierId = plan.id;
      if (plan.id.startsWith('plus_')) tierId = 'plus';
      else if (plan.id === 'legacy_plus') tierId = 'plus';
      else if (plan.id.includes('_')) tierId = plan.id.split('_')[0];

      if (!groups[tierId]) {
        groups[tierId] = {
          id: tierId,
          name: plan.name.replace(' Anual', '').replace(' Mensual', '').replace(' Pago por Evento', ''),
          tagline: plan.tagline,
          badge: plan.badge,
          highlights: plan.highlights || [],
          popular: plan.popular,
          order_index: (plan as any).order_index ?? 0,
          variants: {}
        };
      }
      
      const period = plan.billingPeriod === 'one-time' ? 'event' : 
                    (plan.billingPeriod === 'free' ? 'monthly' : plan.billingPeriod);
      
      // If it's free, put it in both monthly and yearly for display
      if (plan.billingPeriod === 'free') {
        groups[tierId].variants['monthly'] = plan;
        groups[tierId].variants['yearly'] = plan;
      } else {
        groups[tierId].variants[period] = plan;
      }
    });

    // Auto-calculate missing variants
    Object.values(groups).forEach((group: any) => {
      if (group.id === 'community') return;

      const monthly = group.variants.monthly;
      if (monthly) {
        // Derive Yearly (~20% discount)
        if (!group.variants.yearly) {
          const yearlyPrice = Math.round(monthly.price * 12 * 0.8);
          group.variants.yearly = {
            ...monthly,
            id: `${group.id}_yearly_auto`,
            price: yearlyPrice,
            billingPeriod: 'yearly',
            name: `${group.name} Anual`,
            tagline: `Ahorra con facturación anual`
          };
        }
        
        // Derive Event (~1.5x monthly)
        if (!group.variants.event) {
          const eventPrice = Math.round(monthly.price * 1.5);
          group.variants.event = {
            ...monthly,
            id: `${group.id}_event_auto`,
            price: eventPrice,
            billingPeriod: 'one-time',
            name: `${group.name} p/ Evento`,
            tagline: `Acceso Plus para un solo torneo`
          };
        }
      }
    });

    return Object.values(groups).sort((a: any, b: any) => a.order_index - b.order_index);
  };

  const groupedTiers = getGroupedTiers();

  const handleUpgradeToPro = async (planId: string = "plus_monthly", interval: string = "monthly") => {
    if (!user?.email) {
      router.push("/signup");
      return;
    }
    if (isPro && interval !== "event") {
      toast({ title: "Ya tienes Plus", description: "Tu plan ya es Organizer Plus." });
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: user.email, 
          interval: interval === "event" ? "one_time" : interval,
          planId: planId
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Error al crear sesión de pago");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo iniciar el checkout",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-background text-foreground">
      {/* Hero */}
      <section className="w-full py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <Badge variant="secondary" className="mb-4">
            Planes y Precios
          </Badge>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none mb-4">
            Elige tu plan de batalla
          </h1>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl">
            Desde torneos casuales hasta eventos profesionales con sponsors.
            Duels Esports crece contigo.
          </p>
        </div>
      </section>

      {/* Plan Cards */}
      <section className="w-full py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          
          {/* Toggle Switch */}
          <div className="flex flex-col items-center gap-4 mb-12">
            <Tabs 
              value={billingInterval} 
              onValueChange={(v: any) => setBillingInterval(v)}
              className="w-full max-w-md"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="monthly">Mensual</TabsTrigger>
                <TabsTrigger value="yearly">Anual</TabsTrigger>
                <TabsTrigger value="event">Por Evento</TabsTrigger>
              </TabsList>
            </Tabs>
            {billingInterval === 'yearly' && (
              <p className="text-sm text-primary font-medium flex items-center gap-1.5 animate-pulse">
                <Zap className="h-4 w-4" />
                Ahorra hasta un 20% con el pago anual
              </p>
            )}
            {billingInterval === 'event' && (
              <p className="text-sm text-muted-foreground">
                Ideal para eventos únicos sin suscripción recurrente
              </p>
            )}
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {groupedTiers.map((tier) => {
              const currentPlan = tier.variants[billingInterval] || tier.variants['monthly'];
              
              if (!currentPlan) return null;
              
              const isFree = currentPlan.price === 0;
              const isEvent = billingInterval === 'event' && !isFree;
              const isPopular = tier.popular && billingInterval !== 'event';

              return (
                <Card 
                  key={tier.id}
                  className={`relative flex flex-col bg-card border-border transition-all duration-300 ${
                    isPopular ? "border-primary/50 shadow-lg shadow-primary/5 scale-105 z-10" : "hover:border-primary/30"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        Más Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{tier.badge}</span>
                      <div>
                        <CardTitle className="text-2xl">{tier.name}</CardTitle>
                        <CardDescription>{currentPlan.tagline || tier.tagline}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-5xl font-bold">${currentPlan.price}</span>
                      <span className="text-muted-foreground">
                        {isFree ? "/siempre" : billingInterval === 'yearly' ? "/año" : billingInterval === 'event' ? "/evento" : "/mes"}
                      </span>
                    </div>
                    {billingInterval === 'yearly' && !isFree && (
                      <p className="text-xs text-primary font-medium mt-1">
                        Equivalente a ${Math.round(currentPlan.price / 12)}/mes
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {(currentPlan.highlights || tier.highlights).map((h: string) => (
                        <li key={h} className="flex items-start gap-3 text-sm">
                          <Check className={`h-4 w-4 ${isFree ? "text-green-400" : "text-primary"} mt-0.5 shrink-0`} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {isFree && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">
                          No incluye
                        </p>
                        <ul className="space-y-2">
                          {[
                            "Gestión de premios en efectivo",
                            "Station Manager (hardware)",
                            "Funciones de IA",
                            "Analítica avanzada",
                          ].map((item) => (
                            <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                              <X className="h-4 w-4 mt-0.5 shrink-0 opacity-50" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {isEvent && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Acceso total a las herramientas Plus para un solo torneo. 
                          Los datos se conservan permanentemente tras finalizar.
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="mt-auto">
                    {isFree ? (
                      user ? (
                        <Button variant="outline" className="w-full" size="lg" disabled>
                          <Check className="mr-2 h-4 w-4" />
                          Plan actual
                        </Button>
                      ) : (
                        <Button asChild variant={currentPlan.ctaVariant || "outline"} className="w-full" size="lg">
                          <Link href="/signup">
                            {currentPlan.cta || "Empezar Gratis"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )
                    ) : (
                      <Button
                        variant={currentPlan.ctaVariant || (isPopular ? "default" : "outline")}
                        className="w-full"
                        size="lg"
                        onClick={() => handleUpgradeToPro(currentPlan.id, billingInterval)}
                        disabled={checkoutLoading || (isPro && billingInterval !== 'event')}
                      >
                        {checkoutLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (isPro && billingInterval !== 'event') ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : billingInterval === 'event' ? (
                          <Landmark className="mr-2 h-4 w-4" />
                        ) : (
                          <Zap className="mr-2 h-4 w-4" />
                        )}
                        {(isPro && billingInterval !== 'event') 
                          ? "Plan actual" 
                          : currentPlan.cta || "Comenzar"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="w-full py-12 md:py-20 bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">
              Comparación detallada
            </h2>
            <p className="text-muted-foreground md:text-lg max-w-[600px] mx-auto">
              Explora todas las funciones disponibles en cada plan
            </p>
          </div>
          <div className="max-w-4xl mx-auto bg-background rounded-xl border border-border overflow-hidden">
            <FeatureComparisonTable tiers={groupedTiers} />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tighter text-center mb-12">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-6">
            <FaqItem
              question="¿Puedo cambiar de plan en cualquier momento?"
              answer="Sí, puedes actualizar a Plus o volver a Community cuando quieras. Al hacer upgrade, el cambio es inmediato. Al hacer downgrade, mantendrás las funciones Plus hasta el final de tu período de facturación."
            />
            <FaqItem
              question="¿Hay límite de torneos en el plan Community?"
              answer="No. Ambos planes ofrecen torneos y participantes ilimitados. La diferencia está en las herramientas avanzadas de gestión, no en la cantidad de torneos."
            />
            <FaqItem
              question="¿Qué incluye el Station Manager?"
              answer="El Station Manager te permite registrar tu hardware (consolas, PCs, mesas), asignar partidos automáticamente a estaciones libres, y ver el estado en tiempo real de cada estación. Ideal para cyber cafés y venues de gaming."
            />
            <FaqItem
              question="¿Cómo funciona el cobro de entradas?"
              answer="Con el plan Plus, puedes cobrar entry fees a los participantes directamente desde la plataforma mediante integración con Stripe. Duels Esports aplica una comisión reducida por transacción."
            />
            <FaqItem
              question="¿Qué es el Pago por Evento?"
              answer="Es una compra única de $299 MXN que convierte un torneo específico en Plus de forma permanente. Los brackets, estadísticas, fotos y récords se preservan para siempre como un 'Legacy'. Ideal para bodas, eventos corporativos o torneos anuales que quieren mantener su memoria histórica. Una vez finalizado, el torneo no se puede reiniciar."
            />
            <FaqItem
              question="¿Qué pasa con mis datos si bajo de plan?"
              answer="Tus datos nunca se eliminan. Si vuelves a Community, los datos de analítica avanzada y configuraciones Plus se conservan, pero no podrás acceder a ellos hasta que reactives Plus. Los torneos con Pago por Evento mantienen su acceso Plus siempre."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">
            ¿Listo para organizar tu próximo torneo?
          </h2>
          <p className="text-muted-foreground md:text-lg mb-8 max-w-[600px] mx-auto">
            {isPro 
              ? "Gracias por ser parte de nuestros organizadores Plus. Sigue creando experiencias increíbles."
              : `Empieza gratis con ${groupedTiers.find(t => t.id === 'community')?.name || 'nosotros'} o desbloquea todo el poder con ${groupedTiers.find(t => t.id !== 'community')?.name || 'Plus'}.`
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isPro && (
              <>
                <Button asChild size="lg" variant="outline" className="min-w-[200px]">
                  <Link href={user ? "/dashboard" : "/signup"}>
                    Empezar Gratis <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                
                {groupedTiers.filter(t => t.id !== 'community').slice(0, 1).map(tier => {
                  const currentPlan = tier.variants[billingInterval] || tier.variants['monthly'];
                  if (!currentPlan) return null;
                  
                  return (
                    <Button
                      key={tier.id}
                      size="lg"
                      className="min-w-[200px]"
                      onClick={() => handleUpgradeToPro(currentPlan.id, billingInterval)}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="mr-2 h-4 w-4" />
                      )}
                      {billingInterval === 'event' 
                        ? "Comprar por Evento" 
                        : user 
                          ? `Suscribirse ${billingInterval === 'yearly' ? 'Anual' : 'Plus'}` 
                          : "Probar Plus"
                      }
                    </Button>
                  );
                })}
              </>
            )}
            
            {isPro && (
              <Button asChild size="lg" className="min-w-[200px]">
                <Link href="/dashboard">
                  Ir al Panel de Control <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/30"
    >
      <button
        className="w-full text-left px-6 py-4 flex items-center justify-between gap-4"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-foreground">{question}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-4">
          <p className="text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  );
}
