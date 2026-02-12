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

function FeatureComparisonTable() {
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
            <th className="text-left py-4 px-4 font-semibold text-foreground w-1/2">
              Característica
            </th>
            <th className="text-center py-4 px-4 font-semibold text-foreground w-1/4">
              <div className="flex items-center justify-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>Community</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal">Gratis</span>
            </th>
            <th className="text-center py-4 px-4 font-semibold text-primary w-1/4">
              <div className="flex items-center justify-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Plus</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal">$199/mes</span>
            </th>
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
}: {
  category: FeatureCategory;
  label: string;
  features: PlanFeature[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="bg-card/50 cursor-pointer hover:bg-card transition-colors"
        onClick={onToggle}
      >
        <td colSpan={3} className="py-3 px-4">
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
            <td className="py-3 px-4 text-center">
              <FeatureStatusCell status={feature.community} />
            </td>
            <td className="py-3 px-4 text-center">
              <FeatureStatusCell status={feature.plus} />
            </td>
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
            popular: p.is_popular
          }));
          setPlans(mappedPlans);
        }
      } catch (err) {
        console.error("Error loading plans:", err);
      }
    }
    loadPlans();
  }, []);

  const communityPlan = plans.find(p => p.id === 'community') || plans[0];
  const proPlan = plans.find(p => p.id === 'plus') || plans[1];

  const handleUpgradeToPro = async () => {
    if (!user?.email) {
      router.push("/signup");
      return;
    }
    if (isPro) {
      toast({ title: "Ya tienes Plus", description: "Tu plan ya es Organizer Plus." });
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
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
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {/* Community */}
            <Card className="relative flex flex-col bg-card border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{communityPlan.badge}</span>
                  <div>
                    <CardTitle className="text-2xl">{communityPlan.name}</CardTitle>
                    <CardDescription>{communityPlan.tagline}</CardDescription>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-muted-foreground">/siempre</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {communityPlan.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
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
              </CardContent>
              <CardFooter>
                {user ? (
                  <Button variant="outline" className="w-full" size="lg" disabled>
                    <Check className="mr-2 h-4 w-4" />
                    Plan actual
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full" size="lg">
                    <Link href="/signup">
                      {communityPlan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Pro */}
            <Card className="relative flex flex-col bg-card border-primary/50 hover:border-primary transition-colors shadow-lg shadow-primary/5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-4 py-1">
                  Más Popular
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{proPlan.badge}</span>
                  <div>
                    <CardTitle className="text-2xl">{proPlan.name}</CardTitle>
                    <CardDescription>{proPlan.tagline}</CardDescription>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-5xl font-bold">${proPlan.price}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {proPlan.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleUpgradeToPro}
                  disabled={checkoutLoading || isPro}
                >
                  {checkoutLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isPro ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {isPro ? "Plan actual" : user ? "Upgrade a Plus" : proPlan.cta}
                </Button>
              </CardFooter>
            </Card>

            {/* Event Payment (Legacy) */}
            <Card className="relative flex flex-col bg-card border-accent/50 hover:border-accent transition-colors">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{EVENT_PAYMENT_PLAN.badge}</span>
                  <div>
                    <CardTitle className="text-2xl">{EVENT_PAYMENT_PLAN.name}</CardTitle>
                    <CardDescription>{EVENT_PAYMENT_PLAN.tagline}</CardDescription>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-5xl font-bold">${EVENT_PAYMENT_PLAN.price}</span>
                  <span className="text-muted-foreground">/único</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {EVENT_PAYMENT_PLAN.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Compra desde la página de cualquier torneo que administres.
                    Una vez finalizado, los datos se preservan para siempre.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link href={user ? "/dashboard" : "/signup"}>
                    <Landmark className="mr-2 h-4 w-4" />
                    {EVENT_PAYMENT_PLAN.cta}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
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
            <FeatureComparisonTable />
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
          <p className="text-muted-foreground md:text-lg mb-8 max-w-[500px] mx-auto">
            Empieza gratis con Community o desbloquea todo el poder con Plus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="outline">
              <Link href={user ? "/dashboard" : "/signup"}>
                Empezar Gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              onClick={handleUpgradeToPro}
              disabled={checkoutLoading || isPro}
            >
              {checkoutLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {isPro ? "Ya tienes Plus" : "Probar Plus"}
            </Button>
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
