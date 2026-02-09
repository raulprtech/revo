"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Zap, CreditCard, Calendar, Loader2, ExternalLink, Shield, CheckCircle2, XCircle, ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-context";
import { useSubscription } from "@/lib/subscription";
import { useToast } from "@/hooks/use-toast";

interface StripeInvoice {
  id: string;
  number: string | null;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, plan, isPro, isLoading: subLoading, refresh } = useSubscription();
  const { toast } = useToast();
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const loading = authLoading || subLoading;

  // Fetch invoices when user has a subscription
  useEffect(() => {
    if (!user?.email || !isPro) return;
    setInvoicesLoading(true);
    fetch("/api/stripe/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.invoices) setInvoices(data.invoices);
      })
      .catch(() => {})
      .finally(() => setInvoicesLoading(false));
  }, [user?.email, isPro]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleAction = async (action: "cancel" | "resume" | "portal") => {
    setActionLoading(action);
    try {
      const res = await fetch("/api/stripe/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: user.email }),
      });
      const data = await res.json();

      if (action === "portal" && data.url) {
        window.location.href = data.url;
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar acción");
      }

      await refresh();

      toast({
        title: action === "cancel" ? "Cancelación programada" : "Suscripción reactivada",
        description: action === "cancel"
          ? "Tu plan Plus se mantendrá activo hasta el final del período actual."
          : "Tu suscripción volverá a renovarse automáticamente.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo completar la acción",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgrade = async () => {
    setActionLoading("upgrade");
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
        throw new Error(data.error || "Error al crear sesión");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo iniciar el checkout",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto py-10 px-4 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Suscripción y Facturación</h1>
            <p className="text-muted-foreground">Gestiona tu plan y método de pago</p>
          </div>
        </div>

        {/* Current Plan */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPro ? (
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                ) : (
                  <div className="p-2 bg-muted rounded-full">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-xl">
                    Plan {isPro ? "Organizer Plus" : "Community"}
                  </CardTitle>
                  <CardDescription>
                    {isPro ? "$199 MXN/mes" : "Gratis para siempre"}
                  </CardDescription>
                </div>
              </div>
              {isPro && subscription && (
                <Badge
                  variant={
                    subscription.status === "active" ? "default" :
                    subscription.status === "trialing" ? "secondary" :
                    "destructive"
                  }
                >
                  {subscription.status === "active" && "Activa"}
                  {subscription.status === "trialing" && "Período de prueba"}
                  {subscription.status === "past_due" && "Pago pendiente"}
                  {subscription.status === "canceled" && "Cancelada"}
                </Badge>
              )}
            </div>
          </CardHeader>

          {isPro && subscription && (
            <CardContent className="space-y-4">
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Período actual</p>
                  <p className="text-sm font-medium">
                    {formatDate(subscription.current_period_start)} — {formatDate(subscription.current_period_end)}
                  </p>
                </div>
                {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Prueba gratuita hasta</p>
                    <p className="text-sm font-medium">{formatDate(subscription.trial_end)}</p>
                  </div>
                )}
                {subscription.cancel_at_period_end && (
                  <div className="col-span-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-medium text-destructive">
                        Se cancelará el {formatDate(subscription.current_period_end)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mantendrás el acceso Plus hasta esa fecha.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          )}

          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            {isPro ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleAction("portal")}
                  disabled={actionLoading === "portal"}
                  className="w-full sm:w-auto"
                >
                  {actionLoading === "portal" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  Gestionar pago en Stripe
                </Button>
                {subscription?.cancel_at_period_end ? (
                  <Button
                    onClick={() => handleAction("resume")}
                    disabled={actionLoading === "resume"}
                    className="w-full sm:w-auto"
                  >
                    {actionLoading === "resume" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Reactivar suscripción
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={!!actionLoading}
                        className="w-full sm:w-auto"
                      >
                        Cancelar plan
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Cancelar Organizer Plus?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-3">
                            <p>
                              Mantendrás acceso a todas las funciones Plus hasta el final de tu período
                              de facturación actual ({formatDate(subscription?.current_period_end)}).
                              Puedes reactivar en cualquier momento.
                            </p>
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                              <p className="text-sm font-medium text-destructive mb-2">Perderás acceso a:</p>
                              <ul className="space-y-1.5">
                                {[
                                  "Station Manager (hardware)",
                                  "Cobro de entry fees",
                                  "Premios en dinero real",
                                  "Analítica avanzada y retención",
                                  "Validación de scores por IA",
                                  "Branding personalizado",
                                  "Exportación CSV",
                                  "Soporte prioritario",
                                ].map((f) => (
                                  <li key={f} className="flex items-center gap-2 text-sm text-destructive/80">
                                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Tus datos no se eliminarán. Los torneos con Pago por Evento mantienen su acceso Plus.
                            </p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleAction("cancel")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {actionLoading === "cancel" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Confirmar cancelación
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            ) : (
              <Button onClick={handleUpgrade} disabled={!!actionLoading} className="w-full sm:w-auto">
                {actionLoading === "upgrade" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Upgrade a Organizer Plus
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Plan Features Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tu plan incluye</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isPro ? (
                <>
                  {["Torneos y participantes ilimitados", "Station Manager (hardware)", "Cobro de entry fees con Stripe", "Premios en efectivo y calculadora automática", "Analítica avanzada y retención", "Exportación CSV de datos", "Branding personalizado en brackets", "Patrocinadores en eventos"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {["Torneos y participantes ilimitados", "Brackets interactivos", "Check-in de participantes", "Modo espectador en vivo", "Sistema de badges", "Invitaciones privadas"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="link" asChild className="px-0">
              <Link href="/pricing">Ver comparación completa de planes</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Invoice History */}
        {isPro && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Historial de Facturas</CardTitle>
              </div>
              <CardDescription>Tus últimas facturas y recibos de pago</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hay facturas disponibles aún.
                </p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-card/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {invoice.number || "Factura"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(invoice.created * 1000).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            ${(invoice.amount_paid / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                          </p>
                          <Badge
                            variant={invoice.status === "paid" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {invoice.status === "paid" ? "Pagada" : invoice.status === "open" ? "Pendiente" : invoice.status}
                          </Badge>
                        </div>
                        {invoice.hosted_invoice_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
