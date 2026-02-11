import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a consistent Tailwind gradient class pair based on the game name.
 * Used as a fallback background when a tournament has no custom image.
 */
export function getDefaultTournamentImage(gameName: string): string {
  const colors = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-red-500 to-pink-600',
    'from-yellow-500 to-orange-600',
    'from-indigo-500 to-blue-600',
    'from-purple-500 to-indigo-600',
  ];
  const colorIndex = gameName.length % colors.length;
  return colors[colorIndex];
}

/**
 * Financial calculations for tournament economy
 */
export const FINANCIAL_CONFIG = {
  PLATFORM_FEE_PERCENT: 10,
};

export function calculatePlatformFee(grossAmount: number): number {
  return Math.round((grossAmount * (FINANCIAL_CONFIG.PLATFORM_FEE_PERCENT / 100)) * 100) / 100;
}

export function calculateNetRevenue(grossAmount: number): number {
  return grossAmount - calculatePlatformFee(grossAmount);
}

export interface PrizeDistributionRecord {
  position: string | number;
  percentage: number;
  amount?: number;
}

export function calculatePrizeSplits(
  totalNetRevenue: number, 
  distributions: PrizeDistributionRecord[]
): (PrizeDistributionRecord & { amount: number })[] {
  return distributions.map(d => ({
    ...d,
    amount: Math.round((totalNetRevenue * (d.percentage / 100)) * 100) / 100
  }));
}

export function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
