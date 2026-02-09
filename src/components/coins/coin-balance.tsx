"use client";

import { useCoins } from "@/hooks/use-coins";
import { Coins, Gift } from "lucide-react";
import { formatCoins } from "@/lib/coins";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Small coin balance indicator for the header.
 * Shows current balance and a dot if monthly allowance is available.
 */
export function CoinBalance() {
  const { balance, isLoading, dailyAvailable } = useCoins();

  if (isLoading) {
    return <div className="h-8 w-16 bg-muted rounded-md animate-pulse" />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/coins"
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors text-amber-400 text-sm font-semibold"
          >
            <Coins className="h-4 w-4" />
            <span>{formatCoins(balance)}</span>
            {dailyAvailable && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Duels Coins: {balance.toLocaleString()}</p>
          {dailyAvailable && (
            <p className="text-green-400 text-xs flex items-center gap-1">
              <Gift className="h-3 w-3" /> ¡Coins diarios disponibles!
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
