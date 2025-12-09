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
  Target,
  Zap,
  Timer,
  AlertCircle
} from "lucide-react";
import { useParticipants } from "@/hooks/use-tournaments";
import type { Tournament } from "@/lib/database";
import type { Round } from "./bracket";

interface TournamentStatsProps {
  tournament: Tournament;
  rounds: Round[];
}

export default function TournamentStats({ tournament, rounds }: TournamentStatsProps) {
  const { participants } = useParticipants(tournament.id!);

  const stats = useMemo(() => {
    const tournamentDate = tournament.start_date ? new Date(tournament.start_date) : null;
    
    // Participant stats
    const accepted = participants.filter(p => p.status === 'Aceptado');
    const checkedIn = accepted.filter(p => p.checked_in_at);
    const noShows = accepted.filter(p => !p.checked_in_at);
    
    // Registration times analysis
    const registrationTimes = participants
      .filter(p => p.created_at)
      .map(p => new Date(p.created_at!));
    
    // Registrations by hour (0-23)
    const hourlyRegistrations: number[] = Array(24).fill(0);
    registrationTimes.forEach(date => {
      hourlyRegistrations[date.getHours()]++;
    });
    
    // Find peak hours (top 3)
    const peakHours = hourlyRegistrations
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    // Registrations by day of week
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dailyRegistrations: number[] = Array(7).fill(0);
    registrationTimes.forEach(date => {
      dailyRegistrations[date.getDay()]++;
    });
    const peakDay = dailyRegistrations.indexOf(Math.max(...dailyRegistrations));
    
    // Registrations by date (last 14 days or since first registration)
    const registrationsByDate: Record<string, number> = {};
    registrationTimes.forEach(date => {
      const key = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      registrationsByDate[key] = (registrationsByDate[key] || 0) + 1;
    });
    
    // Time to fill analysis
    const sortedRegistrations = [...registrationTimes].sort((a, b) => a.getTime() - b.getTime());
    const firstRegistration = sortedRegistrations[0];
    const lastRegistration = sortedRegistrations[sortedRegistrations.length - 1];
    const registrationSpanDays = firstRegistration && lastRegistration 
      ? Math.ceil((lastRegistration.getTime() - firstRegistration.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    // Average registrations per day
    const avgRegistrationsPerDay = registrationSpanDays > 0 
      ? (participants.length / registrationSpanDays).toFixed(1)
      : participants.length;
    
    // Early vs late registrations (relative to tournament date)
    let earlyBirds = 0;
    let lastMinute = 0;
    if (tournamentDate) {
      registrationTimes.forEach(regDate => {
        const daysBeforeTournament = (tournamentDate.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysBeforeTournament >= 7) earlyBirds++;
        else if (daysBeforeTournament <= 1) lastMinute++;
      });
    }
    
    // Match stats
    const allMatches = rounds.flatMap(r => r.matches);
    const completedMatches = allMatches.filter(m => m.winner !== null);
    
    // Fill rate and show rate
    const fillRate = tournament.max_participants > 0 
      ? (accepted.length / tournament.max_participants) * 100 
      : 0;
    const showRate = accepted.length > 0 
      ? (checkedIn.length / accepted.length) * 100 
      : 0;

    return {
      totals: {
        registered: participants.length,
        accepted: accepted.length,
        checkedIn: checkedIn.length,
        noShows: noShows.length,
        maxParticipants: tournament.max_participants,
        fillRate,
        showRate
      },
      timing: {
        peakHours,
        peakDay: { name: dayNames[peakDay], count: dailyRegistrations[peakDay] },
        hourlyRegistrations,
        dailyRegistrations: dayNames.map((name, i) => ({ name, count: dailyRegistrations[i] })),
        registrationsByDate: Object.entries(registrationsByDate).slice(-14),
        registrationSpanDays,
        avgRegistrationsPerDay,
        earlyBirds,
        lastMinute
      },
      matches: {
        total: allMatches.length,
        completed: completedMatches.length,
        completionRate: allMatches.length > 0 ? (completedMatches.length / allMatches.length) * 100 : 0
      }
    };
  }, [participants, rounds, tournament]);

  const isInPerson = Boolean(tournament.location);
  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totals.registered}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={stats.totals.fillRate} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {stats.totals.fillRate.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.totals.maxParticipants} cupos disponibles
            </p>
          </CardContent>
        </Card>

        {isInPerson && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Asistencia</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.totals.checkedIn}</div>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={stats.totals.showRate} className="h-2" />
                <span className="text-xs text-muted-foreground">
                  {stats.totals.showRate.toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                de {stats.totals.accepted} aceptados llegaron
              </p>
            </CardContent>
          </Card>
        )}

        {isInPerson && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Shows</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.totals.noShows}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totals.accepted > 0 
                  ? `${((stats.totals.noShows / stats.totals.accepted) * 100).toFixed(0)}% de ausencias`
                  : 'Sin datos aún'
                }
              </p>
              {stats.totals.noShows > 0 && (
                <p className="text-xs text-yellow-500 mt-2">
                  💡 Considera overbooking del {Math.ceil((stats.totals.noShows / stats.totals.accepted) * 100)}%
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Diario</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.timing.avgRegistrationsPerDay}</div>
            <p className="text-xs text-muted-foreground mt-1">
              registros por día
            </p>
            <p className="text-xs text-muted-foreground">
              en {stats.timing.registrationSpanDays || 1} días de inscripciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partidas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matches.completed}/{stats.matches.total}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={stats.matches.completionRate} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {stats.matches.completionRate.toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horas Pico de Registro
            </CardTitle>
            <CardDescription>
              Mejores horarios para promocionar futuros torneos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.timing.peakHours.length > 0 ? (
              <div className="space-y-4">
                {stats.timing.peakHours.map((peak, index) => (
                  <div key={peak.hour} className="flex items-center gap-3">
                    <Badge variant={index === 0 ? "default" : "secondary"} className="w-16 justify-center">
                      {formatHour(peak.hour)}
                    </Badge>
                    <div className="flex-1">
                      <Progress 
                        value={(peak.count / Math.max(...stats.timing.peakHours.map(p => p.count))) * 100} 
                        className="h-3"
                      />
                    </div>
                    <span className="text-sm font-medium w-20 text-right">
                      {peak.count} registro{peak.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Recomendación:</strong> Publica anuncios entre las{' '}
                    <span className="text-primary font-medium">
                      {formatHour(stats.timing.peakHours[0]?.hour || 0)}
                    </span>
                    {' '}para mayor alcance
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin datos de registros aún</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hourly Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribución por Hora
            </CardTitle>
            <CardDescription>
              Actividad de registro durante el día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-0.5">
              {stats.timing.hourlyRegistrations.map((count, hour) => {
                const maxCount = Math.max(...stats.timing.hourlyRegistrations);
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const isHighlight = stats.timing.peakHours.some(p => p.hour === hour);
                return (
                  <div 
                    key={hour}
                    className="flex-1 flex flex-col items-center gap-1 group relative"
                    title={`${formatHour(hour)}: ${count} registros`}
                  >
                    <div 
                      className={`w-full rounded-t transition-all ${
                        isHighlight ? 'bg-primary' : count > 0 ? 'bg-primary/40' : 'bg-muted'
                      }`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatHour(hour)}: {count}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly and Registration Timeline */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Registros por Día de la Semana
            </CardTitle>
            <CardDescription>
              {stats.timing.peakDay.count > 0 
                ? `El ${stats.timing.peakDay.name} es tu mejor día con ${stats.timing.peakDay.count} registros`
                : 'Patrones semanales de inscripción'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.timing.dailyRegistrations.map((day) => {
                const maxCount = Math.max(...stats.timing.dailyRegistrations.map(d => d.count));
                const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                const isPeak = day.count === maxCount && day.count > 0;
                return (
                  <div key={day.name} className="flex items-center gap-3">
                    <span className={`text-sm w-10 ${isPeak ? 'font-bold text-primary' : ''}`}>
                      {day.name}
                    </span>
                    <div className="flex-1">
                      <div 
                        className={`h-5 rounded ${isPeak ? 'bg-primary' : 'bg-primary/30'} flex items-center px-2`}
                        style={{ width: `${Math.max(percentage, day.count > 0 ? 10 : 0)}%` }}
                      >
                        {day.count > 0 && (
                          <span className="text-xs text-primary-foreground">{day.count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Registration Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Timeline de Registros
            </CardTitle>
            <CardDescription>
              Inscripciones por fecha
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.timing.registrationsByDate.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.timing.registrationsByDate.map(([date, count]) => {
                  const maxCount = Math.max(...stats.timing.registrationsByDate.map(([, c]) => c));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-14">{date}</span>
                      <div className="flex-1">
                        <div 
                          className="h-4 bg-primary/80 rounded flex items-center justify-end px-2"
                          style={{ width: `${Math.max(percentage, 15)}%` }}
                        >
                          <span className="text-xs text-primary-foreground font-medium">{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin registros en este período</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Insights para Futuros Torneos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Early vs Late */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Tipos de Registro</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Anticipados (+7 días)</p>
                  <p className="text-lg font-bold text-green-500">{stats.timing.earlyBirds}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última hora (-1 día)</p>
                  <p className="text-lg font-bold text-orange-500">{stats.timing.lastMinute}</p>
                </div>
              </div>
              {stats.timing.lastMinute > stats.timing.earlyBirds && (
                <p className="text-xs text-yellow-500">
                  ⚠️ Muchos registros de última hora. Considera promocionar antes.
                </p>
              )}
            </div>

            {/* Fill Rate Insight */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Tasa de Llenado</span>
              </div>
              <p className="text-2xl font-bold">{stats.totals.fillRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">
                {stats.totals.fillRate >= 90 
                  ? '🔥 Excelente! Considera aumentar cupos para el próximo.'
                  : stats.totals.fillRate >= 70
                  ? '👍 Buen nivel de inscripción.'
                  : stats.totals.fillRate >= 50
                  ? '📣 Podrías mejorar la promoción.'
                  : '⚠️ Necesitas más difusión o ajustar el formato.'
                }
              </p>
            </div>

            {/* Show Rate Insight (for in-person) */}
            {isInPerson && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Tasa de Asistencia</span>
                </div>
                <p className="text-2xl font-bold">{stats.totals.showRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totals.showRate >= 90 
                    ? '🎯 Excelente compromiso de jugadores!'
                    : stats.totals.showRate >= 75
                    ? '👍 Buena asistencia. Considera recordatorios.'
                    : stats.totals.showRate >= 50
                    ? '📧 Envía recordatorios 1 día antes.'
                    : '⚠️ Implementa confirmación de asistencia obligatoria.'
                  }
                </p>
              </div>
            )}

            {/* Best Promotion Time */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Mejor Momento para Promocionar</span>
              </div>
              {stats.timing.peakHours[0] && stats.timing.peakDay.count > 0 ? (
                <>
                  <p className="text-lg font-bold">
                    {stats.timing.peakDay.name} a las {formatHour(stats.timing.peakHours[0].hour)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Basado en tus datos de inscripción
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sin datos suficientes aún</p>
              )}
            </div>

            {/* Tournament Format Insight */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Formato del Torneo</span>
              </div>
              <p className="text-lg font-bold">
                {tournament.format === 'single-elimination' ? 'Eliminación Simple' :
                 tournament.format === 'double-elimination' ? 'Doble Eliminación' : 'Sistema Suizo'}
              </p>
              <p className="text-xs text-muted-foreground">
                {tournament.format === 'single-elimination' 
                  ? `${stats.matches.total} partidas para ${stats.totals.accepted} jugadores`
                  : tournament.format === 'double-elimination'
                  ? 'Los jugadores tienen segunda oportunidad'
                  : 'Todos juegan múltiples rondas'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
