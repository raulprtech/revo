"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  UserCheck,
  TrendingUp,
  BarChart3,
  Repeat,
  Star,
  Crown,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { Tournament } from "@/lib/database";
import { useSubscription, ProUpgradePrompt } from "@/lib/subscription";

interface RetentionMetricsProps {
  /** All tournaments owned by this user (or in this event) */
  tournaments: Tournament[];
  /** Map of tournament ID -> participant emails */
  participantsByTournament: Record<string, string[]>;
}

interface RetentionData {
  totalUniquePlayers: number;
  returningPlayers: number;
  retentionRate: number;
  avgTournamentsPerPlayer: number;
  topPlayers: { email: string; count: number; name?: string }[];
  cohortAnalysis: { tournament: string; newPlayers: number; returningPlayers: number; total: number }[];
  churnedPlayers: number;
  growthRate: number;
}

export function RetentionMetrics({ tournaments, participantsByTournament }: RetentionMetricsProps) {
  const { isPro } = useSubscription();

  const data = useMemo((): RetentionData => {
    // Sort tournaments by start date
    const sorted = [...tournaments].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    // Track all unique players and their tournament count
    const playerCounts: Record<string, number> = {};
    const playerNames: Record<string, string> = {};

    sorted.forEach((t) => {
      const participants = participantsByTournament[t.id] || [];
      participants.forEach((email) => {
        playerCounts[email] = (playerCounts[email] || 0) + 1;
        // Store a readable name from the email
        if (!playerNames[email]) {
          playerNames[email] = email.split("@")[0];
        }
      });
    });

    const totalUniquePlayers = Object.keys(playerCounts).length;
    const returningPlayers = Object.values(playerCounts).filter((c) => c > 1).length;
    const retentionRate = totalUniquePlayers > 0 ? (returningPlayers / totalUniquePlayers) * 100 : 0;

    const totalAppearances = Object.values(playerCounts).reduce((s, c) => s + c, 0);
    const avgTournamentsPerPlayer = totalUniquePlayers > 0 ? totalAppearances / totalUniquePlayers : 0;

    // Top players by frequency
    const topPlayers = Object.entries(playerCounts)
      .map(([email, count]) => ({ email, count, name: playerNames[email] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Cohort analysis: for each tournament, how many were new vs returning
    const seenPlayers = new Set<string>();
    const cohortAnalysis = sorted.map((t) => {
      const participants = participantsByTournament[t.id] || [];
      let newPlayers = 0;
      let returning = 0;

      participants.forEach((email) => {
        if (seenPlayers.has(email)) {
          returning++;
        } else {
          newPlayers++;
          seenPlayers.add(email);
        }
      });

      return {
        tournament: t.name,
        newPlayers,
        returningPlayers: returning,
        total: participants.length,
      };
    });

    // Churned players: appeared in first half of tournaments but not in second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalfPlayers = new Set<string>();
    const secondHalfPlayers = new Set<string>();

    sorted.forEach((t, idx) => {
      const participants = participantsByTournament[t.id] || [];
      participants.forEach((email) => {
        if (idx < midpoint) firstHalfPlayers.add(email);
        else secondHalfPlayers.add(email);
      });
    });

    const churnedPlayers = [...firstHalfPlayers].filter(
      (p) => !secondHalfPlayers.has(p)
    ).length;

    // Growth rate: compare last tournament participants vs first
    const firstCount = cohortAnalysis[0]?.total || 0;
    const lastCount = cohortAnalysis[cohortAnalysis.length - 1]?.total || 0;
    const growthRate = firstCount > 0 ? ((lastCount - firstCount) / firstCount) * 100 : 0;

    return {
      totalUniquePlayers,
      returningPlayers,
      retentionRate,
      avgTournamentsPerPlayer,
      topPlayers,
      cohortAnalysis,
      churnedPlayers,
      growthRate,
    };
  }, [tournaments, participantsByTournament]);

  if (!isPro) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Métricas de Retención
            <Badge variant="secondary" className="ml-auto">
              <Zap className="h-3 w-3 mr-1" /> Plus
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProUpgradePrompt />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Retention KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jugadores Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUniquePlayers}</div>
            <p className="text-xs text-muted-foreground mt-1">en todos tus torneos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Retención</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {data.retentionRate.toFixed(1)}%
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={data.retentionRate} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.returningPlayers} de {data.totalUniquePlayers} regresan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Torneos/Jugador</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgTournamentsPerPlayer.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">torneos por jugador</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-1 ${data.growthRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {data.growthRate >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              {Math.abs(data.growthRate).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              primer vs último torneo
            </p>
            {data.churnedPlayers > 0 && (
              <p className="text-xs text-orange-500 mt-1">
                ⚠️ {data.churnedPlayers} jugadores inactivos
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      {data.cohortAnalysis.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Análisis por Cohorte
            </CardTitle>
            <CardDescription>
              Nuevos vs recurrentes en cada torneo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.cohortAnalysis.map((cohort, idx) => {
                const maxTotal = Math.max(...data.cohortAnalysis.map(c => c.total));
                const newPct = cohort.total > 0 ? (cohort.newPlayers / cohort.total) * 100 : 0;
                const retPct = cohort.total > 0 ? (cohort.returningPlayers / cohort.total) * 100 : 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {cohort.tournament}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {cohort.total} jugadores
                      </span>
                    </div>
                    <div className="flex h-5 rounded overflow-hidden">
                      <div
                        className="bg-blue-500 flex items-center justify-center"
                        style={{ width: `${(cohort.newPlayers / maxTotal) * 100}%` }}
                        title={`${cohort.newPlayers} nuevos`}
                      >
                        {cohort.newPlayers > 0 && (
                          <span className="text-[10px] text-white font-medium">{cohort.newPlayers}</span>
                        )}
                      </div>
                      <div
                        className="bg-green-500 flex items-center justify-center"
                        style={{ width: `${(cohort.returningPlayers / maxTotal) * 100}%` }}
                        title={`${cohort.returningPlayers} recurrentes`}
                      >
                        {cohort.returningPlayers > 0 && (
                          <span className="text-[10px] text-white font-medium">{cohort.returningPlayers}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded" /> Nuevos
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded" /> Recurrentes
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Loyal Players */}
      {data.topPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Jugadores Más Leales
            </CardTitle>
            <CardDescription>
              Los que regresan a más torneos tuyos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topPlayers.map((player, idx) => (
                <div
                  key={player.email}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{player.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{player.email}</p>
                  </div>
                  <Badge variant={player.count >= 5 ? "default" : "secondary"}>
                    {player.count} torneos
                  </Badge>
                  {idx === 0 && <Star className="h-4 w-4 text-yellow-500" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
