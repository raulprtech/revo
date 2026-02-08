"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Medal,
  Target,
  TrendingUp,
  Gamepad2,
  Crown,
  Award,
  Swords,
  Star,
} from "lucide-react";
import type { AwardedBadge, Tournament } from "@/lib/database";
import { cn } from "@/lib/utils";

interface CompetitiveStats {
  totalTournaments: number;
  activeTournaments: number;
  finishedTournaments: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  topFinishes: number; // top 4-8
  totalBadges: number;
  favoriteGame: string | null;
  gameBreakdown: { game: string; count: number }[];
  formatBreakdown: { format: string; count: number }[];
}

function computeStats(
  ownedTournaments: Tournament[],
  participatingTournaments: Tournament[],
  badges: AwardedBadge[]
): CompetitiveStats {
  const allTournaments = [...ownedTournaments, ...participatingTournaments];

  const activeTournaments = allTournaments.filter(
    (t) => t.status === "En Curso"
  ).length;
  const finishedTournaments = allTournaments.filter(
    (t) => t.status === "Finalizado"
  ).length;

  let firstPlaces = 0;
  let secondPlaces = 0;
  let thirdPlaces = 0;
  let topFinishes = 0;

  for (const b of badges) {
    const pos = b.position;
    if (pos === "1") firstPlaces++;
    else if (pos === "2") secondPlaces++;
    else if (pos === "3") thirdPlaces++;
    else if (pos && parseInt(pos) <= 8) topFinishes++;
    else if (b.badge.type === "champion") firstPlaces++;
    else if (b.badge.type === "runner-up") secondPlaces++;
    else if (b.badge.type === "third-place") thirdPlaces++;
    else if (b.badge.type === "top-4" || b.badge.type === "top-8")
      topFinishes++;
  }

  // Game breakdown from all tournaments
  const gameCounts: Record<string, number> = {};
  for (const t of allTournaments) {
    gameCounts[t.game] = (gameCounts[t.game] || 0) + 1;
  }
  const gameBreakdown = Object.entries(gameCounts)
    .map(([game, count]) => ({ game, count }))
    .sort((a, b) => b.count - a.count);

  const favoriteGame =
    gameBreakdown.length > 0 ? gameBreakdown[0].game : null;

  // Format breakdown
  const formatCounts: Record<string, number> = {};
  for (const t of allTournaments) {
    const label =
      t.format === "single-elimination"
        ? "Eliminación Simple"
        : t.format === "double-elimination"
          ? "Doble Eliminación"
          : t.format === "swiss"
            ? "Suizo"
            : t.format || "Otro";
    formatCounts[label] = (formatCounts[label] || 0) + 1;
  }
  const formatBreakdown = Object.entries(formatCounts)
    .map(([format, count]) => ({ format, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalTournaments: allTournaments.length,
    activeTournaments,
    finishedTournaments,
    firstPlaces,
    secondPlaces,
    thirdPlaces,
    topFinishes,
    totalBadges: badges.length,
    favoriteGame,
    gameBreakdown,
    formatBreakdown,
  };
}

// ---- Stat Card Component ----
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          accent || "bg-primary/10"
        )}
      >
        <Icon className={cn("h-5 w-5", accent ? "text-white" : "text-primary")} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ---- Podium Row ----
function PodiumRow({
  icon,
  label,
  count,
  color,
}: {
  icon: string;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
      </div>
      <Badge variant="secondary" className={cn("font-bold", color)}>
        {count}
      </Badge>
    </div>
  );
}

// ---- Main Component ----
interface CompetitiveProfileProps {
  ownedTournaments: Tournament[];
  participatingTournaments: Tournament[];
  badges: AwardedBadge[];
}

export function CompetitiveProfile({
  ownedTournaments,
  participatingTournaments,
  badges,
}: CompetitiveProfileProps) {
  const stats = computeStats(ownedTournaments, participatingTournaments, badges);
  const totalPodiums = stats.firstPlaces + stats.secondPlaces + stats.thirdPlaces;
  const winRate =
    stats.finishedTournaments > 0
      ? Math.round((stats.firstPlaces / stats.finishedTournaments) * 100)
      : 0;

  if (stats.totalTournaments === 0 && stats.totalBadges === 0) {
    return null; // Don't show if there's no competitive history
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          Perfil Competitivo
        </CardTitle>
        <CardDescription>
          Estadísticas acumuladas y rendimiento en torneos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Target}
            label="Torneos Jugados"
            value={stats.totalTournaments}
          />
          <StatCard
            icon={Trophy}
            label="Victorias"
            value={stats.firstPlaces}
            accent="bg-yellow-500"
          />
          <StatCard
            icon={Medal}
            label="Podios"
            value={totalPodiums}
            accent="bg-orange-500"
          />
          <StatCard
            icon={Star}
            label="Badges"
            value={stats.totalBadges}
            accent="bg-purple-500"
          />
        </div>

        {/* Win Rate */}
        {stats.finishedTournaments > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Tasa de victoria (1er lugar)
              </span>
              <span className="font-bold">{winRate}%</span>
            </div>
            <Progress value={winRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.firstPlaces} de {stats.finishedTournaments} torneos finalizados
            </p>
          </div>
        )}

        <Separator />

        {/* Podium Breakdown */}
        {(stats.firstPlaces > 0 ||
          stats.secondPlaces > 0 ||
          stats.thirdPlaces > 0 ||
          stats.topFinishes > 0) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Posiciones en Torneos
            </h4>
            <div className="grid gap-2">
              {stats.firstPlaces > 0 && (
                <PodiumRow
                  icon="🥇"
                  label="1er Lugar"
                  count={stats.firstPlaces}
                  color="text-yellow-500"
                />
              )}
              {stats.secondPlaces > 0 && (
                <PodiumRow
                  icon="🥈"
                  label="2do Lugar"
                  count={stats.secondPlaces}
                  color="text-gray-400"
                />
              )}
              {stats.thirdPlaces > 0 && (
                <PodiumRow
                  icon="🥉"
                  label="3er Lugar"
                  count={stats.thirdPlaces}
                  color="text-amber-700"
                />
              )}
              {stats.topFinishes > 0 && (
                <PodiumRow
                  icon="🎖️"
                  label="Top 4-8"
                  count={stats.topFinishes}
                  color="text-blue-400"
                />
              )}
            </div>
          </div>
        )}

        {/* Game Breakdown */}
        {stats.gameBreakdown.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Juegos Competidos
              </h4>
              <div className="flex flex-wrap gap-2">
                {stats.gameBreakdown.map(({ game, count }) => (
                  <Badge
                    key={game}
                    variant={game === stats.favoriteGame ? "default" : "outline"}
                    className="flex items-center gap-1.5"
                  >
                    {game === stats.favoriteGame && (
                      <Star className="h-3 w-3" />
                    )}
                    {game}
                    <span className="ml-1 rounded-full bg-background/30 px-1.5 text-[10px]">
                      {count}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Format Breakdown */}
        {stats.formatBreakdown.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4" />
                Formatos Jugados
              </h4>
              <div className="flex flex-wrap gap-2">
                {stats.formatBreakdown.map(({ format, count }) => (
                  <Badge key={format} variant="secondary" className="flex items-center gap-1.5">
                    {format}
                    <span className="ml-1 rounded-full bg-background/30 px-1.5 text-[10px]">
                      {count}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tournament Status Breakdown */}
        {stats.totalTournaments > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-500">
                  {stats.finishedTournaments}
                </p>
                <p className="text-xs text-muted-foreground">Finalizados</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-500">
                  {stats.activeTournaments}
                </p>
                <p className="text-xs text-muted-foreground">En Curso</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-muted-foreground">
                  {stats.totalTournaments -
                    stats.finishedTournaments -
                    stats.activeTournaments}
                </p>
                <p className="text-xs text-muted-foreground">Próximos</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
