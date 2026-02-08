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
