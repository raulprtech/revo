"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { CoinPackage } from "@/types/coins";
import { Coins, Star, Loader2, Crown, Gift, TrendingUp } from "lucide-react";

export function CoinPackages() {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPackages() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('coin_packages')
          .select('*')
          .eq('is_active', true)
          .order('price_mxn', { ascending: true });

        setPackages(data || []);
      } catch (err) {
        console.error('Error fetching packages:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPackages();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="h-32 w-full bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Design tiers like Duolingo
  const tierConfig = [
    { icon: Coins,  emoji: '🪙', gradient: 'from-zinc-500/20 to-zinc-600/10',    ring: '',                       accentText: 'text-zinc-400',  accentBg: 'bg-zinc-500/10' },
    { icon: Star,   emoji: '⭐', gradient: 'from-purple-500/20 to-indigo-500/10', ring: 'ring-2 ring-primary',    accentText: 'text-purple-400', accentBg: 'bg-purple-500/10' },
    { icon: Crown,  emoji: '👑', gradient: 'from-amber-500/20 to-yellow-500/10',  ring: 'ring-2 ring-amber-500',  accentText: 'text-amber-400', accentBg: 'bg-amber-500/10' },
  ];

  // Find best value (highest coins-per-dollar)
  const bestValueIndex = packages.reduce((bestIdx, pkg, idx, arr) => {
    const currentRatio = (pkg.coin_amount + pkg.bonus_amount) / pkg.price_mxn;
    const bestRatio = (arr[bestIdx].coin_amount + arr[bestIdx].bonus_amount) / arr[bestIdx].price_mxn;
    return currentRatio > bestRatio ? idx : bestIdx;
  }, 0);

  return (
    <div id="packages" className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Coins className="h-6 w-6 text-amber-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Comprar Duels Coins</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Adquiere monedas para desbloquear cosméticos, potenciadores y contenido exclusivo
        </p>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg, index) => {
          const tier = tierConfig[index] || tierConfig[0];
          const TierIcon = tier.icon;
          const coinsPerPeso = ((pkg.coin_amount + pkg.bonus_amount) / pkg.price_mxn).toFixed(1);
          const totalCoins = pkg.coin_amount + pkg.bonus_amount;
          const isBestValue = index === bestValueIndex && packages.length > 2;
          const savingsPercent = pkg.bonus_amount > 0 
            ? Math.round((pkg.bonus_amount / pkg.coin_amount) * 100) 
            : 0;

          return (
            <Card
              key={pkg.id}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.03] group ${
                tier.ring
              } ${pkg.is_featured ? 'ring-2 ring-primary shadow-lg shadow-primary/10' : ''}`}
            >
              {/* Badges */}
              <div className="absolute top-0 left-0 right-0 flex justify-between">
                {pkg.is_featured && (
                  <Badge className="rounded-none rounded-br-lg bg-primary text-primary-foreground text-[10px] font-bold">
                    ⭐ Popular
                  </Badge>
                )}
                {!pkg.is_featured && <span />}
                {isBestValue && (
                  <Badge className="rounded-none rounded-bl-lg bg-green-600 text-white text-[10px] font-bold">
                    💰 Mejor valor
                  </Badge>
                )}
              </div>

              {/* Header with gradient */}
              <CardHeader className={`bg-gradient-to-br ${tier.gradient} pt-8 pb-4 text-center`}>
                <div className={`mx-auto mb-2 h-16 w-16 rounded-full ${tier.accentBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <span className="text-3xl">{tier.emoji}</span>
                </div>
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <CardDescription className="text-xs">{pkg.description}</CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Coin Amount */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="h-5 w-5 text-amber-400" />
                    <span className="text-3xl font-extrabold tracking-tight">{pkg.coin_amount.toLocaleString()}</span>
                  </div>
                  
                  {pkg.bonus_amount > 0 && (
                    <div className="flex items-center justify-center gap-1.5">
                      <Gift className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-sm font-bold text-green-400">
                        +{pkg.bonus_amount.toLocaleString()} bonus
                      </span>
                      <Badge variant="outline" className="text-[9px] text-green-400 border-green-500/30 px-1 py-0">
                        +{savingsPercent}%
                      </Badge>
                    </div>
                  )}

                  {pkg.bonus_amount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Total: <span className="font-bold text-foreground">{totalCoins.toLocaleString()}</span> monedas
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="text-center py-2 border-t border-b border-border/50">
                  <span className="text-3xl font-extrabold">${pkg.price_mxn}</span>
                  <span className="text-sm text-muted-foreground ml-1">MXN</span>
                </div>

                {/* Value indicator */}
                <div className={`flex items-center justify-center gap-1.5 text-xs ${tier.accentText}`}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="font-medium">{coinsPerPeso} monedas por peso</span>
                </div>

                {/* CTA Button */}
                <Button 
                  className={`w-full font-bold transition-all ${
                    pkg.is_featured 
                      ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20' 
                      : isBestValue
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
                        : ''
                  }`}
                  variant={pkg.is_featured || isBestValue ? "default" : "outline"}
                  size="lg"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Comprar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info footer */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-xs text-muted-foreground">
          Pagos seguros procesados por Stripe. Las monedas se acreditan al instante.
        </p>
        <p className="text-xs text-muted-foreground">
          También puedes ganar monedas gratis jugando torneos, completando misiones y organizando eventos.
        </p>
      </div>
    </div>
  );
}
