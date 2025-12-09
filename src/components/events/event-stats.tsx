"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Trophy, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Activity,
  Zap,
  Timer,
  AlertCircle,
  Gamepad2,
  Target,
  Star
} from "lucide-react";
import type { Event, Tournament } from "@/lib/database";

interface EventStatsProps {
  event: Event;
  tournaments: Tournament[];
}

export default function EventStats({ event, tournaments }: EventStatsProps) {
  const stats = useMemo(() => {
    // Tournament stats
    const totalTournaments = tournaments.length;
    const activeTournaments = tournaments.filter(t => t.status === 'En curso').length;
    const completedTournaments = tournaments.filter(t => t.status === 'Finalizado').length;
    const upcomingTournaments = tournaments.filter(t => t.status === 'Abierto' || t.status === 'Próximamente').length;
    
    // Aggregate participant data
    const totalParticipants = tournaments.reduce((sum, t) => sum + (t.participants || 0), 0);
    const totalCapacity = tournaments.reduce((sum, t) => sum + (t.max_participants || 0), 0);
    const fillRate = totalCapacity > 0 ? (totalParticipants / totalCapacity) * 100 : 0;
    
    // Unique participants (estimated based on avg capacity usage)
    const uniqueParticipantsEstimate = Math.round(totalParticipants * 0.7); // Assuming 30% overlap
    
    // Games breakdown
    const gamesCounts: Record<string, number> = {};
    tournaments.forEach(t => {
      gamesCounts[t.game] = (gamesCounts[t.game] || 0) + 1;
    });
    const gamesBreakdown = Object.entries(gamesCounts)
      .map(([game, count]) => ({ game, count, percentage: (count / totalTournaments) * 100 }))
      .sort((a, b) => b.count - a.count);
    
    // Format breakdown
    const formatCounts: Record<string, number> = {};
    tournaments.forEach(t => {
      formatCounts[t.format] = (formatCounts[t.format] || 0) + 1;
    });
    const formatBreakdown = Object.entries(formatCounts)
      .map(([format, count]) => ({ 
        format, 
        count, 
        label: format === 'single-elimination' ? 'Eliminación Simple' :
               format === 'double-elimination' ? 'Doble Eliminación' : 'Sistema Suizo'
      }))
      .sort((a, b) => b.count - a.count);
    
    // Participants per tournament
    const participantsPerTournament = totalTournaments > 0 
      ? (totalParticipants / totalTournaments).toFixed(1) 
      : '0';
    
    // Best performing tournament (by fill rate)
    const tournamentsWithFillRate = tournaments
      .filter(t => t.max_participants > 0)
      .map(t => ({
        ...t,
        fillRate: ((t.participants || 0) / t.max_participants) * 100
      }))
      .sort((a, b) => b.fillRate - a.fillRate);
    
    const bestTournament = tournamentsWithFillRate[0];
    const worstTournament = tournamentsWithFillRate[tournamentsWithFillRate.length - 1];
    
    // Prize pool analysis
    const tournamentsWithPrize = tournaments.filter(t => t.prize_pool && t.prize_pool !== 'Por anunciar');
    
    // Event timeline
    const eventStart = event.start_date ? new Date(event.start_date) : null;
    const eventEnd = event.end_date ? new Date(event.end_date) : null;
    const eventDuration = eventStart && eventEnd 
      ? Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 1;
    
    // Tournaments per day
    const tournamentsPerDay = eventDuration > 0 ? (totalTournaments / eventDuration).toFixed(1) : totalTournaments;
    
    // Tournament dates distribution
    const tournamentsByDate: Record<string, number> = {};
    tournaments.forEach(t => {
      if (t.start_date) {
        const date = new Date(t.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        tournamentsByDate[date] = (tournamentsByDate[date] || 0) + 1;
      }
    });

    return {
      overview: {
        totalTournaments,
        activeTournaments,
        completedTournaments,
        upcomingTournaments,
        totalParticipants,
        totalCapacity,
        fillRate,
        uniqueParticipantsEstimate,
        participantsPerTournament,
        eventDuration,
        tournamentsPerDay
      },
      games: gamesBreakdown,
      formats: formatBreakdown,
      performance: {
        best: bestTournament,
        worst: worstTournament,
        tournamentsWithPrize: tournamentsWithPrize.length
      },
      timeline: {
        tournamentsByDate: Object.entries(tournamentsByDate)
      }
    };
  }, [tournaments]);

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Torneos</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalTournaments}</div>
            <div className="flex gap-2 mt-2">
              {stats.overview.activeTournaments > 0 && (
                <Badge variant="default" className="text-xs">
                  {stats.overview.activeTournaments} en curso
                </Badge>
              )}
              {stats.overview.completedTournaments > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.overview.completedTournaments} finalizados
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalParticipants}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={stats.overview.fillRate} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {stats.overview.fillRate.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.overview.totalCapacity} cupos totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Torneo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.participantsPerTournament}</div>
            <p className="text-xs text-muted-foreground mt-1">
              participantes promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duración del Evento</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.eventDuration} día{stats.overview.eventDuration !== 1 ? 's' : ''}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{stats.overview.tournamentsPerDay} torneos por día
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Games and Format Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Games Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Juegos del Evento
            </CardTitle>
            <CardDescription>
              Distribución de torneos por juego
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.games.length > 0 ? (
              <div className="space-y-3">
                {stats.games.map((game, index) => (
                  <div key={game.game} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-32 truncate">
                      {index === 0 && <Star className="h-4 w-4 text-yellow-500" />}
                      <span className={`text-sm ${index === 0 ? 'font-bold' : ''}`}>{game.game}</span>
                    </div>
                    <div className="flex-1">
                      <Progress value={game.percentage} className="h-3" />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {game.count} ({game.percentage.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Gamepad2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin torneos aún</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Format Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Formatos Utilizados
            </CardTitle>
            <CardDescription>
              Tipos de torneo en el evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.formats.length > 0 ? (
              <div className="space-y-4">
                {stats.formats.map((format) => (
                  <div key={format.format} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{format.label}</Badge>
                    </div>
                    <span className="text-lg font-bold">{format.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin torneos aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tournament Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cronograma de Torneos
          </CardTitle>
          <CardDescription>
            Distribución de torneos por fecha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.timeline.tournamentsByDate.length > 0 ? (
            <div className="space-y-2">
              {stats.timeline.tournamentsByDate.map(([date, count]) => {
                const maxCount = Math.max(...stats.timeline.tournamentsByDate.map(([, c]) => c));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={date} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-16">{date}</span>
                    <div className="flex-1">
                      <div 
                        className="h-6 bg-primary/80 rounded flex items-center px-2"
                        style={{ width: `${Math.max(percentage, 15)}%` }}
                      >
                        <span className="text-xs text-primary-foreground font-medium">
                          {count} torneo{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin fechas de torneos aún</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance & Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Insights del Evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Best Tournament */}
            {stats.performance.best && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm text-green-500">Torneo Más Exitoso</span>
                </div>
                <p className="font-bold truncate">{stats.performance.best.name}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.performance.best.fillRate.toFixed(0)}% de llenado ({stats.performance.best.participants}/{stats.performance.best.max_participants})
                </p>
              </div>
            )}

            {/* Worst Tournament */}
            {stats.performance.worst && stats.performance.worst !== stats.performance.best && (
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm text-orange-500">Necesita Atención</span>
                </div>
                <p className="font-bold truncate">{stats.performance.worst.name}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.performance.worst.fillRate.toFixed(0)}% de llenado - Considera más promoción
                </p>
              </div>
            )}

            {/* Overall Fill Rate */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Tasa de Llenado General</span>
              </div>
              <p className="text-2xl font-bold">{stats.overview.fillRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">
                {stats.overview.fillRate >= 80 
                  ? '🔥 Excelente demanda!'
                  : stats.overview.fillRate >= 60
                  ? '👍 Buen nivel de participación'
                  : stats.overview.fillRate >= 40
                  ? '📣 Hay espacio para más promoción'
                  : '⚠️ Considera ajustar los cupos o promoción'
                }
              </p>
            </div>

            {/* Location */}
            {event.location && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Ubicación</span>
                </div>
                <p className="text-sm font-medium">{event.location}</p>
              </div>
            )}

            {/* Prize Pools */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Torneos con Premio</span>
              </div>
              <p className="text-2xl font-bold">{stats.performance.tournamentsWithPrize}</p>
              <p className="text-xs text-muted-foreground">
                de {stats.overview.totalTournaments} torneos
              </p>
            </div>

            {/* Recommendation */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Recomendación</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.games.length > 0 && stats.games[0] && (
                  <>
                    <strong>{stats.games[0].game}</strong> es tu juego más popular. 
                    Considera agregar más torneos de este juego en futuros eventos.
                  </>
                )}
                {stats.games.length === 0 && 'Agrega torneos para ver recomendaciones.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
