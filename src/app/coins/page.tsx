"use client";

import { useAuth } from "@/lib/supabase/auth-context";
import { useCoins } from "@/hooks/use-coins";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CoinBalance } from "@/components/coins/coin-balance";
import { ExplorationQuests } from "@/components/coins/exploration-quests";
import { CosmeticsShop } from "@/components/coins/cosmetics-shop";
import { TransactionHistory } from "@/components/coins/transaction-history";
import { CoinPackages } from "@/components/coins/coin-packages";
import { 
  Coins, Gift, ShoppingBag, ScrollText, 
  Loader2, Target
} from "lucide-react";
import { formatCoins } from "@/lib/coins";
import { COIN_REWARDS } from "@/types/coins";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function CoinsPage() {
  const { user, loading: authLoading } = useAuth();
  const { wallet, balance, isLoading, dailyAvailable, claimDaily } = useCoins();
  const { toast } = useToast();

  const handleClaimDaily = async () => {
    const result = await claimDaily();
    if (result.success) {
      toast({
        title: "¡Coins diarios reclamados!",
        description: `Has recibido ${COIN_REWARDS.DAILY_ALLOWANCE} Duels Coins`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo reclamar. Intenta más tarde.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Coins className="h-16 w-16 text-amber-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Duels Coins</h1>
        <p className="text-muted-foreground mb-6">
          Inicia sesión para acceder a tu billetera de monedas digitales
        </p>
        <Button asChild>
          <Link href="/login">Iniciar Sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Coins className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Duels Coins</h1>
            <p className="text-muted-foreground text-sm">Tu moneda digital en Duels Esports. Gana más completando misiones en la pestaña de Misiones.</p>
          </div>
        </div>
      </div>

      {/* Wallet — Saldo + Claim diario */}
      <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-8">
        <Card className="flex-1 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Coins className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tu Saldo</p>
                <p className="text-3xl font-bold text-amber-400">{balance.toLocaleString()} <span className="text-base font-normal">DC</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`flex-1 ${dailyAvailable ? 'border-green-500/50 bg-green-500/5' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-3">
                <Gift className={`h-8 w-8 ${dailyAvailable ? 'text-green-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm text-muted-foreground">Coins del Día</p>
                  <p className="text-sm font-medium">
                    {dailyAvailable ? (
                      <span className="text-green-400">¡Disponible! Si no lo reclamas, se pierde</span>
                    ) : (
                      <span className="text-muted-foreground">Ya reclamado hoy</span>
                    )}
                  </p>
                </div>
              </div>
              {dailyAvailable && (
                <Button size="sm" onClick={handleClaimDaily} className="bg-green-600 hover:bg-green-700">
                  <Gift className="h-4 w-4 mr-1" />
                  +{COIN_REWARDS.DAILY_ALLOWANCE}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="shop" className="flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Tienda</span>
          </TabsTrigger>
          <TabsTrigger value="quests" className="flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Misiones</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <ScrollText className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-10">
          <CosmeticsShop />
          <Separator />
          <CoinPackages />
        </TabsContent>

        <TabsContent value="quests">
          <ExplorationQuests />
        </TabsContent>

        <TabsContent value="history">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
