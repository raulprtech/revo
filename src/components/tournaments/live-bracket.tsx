"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, Gamepad2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Round, Match, MatchPlayer, CosmeticsMap } from "./bracket";
import { useEffect, useState } from "react";

// =============================================
// Read-only Match Card with live highlight animations
// =============================================

function LiveMatchCard({ match, isNew, cosmeticsMap }: { match: Match; isNew?: boolean; cosmeticsMap?: CosmeticsMap }) {
  const isTopWinner = match.winner === match.top.name;
  const isBottomWinner = match.winner === match.bottom.name;
  const hasResult = match.winner !== null;

  const getInitials = (name: string) => {
    if (name === "TBD" || name === "BYE") return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    if (name === "TBD") return "bg-muted text-muted-foreground";
    if (name === "BYE") return "bg-muted/50 text-muted-foreground";
    const colors = [
      "bg-red-500/20 text-red-500",
      "bg-blue-500/20 text-blue-500",
      "bg-green-500/20 text-green-500",
      "bg-yellow-500/20 text-yellow-500",
      "bg-purple-500/20 text-purple-500",
      "bg-pink-500/20 text-pink-500",
      "bg-indigo-500/20 text-indigo-500",
      "bg-teal-500/20 text-teal-500",
    ];
    const index = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const getBracketBadge = () => {
    if (!match.bracket || match.bracket === "winners") return null;
    const variants: Record<string, { color: string; label: string }> = {
      losers: { color: "bg-orange-500/20 text-orange-500", label: "L" },
      finals: { color: "bg-yellow-500/20 text-yellow-500", label: "GF" },
      swiss: { color: "bg-blue-500/20 text-blue-500", label: "S" },
    };
    const variant = variants[match.bracket];
    return variant ? (
      <Badge className={cn("text-xs h-5", variant.color)}>
        {variant.label}
      </Badge>
    ) : null;
  };

  // Determine if this match is currently "active" (players assigned, no winner yet)
  const isActive =
    match.top.name !== "TBD" &&
    match.bottom.name !== "TBD" &&
    match.bottom.name !== "BYE" &&
    !match.winner;

  // ─── Cosmetics helpers ───
  const getPlayerCosmetics = (player: MatchPlayer) => {
    if (!cosmeticsMap || !player.email) return null;
    return cosmeticsMap[player.email] || null;
  };

  const getAvatarSrc = (player: MatchPlayer) => {
    const cosmetics = getPlayerCosmetics(player);
    if (cosmetics?.avatarCollection?.dicebear_style) {
      const seed = cosmetics.avatarCollection.seeds?.[0] || player.name;
      return `https://api.dicebear.com/9.x/${cosmetics.avatarCollection.dicebear_style}/svg?seed=${encodeURIComponent(seed)}`;
    }
    return player.avatar || undefined;
  };

  const getFrameStyle = (player: MatchPlayer): React.CSSProperties | undefined => {
    const cosmetics = getPlayerCosmetics(player);
    if (!cosmetics?.bracketFrame) return undefined;
    const frame = cosmetics.bracketFrame;
    if (frame.gradient) {
      return {
        border: '2px solid transparent',
        backgroundImage: `linear-gradient(var(--card), var(--card)), linear-gradient(135deg, ${frame.gradient.join(', ')})`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        ...(frame.glow ? { boxShadow: `0 0 8px ${frame.glow_color || '#FFD700'}40` } : {}),
      };
    }
    return {
      border: `2px solid ${frame.border_color || '#FFD700'}`,
      ...(frame.glow ? { boxShadow: `0 0 8px ${frame.glow_color || frame.border_color || '#FFD700'}40` } : {}),
    };
  };

  const getNicknameStyle = (player: MatchPlayer): React.CSSProperties | undefined => {
    const cosmetics = getPlayerCosmetics(player);
    if (!cosmetics?.nicknameColor) return undefined;
    const nick = cosmetics.nicknameColor;
    if (nick.gradient && nick.colors) {
      return {
        backgroundImage: `linear-gradient(90deg, ${nick.colors.join(', ')})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      };
    }
    if (nick.color) {
      return { color: nick.color };
    }
    return undefined;
  };

  const hasFrame = (player: MatchPlayer) => !!getPlayerCosmetics(player)?.bracketFrame;

  return (
    <Card
      className={cn(
        "bg-card/50 w-full transition-all duration-500",
        match.bracket === "losers" && "border-orange-500/30",
        match.bracket === "finals" && "border-yellow-500/30 bg-yellow-500/5",
        isActive && "border-green-500/50 shadow-green-500/10 shadow-md",
        isNew && "animate-pulse border-primary shadow-primary/20 shadow-lg",
        hasResult && "opacity-90"
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Active match indicator */}
        {isActive && (
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] font-semibold text-green-500 uppercase tracking-wider">
              En juego
            </span>
          </div>
        )}

        {/* Top player */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar
              className={cn(
                "h-7 w-7 flex-shrink-0",
                isTopWinner && !hasFrame(match.top) &&
                  "ring-2 ring-primary ring-offset-1 ring-offset-background",
                getPlayerCosmetics(match.top)?.bracketFrame?.animation === 'fire' && "animate-pulse"
              )}
              style={getFrameStyle(match.top)}
            >
              <AvatarImage
                src={getAvatarSrc(match.top)}
                alt={match.top.name}
              />
              <AvatarFallback
                className={cn("text-xs", getAvatarColor(match.top.name))}
              >
                {getInitials(match.top.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "text-sm truncate",
                isTopWinner && !getNicknameStyle(match.top) && "font-bold text-primary",
                isTopWinner && getNicknameStyle(match.top) && "font-bold",
                match.top.name === "BYE" && "text-muted-foreground italic",
                match.top.name === "TBD" && "text-muted-foreground"
              )}
              style={match.top.name !== 'TBD' && match.top.name !== 'BYE' ? getNicknameStyle(match.top) : undefined}
            >
              {match.top.name}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {getBracketBadge()}
            <span
              className={cn(
                "text-sm font-mono px-2 py-0.5 rounded min-w-[2rem] text-center",
                isTopWinner ? "bg-primary/20 text-primary" : "bg-muted"
              )}
            >
              {match.top.score ?? "-"}
            </span>
          </div>
        </div>

        <Separator />

        {/* Bottom player */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar
              className={cn(
                "h-7 w-7 flex-shrink-0",
                isBottomWinner && !hasFrame(match.bottom) &&
                  "ring-2 ring-primary ring-offset-1 ring-offset-background",
                getPlayerCosmetics(match.bottom)?.bracketFrame?.animation === 'fire' && "animate-pulse"
              )}
              style={getFrameStyle(match.bottom)}
            >
              <AvatarImage
                src={getAvatarSrc(match.bottom)}
                alt={match.bottom.name}
              />
              <AvatarFallback
                className={cn("text-xs", getAvatarColor(match.bottom.name))}
              >
                {getInitials(match.bottom.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "text-sm truncate",
                isBottomWinner && !getNicknameStyle(match.bottom) && "font-bold text-primary",
                isBottomWinner && getNicknameStyle(match.bottom) && "font-bold",
                match.bottom.name === "BYE" && "text-muted-foreground italic",
                match.bottom.name === "TBD" && "text-muted-foreground"
              )}
              style={match.bottom.name !== 'TBD' && match.bottom.name !== 'BYE' ? getNicknameStyle(match.bottom) : undefined}
            >
              {match.bottom.name}
            </span>
          </div>
          <span
            className={cn(
              "text-sm font-mono px-2 py-0.5 rounded min-w-[2rem] text-center flex-shrink-0",
              isBottomWinner ? "bg-primary/20 text-primary" : "bg-muted"
            )}
          >
            {match.bottom.score ?? "-"}
          </span>
        </div>

        {/* Station display (read-only) */}
        {match.station && (
          <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded mt-1">
            <Gamepad2 className="h-3 w-3" />
            <span className="font-medium">{match.station.name}</span>
            {match.station.location && (
              <span className="text-muted-foreground">
                • {match.station.location}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// Live Bracket Component
// =============================================

interface LiveBracketProps {
  rounds: Round[];
  format: string;
  gameMode?: string;
  /** IDs of matches that were just updated (for flash animation) */
  updatedMatchIds?: Set<number>;
  /** Cosmetics for bracket display */
  cosmeticsMap?: CosmeticsMap;
}

export default function LiveBracket({
  rounds,
  format,
  gameMode,
  updatedMatchIds,
  cosmeticsMap,
}: LiveBracketProps) {
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());

  // Flash recently updated matches
  useEffect(() => {
    if (updatedMatchIds && updatedMatchIds.size > 0) {
      setFlashIds(updatedMatchIds);
      const timer = setTimeout(() => setFlashIds(new Set()), 2000);
      return () => clearTimeout(timer);
    }
  }, [updatedMatchIds]);

  const getWinner = () => {
    if (rounds.length === 0) return null;
    const finalsRound = rounds.find((r) => r.bracket === "finals");
    if (finalsRound && finalsRound.matches[0]?.winner) {
      return finalsRound.matches[0].winner;
    }
    return rounds[rounds.length - 1].matches[0]?.winner;
  };

  const tournamentWinner = getWinner();
  const winnersRounds = rounds.filter(
    (r) => r.bracket === "winners" || !r.bracket
  );
  const losersRounds = rounds.filter((r) => r.bracket === "losers");
  const finalsRound = rounds.find((r) => r.bracket === "finals");
  const isDoubleElimination =
    format === "double-elimination" && losersRounds.length > 0;

  const formatDisplay =
    {
      "single-elimination": "Eliminación Simple",
      "double-elimination": "Doble Eliminación",
      swiss: "Sistema Suizo",
    }[format] || format;

  // Stats
  const totalMatches = rounds.reduce((sum, r) => sum + r.matches.length, 0);
  const completedMatches = rounds.reduce(
    (sum, r) => sum + r.matches.filter((m) => m.winner).length,
    0
  );
  const activeMatches = rounds.reduce(
    (sum, r) =>
      sum +
      r.matches.filter(
        (m) =>
          !m.winner &&
          m.top.name !== "TBD" &&
          m.bottom.name !== "TBD" &&
          m.bottom.name !== "BYE"
      ).length,
    0
  );
  const progress =
    totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  if (rounds.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Bracket aún no disponible
          </h3>
          <p className="text-muted-foreground">
            El bracket se generará cuando el torneo comience.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live stats bar */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <Badge variant="secondary" className="gap-1.5">
          <Gamepad2 className="h-3.5 w-3.5" />
          {formatDisplay}
        </Badge>
        {gameMode && (
          <Badge variant="outline" className="gap-1">
            {gameMode}
          </Badge>
        )}
        <Badge
          variant="outline"
          className="gap-1.5 bg-green-500/10 text-green-600 border-green-500/30"
        >
          <Zap className="h-3.5 w-3.5" />
          {activeMatches} partida{activeMatches !== 1 ? "s" : ""} activa
          {activeMatches !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <Trophy className="h-3.5 w-3.5" />
          {completedMatches}/{totalMatches} completadas
        </Badge>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">{progress}%</span>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Winners bracket */}
      <div>
        {isDoubleElimination && (
          <h3 className="text-lg font-semibold mb-4 text-green-500 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Winners Bracket
          </h3>
        )}
        <div className="flex space-x-4 md:space-x-8 lg:space-x-12 overflow-x-auto pb-4">
          {winnersRounds.map((round) => (
            <div
              key={round.name}
              className="flex flex-col space-y-4 min-w-[250px]"
            >
              <h3 className="text-xl font-bold text-center font-headline">
                {round.name}
              </h3>
              <div className="flex flex-col justify-around flex-grow space-y-8">
                {round.matches.map((match) => (
                  <LiveMatchCard
                    key={match.id}
                    match={match}
                    isNew={flashIds.has(match.id)}
                    cosmeticsMap={cosmeticsMap}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Champion display */}
          {!isDoubleElimination && (
            <div className="flex flex-col space-y-4 min-w-[250px] items-center justify-center">
              <h3 className="text-xl font-bold text-center font-headline">
                Campeón
              </h3>
              <Trophy
                className={cn(
                  "w-24 h-24",
                  tournamentWinner
                    ? "text-yellow-400 animate-bounce"
                    : "text-muted-foreground"
                )}
              />
              <p
                className={cn(
                  "font-bold text-lg",
                  tournamentWinner && "text-primary"
                )}
              >
                {tournamentWinner || "TBD"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Losers bracket */}
      {isDoubleElimination && losersRounds.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-orange-500 flex items-center gap-2">
            <span className="text-xl">💀</span>
            Losers Bracket
          </h3>
          <div className="flex space-x-4 md:space-x-8 overflow-x-auto pb-4">
            {losersRounds.map((round) => (
              <div
                key={round.name}
                className="flex flex-col space-y-4 min-w-[220px]"
              >
                <h3 className="text-lg font-bold text-center">{round.name}</h3>
                <div className="flex flex-col justify-around flex-grow space-y-6">
                  {round.matches.map((match) => (
                    <LiveMatchCard
                      key={match.id}
                      match={match}
                      isNew={flashIds.has(match.id)}
                      cosmeticsMap={cosmeticsMap}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grand finals */}
      {isDoubleElimination && finalsRound && (
        <div className="flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-4 text-yellow-500 flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Gran Final
          </h3>
          <div className="w-full max-w-md">
            {finalsRound.matches.map((match) => (
              <LiveMatchCard
                key={match.id}
                match={match}
                isNew={flashIds.has(match.id)}
                cosmeticsMap={cosmeticsMap}
              />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Trophy
              className={cn(
                "w-20 h-20 mx-auto",
                tournamentWinner
                  ? "text-yellow-400 animate-bounce"
                  : "text-muted-foreground"
              )}
            />
            <p
              className={cn(
                "font-bold text-xl mt-2",
                tournamentWinner && "text-primary"
              )}
            >
              {tournamentWinner || "Por determinar"}
            </p>
            <p className="text-sm text-muted-foreground">Campeón</p>
          </div>
        </div>
      )}

      {/* Winner celebration */}
      {tournamentWinner && (
        <div className="text-center py-6 bg-gradient-to-r from-yellow-500/10 via-primary/10 to-yellow-500/10 rounded-xl border border-yellow-500/20">
          <Trophy className="w-12 h-12 mx-auto text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-primary">{tournamentWinner}</p>
          <p className="text-sm text-muted-foreground mt-1">
            🏆 ¡Campeón del torneo!
          </p>
        </div>
      )}
    </div>
  );
}
