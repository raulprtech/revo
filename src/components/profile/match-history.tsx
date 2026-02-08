"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Gamepad2,
  Trophy,
  Calendar,
  MapPin,
  ArrowRight,
  ScrollText,
  Crown,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Tournament, AwardedBadge } from "@/lib/database";
import { cn } from "@/lib/utils";

type ParticipantStatus = "Aceptado" | "Pendiente" | "Rechazado";

export interface TournamentHistoryEntry {
  tournament: Tournament;
  status: ParticipantStatus;
  badge?: AwardedBadge;
}

function getPositionDisplay(badge?: AwardedBadge): {
  label: string;
  icon: string;
  className: string;
} | null {
  if (!badge) return null;

  const pos = badge.position;
  const type = badge.badge.type;

  if (pos === "1" || type === "champion")
    return { label: "Campeón", icon: "🥇", className: "text-yellow-500 border-yellow-500/40 bg-yellow-500/10" };
  if (pos === "2" || type === "runner-up")
    return { label: "Subcampeón", icon: "🥈", className: "text-gray-400 border-gray-400/40 bg-gray-400/10" };
  if (pos === "3" || type === "third-place")
    return { label: "3er Lugar", icon: "🥉", className: "text-amber-700 border-amber-700/40 bg-amber-700/10" };
  if (type === "top-4")
    return { label: "Top 4", icon: "🎖️", className: "text-blue-400 border-blue-400/40 bg-blue-400/10" };
  if (type === "top-8")
    return { label: "Top 8", icon: "🎖️", className: "text-blue-400 border-blue-400/40 bg-blue-400/10" };
  if (type === "mvp")
    return { label: "MVP", icon: "⭐", className: "text-purple-400 border-purple-400/40 bg-purple-400/10" };
  if (type === "participant")
    return { label: "Participante", icon: "🎮", className: "text-muted-foreground border-border bg-muted" };
  if (pos && parseInt(pos) <= 16)
    return { label: `Top ${pos}`, icon: "🎖️", className: "text-blue-400 border-blue-400/40 bg-blue-400/10" };

  return {
    label: badge.badge.name,
    icon: badge.badge.icon,
    className: "text-muted-foreground border-border bg-muted",
  };
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "Finalizado":
      return "text-green-500";
    case "En Curso":
      return "text-blue-500";
    case "Próximo":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

function getFormatLabel(format?: string) {
  switch (format) {
    case "single-elimination":
      return "Eliminación Simple";
    case "double-elimination":
      return "Doble Eliminación";
    case "swiss":
      return "Suizo";
    default:
      return format || "";
  }
}

// ---- Main Component ----
interface MatchHistoryProps {
  entries: TournamentHistoryEntry[];
}

export function MatchHistory({ entries }: MatchHistoryProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            Historial de Torneos
          </CardTitle>
          <CardDescription>
            Tu historial competitivo aparecerá aquí
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              Aún no tienes historial de torneos.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Participa en torneos para construir tu perfil competitivo.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/tournaments">
                <Gamepad2 className="mr-2 h-4 w-4" />
                Explorar Torneos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort: finished first (by date desc), then active, then upcoming
  const sortedEntries = [...entries].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      Finalizado: 0,
      "En Curso": 1,
      Próximo: 2,
    };
    const aOrder = statusOrder[a.tournament.status] ?? 3;
    const bOrder = statusOrder[b.tournament.status] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (
      new Date(b.tournament.start_date).getTime() -
      new Date(a.tournament.start_date).getTime()
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          Historial de Torneos
        </CardTitle>
        <CardDescription>
          {entries.length} torneo{entries.length !== 1 ? "s" : ""} en tu historial competitivo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedEntries.map(({ tournament, status, badge }) => {
            const posDisplay = getPositionDisplay(badge);
            return (
              <div
                key={tournament.id}
                className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                {/* Badge/Position indicator */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {posDisplay ? (
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg",
                        posDisplay.className
                      )}
                    >
                      {posDisplay.icon}
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Gamepad2 className="h-5 w-5" />
                    </div>
                  )}

                  {/* Tournament Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {tournament.name}
                      </p>
                      {posDisplay && (
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 text-[10px] px-1.5 py-0", posDisplay.className)}
                        >
                          {posDisplay.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="h-3 w-3" />
                        {tournament.game}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(tournament.start_date)}
                      </span>
                      {tournament.format && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          {getFormatLabel(tournament.format)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tournament.participants}/{tournament.max_participants}
                      </span>
                      {tournament.location && (
                        <span className="hidden sm:flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {tournament.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status + Link */}
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getStatusColor(tournament.status))}
                  >
                    {tournament.status}
                  </Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/tournaments/${tournament.id}`}>
                      Ver
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
