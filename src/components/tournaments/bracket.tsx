"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Trophy, Expand, Users, Gamepad2, MapPin } from "lucide-react";
import { useState, useRef } from "react";
import { ReportScoreDialog } from "./report-score-dialog";
import type { Tournament, GameStation } from "@/lib/database";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Game mode configurations for score display
const GAME_MODE_CONFIG: Record<string, {
    scoreLabel: string;
    scoreType: 'points' | 'games' | 'rounds' | 'sets' | 'races';
    bestOf?: number;
}> = {
    // FIFA
    '1v1': { scoreLabel: 'Goles', scoreType: 'points' },
    '2v2': { scoreLabel: 'Goles', scoreType: 'points' },
    'pro-clubs': { scoreLabel: 'Goles', scoreType: 'points' },
    'fut-draft': { scoreLabel: 'Goles', scoreType: 'points' },
    // Fighting games
    '1v1-ft2': { scoreLabel: 'Rondas', scoreType: 'rounds', bestOf: 3 },
    '1v1-ft3': { scoreLabel: 'Rondas', scoreType: 'rounds', bestOf: 5 },
    '1v1-ft5': { scoreLabel: 'Rondas', scoreType: 'rounds', bestOf: 9 },
    '3v3-team': { scoreLabel: 'Victorias', scoreType: 'games' },
    'round-robin-team': { scoreLabel: 'Victorias', scoreType: 'games' },
    // Smash Bros
    '1v1-stocks': { scoreLabel: 'Stocks', scoreType: 'games', bestOf: 3 },
    '1v1-time': { scoreLabel: 'KOs', scoreType: 'points' },
    '2v2-teams': { scoreLabel: 'Victorias', scoreType: 'games' },
    'free-for-all': { scoreLabel: 'Posición', scoreType: 'points' },
    // Mario Kart
    'grand-prix': { scoreLabel: 'Puntos', scoreType: 'points' },
    'vs-race': { scoreLabel: 'Posición', scoreType: 'points' },
    'battle-mode': { scoreLabel: 'Puntos', scoreType: 'points' },
    'team-race': { scoreLabel: 'Puntos', scoreType: 'points' },
    // Clash Royale
    '1v1-ladder': { scoreLabel: 'Coronas', scoreType: 'points' },
    '1v1-tournament': { scoreLabel: 'Victorias', scoreType: 'games', bestOf: 3 },
    'draft': { scoreLabel: 'Victorias', scoreType: 'games' },
};

// Helper to check if game mode is team-based
const isTeamMode = (gameMode: string) => 
    ['2v2', 'pro-clubs', '3v3-team', '2v2-teams', 'team-race'].includes(gameMode);

// Helper to check if game mode is FFA
const isFreeForAll = (gameMode: string) => 
    ['free-for-all', 'grand-prix', 'vs-race'].includes(gameMode);

// Type for seeded player data (can be string or object with name and avatar)
type SeededPlayer = string | { name: string; avatar?: string | null; email?: string | null };

// Helper to normalize player data
const normalizePlayer = (player: SeededPlayer): { name: string; avatar?: string | null; email?: string | null } => {
    if (typeof player === 'string') {
        return { name: player, avatar: null, email: null };
    }
    return { name: player.name, avatar: player.avatar ?? null, email: player.email ?? null };
};

export const generateRounds = (numParticipants: number, seededPlayers?: SeededPlayer[], format?: string) => {
    if (numParticipants < 2) return [];

    if (!seededPlayers || seededPlayers.length === 0) {
        return [];
    }

    // Normalize all players to objects
    const normalizedPlayers = seededPlayers.map(normalizePlayer);
    
    // For single elimination
    if (!format || format === 'single-elimination') {
        return generateSingleEliminationRounds(normalizedPlayers);
    }
    
    // For double elimination
    if (format === 'double-elimination') {
        return generateDoubleEliminationRounds(normalizedPlayers);
    }
    
    // For Swiss, we handle rounds differently (generated per round)
    if (format === 'swiss') {
        return generateSwissRound(normalizedPlayers, 1);
    }

    return generateSingleEliminationRounds(normalizedPlayers);
}

// Single Elimination bracket generation
function generateSingleEliminationRounds(players: { name: string; avatar?: string | null; email?: string | null }[]) {
    const numParticipants = players.length;
    let n = 1;
    while (n < numParticipants) {
        n *= 2;
    }
    const bracketSize = n;
    const byes = bracketSize - numParticipants;

    const allPlayers = [...players];
    for (let i = 0; i < byes; i++) {
        allPlayers.push({ name: "BYE", avatar: null, email: null });
    }

    const rounds: Round[] = [];
    let currentPlayers = allPlayers;
    let roundIndex = 1;
    let matchId = 1;

    while (currentPlayers.length > 1) {
        const roundName = currentPlayers.length === 2 ? "Final" : 
                          currentPlayers.length === 4 ? "Semifinales" : 
                          currentPlayers.length === 8 ? "Cuartos" :
                          `Ronda ${roundIndex}`;
        const matches: Match[] = [];
        const nextRoundPlayers: { name: string; avatar?: string | null; email?: string | null }[] = [];

        for (let i = 0; i < currentPlayers.length; i += 2) {
            const top = currentPlayers[i];
            const bottom = currentPlayers[i + 1];
            
            const isTopBye = top.name === "BYE";
            const isBottomBye = bottom.name === "BYE";
            const winner = isBottomBye ? top.name : (isTopBye ? bottom.name : null);

            matches.push({
                id: matchId++,
                top: { name: top.name, score: null, avatar: top.avatar, email: top.email },
                bottom: { name: bottom.name, score: null, avatar: bottom.avatar, email: bottom.email },
                winner: winner,
                bracket: 'winners',
            });

            if (winner) {
                const winnerPlayer = isBottomBye ? top : bottom;
                nextRoundPlayers.push({ name: winner, avatar: winnerPlayer.avatar, email: winnerPlayer.email });
            } else {
                nextRoundPlayers.push({ name: "TBD" });
            }
        }
        
        rounds.push({ name: roundName, matches, bracket: 'winners' });
        currentPlayers = nextRoundPlayers;
        roundIndex++;
    }

    propagateWinners(rounds);
    return rounds;
}

// Double Elimination bracket generation
function generateDoubleEliminationRounds(players: { name: string; avatar?: string | null; email?: string | null }[]) {
    const winnersRounds = generateSingleEliminationRounds(players);
    
    winnersRounds.forEach(round => {
        round.bracket = 'winners';
        round.name = `W ${round.name}`;
    });

    const numWinnersRounds = winnersRounds.length;
    const losersRounds: Round[] = [];
    
    let losersMatchId = 1000;
    
    for (let i = 0; i < numWinnersRounds - 1; i++) {
        const numLosers = winnersRounds[i].matches.length;
        
        const dropdownRound: Round = {
            name: `L Ronda ${i * 2 + 1}`,
            bracket: 'losers',
            matches: []
        };
        
        for (let j = 0; j < Math.ceil(numLosers / 2); j++) {
            dropdownRound.matches.push({
                id: losersMatchId++,
                top: { name: "TBD", score: null, avatar: null },
                bottom: { name: "TBD", score: null, avatar: null },
                winner: null,
                bracket: 'losers',
            });
        }
        
        losersRounds.push(dropdownRound);
        
        if (dropdownRound.matches.length > 1) {
            const reductionRound: Round = {
                name: `L Ronda ${i * 2 + 2}`,
                bracket: 'losers',
                matches: []
            };
            
            for (let j = 0; j < Math.ceil(dropdownRound.matches.length / 2); j++) {
                reductionRound.matches.push({
                    id: losersMatchId++,
                    top: { name: "TBD", score: null, avatar: null },
                    bottom: { name: "TBD", score: null, avatar: null },
                    winner: null,
                    bracket: 'losers',
                });
            }
            losersRounds.push(reductionRound);
        }
    }

    const grandFinals: Round = {
        name: "Gran Final",
        bracket: 'finals',
        matches: [{
            id: losersMatchId++,
            top: { name: "TBD (Winners)", score: null, avatar: null },
            bottom: { name: "TBD (Losers)", score: null, avatar: null },
            winner: null,
            bracket: 'finals',
        }]
    };

    return [...winnersRounds, ...losersRounds, grandFinals];
}

// Swiss round generation
function generateSwissRound(players: { name: string; avatar?: string | null; email?: string | null }[], roundNumber: number) {
    const matches: Match[] = [];
    let matchId = roundNumber * 100;

    for (let i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
            matches.push({
                id: matchId++,
                top: { name: players[i].name, score: null, avatar: players[i].avatar, email: players[i].email },
                bottom: { name: players[i + 1].name, score: null, avatar: players[i + 1].avatar, email: players[i + 1].email },
                winner: null,
                bracket: 'swiss',
            });
        } else {
            matches.push({
                id: matchId++,
                top: { name: players[i].name, score: null, avatar: players[i].avatar, email: players[i].email },
                bottom: { name: "BYE", score: null, avatar: null },
                winner: players[i].name,
                bracket: 'swiss',
            });
        }
    }

    return [{
        name: `Ronda ${roundNumber}`,
        matches,
        bracket: 'swiss' as const,
    }];
}

function propagateWinners(rounds: Round[]) {
    let updated = true;
    while (updated) {
        updated = false;
        for (let i = 0; i < rounds.length - 1; i++) {
            const round = rounds[i];
            const nextRound = rounds[i + 1];

            for (let j = 0; j < round.matches.length; j++) {
                const match = round.matches[j];

                if (match.winner) {
                    const winnerPlayer = match.top.name === match.winner ? match.top : 
                                       (match.bottom.name === match.winner ? match.bottom : null);
                    
                    if (!winnerPlayer) continue;

                    const nextMatchIndex = Math.floor(j / 2);
                    const nextMatch = nextRound.matches[nextMatchIndex];
                    if (nextMatch) {
                        const isTopSlot = j % 2 === 0;
                        if (isTopSlot) {
                            if (nextMatch.top.name === "TBD") {
                                nextMatch.top.name = winnerPlayer.name;
                                nextMatch.top.avatar = winnerPlayer.avatar;
                                nextMatch.top.email = winnerPlayer.email;
                                if (nextMatch.bottom.name === 'BYE') {
                                    nextMatch.winner = match.winner;
                                }
                                updated = true;
                            }
                        } else {
                            if (nextMatch.bottom.name === "TBD") {
                                nextMatch.bottom.name = winnerPlayer.name;
                                nextMatch.bottom.avatar = winnerPlayer.avatar;
                                nextMatch.bottom.email = winnerPlayer.email;
                                if (nextMatch.top.name === 'BYE') {
                                    nextMatch.winner = match.winner;
                                }
                                updated = true;
                            }
                        }
                    }
                }
            }
        }
    }
}

export type MatchPlayer = {
    name: string;
    score: number | null;
    avatar?: string | null;
    email?: string | null;
};

export type Match = {
    id: number;
    top: MatchPlayer;
    bottom: MatchPlayer;
    winner: string | null;
    bracket?: 'winners' | 'losers' | 'finals' | 'swiss';
    station?: {
        id: string;
        name: string;
        location?: string;
    } | null;
};

export type Round = {
    name: string;
    matches: Match[];
    bracket?: 'winners' | 'losers' | 'finals' | 'swiss';
};

/** Cosmetics data for a single player, keyed by email */
export type PlayerCosmetics = {
    bracketFrame?: { border_color?: string; border_style?: string; glow?: boolean; glow_color?: string; gradient?: string[]; animation?: string } | null;
    nicknameColor?: { color?: string; gradient?: boolean; colors?: string[]; animated?: boolean } | null;
    avatarCollection?: { dicebear_style?: string; seeds?: string[] } | null;
};

/** Map of email → cosmetics for all participants */
export type CosmeticsMap = Record<string, PlayerCosmetics>;

interface MatchCardProps {
    match: Match;
    onScoreReported: (matchId: number, scores: { top: number, bottom: number }) => void;
    isOwner: boolean;
    gameMode?: string;
    stations?: GameStation[];
    onStationAssigned?: (matchId: number, stationId: string | null) => void;
    cosmeticsMap?: CosmeticsMap;
}

const MatchCard = ({ match, onScoreReported, isOwner, gameMode, stations, onStationAssigned, cosmeticsMap }: MatchCardProps) => {
    const isTopWinner = match.winner === match.top.name;
    const isBottomWinner = match.winner === match.bottom.name;
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const modeConfig = gameMode ? GAME_MODE_CONFIG[gameMode] : undefined;
    const scoreLabel = modeConfig?.scoreLabel || 'Puntos';

    const canReport = match.top.name !== 'TBD' && 
                      match.bottom.name !== 'TBD' && 
                      !match.winner && 
                      match.bottom.name !== 'BYE' &&
                      !match.top.name.includes('(Winners)') &&
                      !match.top.name.includes('(Losers)') &&
                      isOwner;

    // Get initials from name for avatar fallback
    const getInitials = (name: string) => {
        if (name === 'TBD' || name === 'BYE') return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Get background color based on name for consistent colors
    const getAvatarColor = (name: string) => {
        if (name === 'TBD') return 'bg-muted text-muted-foreground';
        if (name === 'BYE') return 'bg-muted/50 text-muted-foreground';
        const colors = [
            'bg-red-500/20 text-red-500',
            'bg-blue-500/20 text-blue-500',
            'bg-green-500/20 text-green-500',
            'bg-yellow-500/20 text-yellow-500',
            'bg-purple-500/20 text-purple-500',
            'bg-pink-500/20 text-pink-500',
            'bg-indigo-500/20 text-indigo-500',
            'bg-teal-500/20 text-teal-500',
        ];
        const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    const getBracketBadge = () => {
        if (!match.bracket || match.bracket === 'winners') return null;
        
        const variants: Record<string, { color: string; label: string }> = {
            losers: { color: 'bg-orange-500/20 text-orange-500', label: 'L' },
            finals: { color: 'bg-yellow-500/20 text-yellow-500', label: 'GF' },
            swiss: { color: 'bg-blue-500/20 text-blue-500', label: 'S' },
        };
        
        const variant = variants[match.bracket];
        return variant ? (
            <Badge className={cn("text-xs h-5", variant.color)}>{variant.label}</Badge>
        ) : null;
    };

    // Resolve cosmetics for a player
    const getPlayerCosmetics = (player: MatchPlayer) => {
        if (!cosmeticsMap || !player.email) return null;
        return cosmeticsMap[player.email] || null;
    };

    // Get avatar src considering cosmetics
    const getAvatarSrc = (player: MatchPlayer) => {
        const cosmetics = getPlayerCosmetics(player);
        if (cosmetics?.avatarCollection?.dicebear_style) {
            const seed = cosmetics.avatarCollection.seeds?.[0] || player.name;
            return `https://api.dicebear.com/9.x/${cosmetics.avatarCollection.dicebear_style}/svg?seed=${encodeURIComponent(seed)}`;
        }
        return player.avatar || undefined;
    };

    // Get frame style for avatar
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

    // Get nickname style
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
        <>
            <Card className={cn(
                "bg-card/50 w-full",
                match.bracket === 'losers' && "border-orange-500/30",
                match.bracket === 'finals' && "border-yellow-500/30 bg-yellow-500/5"
            )}>
                <CardContent className="p-3 space-y-2">
                    {/* Top player */}
                    <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Avatar
                                className={cn(
                                    "h-7 w-7 flex-shrink-0",
                                    isTopWinner && !hasFrame(match.top) && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                                    getPlayerCosmetics(match.top)?.bracketFrame?.animation === 'fire' && "animate-pulse"
                                )}
                                style={getFrameStyle(match.top)}
                            >
                                <AvatarImage src={getAvatarSrc(match.top)} alt={match.top.name} />
                                <AvatarFallback className={cn("text-xs", getAvatarColor(match.top.name))}>
                                    {getInitials(match.top.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span
                                className={cn(
                                    "text-sm truncate",
                                    isTopWinner && !getNicknameStyle(match.top) && "font-bold text-primary",
                                    isTopWinner && getNicknameStyle(match.top) && "font-bold",
                                    match.top.name === 'BYE' && "text-muted-foreground italic",
                                    match.top.name === 'TBD' && "text-muted-foreground"
                                )}
                                style={match.top.name !== 'TBD' && match.top.name !== 'BYE' ? getNicknameStyle(match.top) : undefined}
                            >
                                {match.top.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {getBracketBadge()}
                            <span className={cn(
                                "text-sm font-mono px-2 py-0.5 rounded min-w-[2rem] text-center",
                                isTopWinner ? "bg-primary/20 text-primary" : "bg-muted"
                            )}>
                                {match.top.score ?? '-'}
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
                                    isBottomWinner && !hasFrame(match.bottom) && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                                    getPlayerCosmetics(match.bottom)?.bracketFrame?.animation === 'fire' && "animate-pulse"
                                )}
                                style={getFrameStyle(match.bottom)}
                            >
                                <AvatarImage src={getAvatarSrc(match.bottom)} alt={match.bottom.name} />
                                <AvatarFallback className={cn("text-xs", getAvatarColor(match.bottom.name))}>
                                    {getInitials(match.bottom.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span
                                className={cn(
                                    "text-sm truncate",
                                    isBottomWinner && !getNicknameStyle(match.bottom) && "font-bold text-primary",
                                    isBottomWinner && getNicknameStyle(match.bottom) && "font-bold",
                                    match.bottom.name === 'BYE' && "text-muted-foreground italic",
                                    match.bottom.name === 'TBD' && "text-muted-foreground"
                                )}
                                style={match.bottom.name !== 'TBD' && match.bottom.name !== 'BYE' ? getNicknameStyle(match.bottom) : undefined}
                            >
                                {match.bottom.name}
                            </span>
                        </div>
                        <span className={cn(
                            "text-sm font-mono px-2 py-0.5 rounded min-w-[2rem] text-center flex-shrink-0",
                            isBottomWinner ? "bg-primary/20 text-primary" : "bg-muted"
                        )}>
                            {match.bottom.score ?? '-'}
                        </span>
                    </div>
                    {canReport && (
                        <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" onClick={() => setIsDialogOpen(true)}>
                            Reportar {scoreLabel}
                        </Button>
                    )}
                    {/* Station display and assignment */}
                    {stations && stations.length > 0 && !match.winner && match.top.name !== 'TBD' && match.bottom.name !== 'TBD' && match.bottom.name !== 'BYE' && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                            {isOwner && onStationAssigned ? (
                                <Select
                                    value={match.station?.id || 'none'}
                                    onValueChange={(value) => onStationAssigned(match.id, value === 'none' ? null : value)}
                                >
                                    <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder="Asignar estación">
                                            {match.station ? (
                                                <span className="flex items-center gap-1">
                                                    <Gamepad2 className="h-3 w-3" />
                                                    {match.station.name}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">Sin estación</span>
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            <span className="text-muted-foreground">Sin asignar</span>
                                        </SelectItem>
                                        {stations.filter(s => s.isAvailable || s.id === match.station?.id).map(station => (
                                            <SelectItem key={station.id} value={station.id}>
                                                <span className="flex items-center gap-2">
                                                    <Gamepad2 className="h-3 w-3" />
                                                    {station.name}
                                                    {station.location && (
                                                        <span className="text-muted-foreground text-xs">({station.location})</span>
                                                    )}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : match.station ? (
                                <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                                    <Gamepad2 className="h-3 w-3" />
                                    <span className="font-medium">{match.station.name}</span>
                                    {match.station.location && (
                                        <span className="text-muted-foreground">• {match.station.location}</span>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}
                </CardContent>
            </Card>
            <ReportScoreDialog 
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                match={match}
                onScoreReported={(scores) => onScoreReported(match.id, scores)}
                gameMode={gameMode}
            />
        </>
    )
}

interface BracketProps {
    tournament: Tournament;
    isOwner: boolean;
    rounds: Round[];
    onScoreReported: (matchId: number, scores: { top: number, bottom: number }) => void;
    onStationAssigned?: (matchId: number, stationId: string | null) => void;
    /** Optional branding colors from Pro plan */
    brandingColors?: { primary?: string; secondary?: string };
    /** Cosmetics for bracket display */
    cosmeticsMap?: CosmeticsMap;
}

export default function Bracket({ tournament, isOwner, rounds, onScoreReported, onStationAssigned, brandingColors, cosmeticsMap }: BracketProps) {
    const bracketRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    
    const getWinner = () => {
        if (rounds.length === 0) return null;
        const finalsRound = rounds.find(r => r.bracket === 'finals');
        if (finalsRound && finalsRound.matches[0]?.winner) {
            return finalsRound.matches[0].winner;
        }
        return rounds[rounds.length - 1].matches[0]?.winner;
    };

    const tournamentWinner = getWinner();

    const winnersRounds = rounds.filter(r => r.bracket === 'winners' || !r.bracket);
    const losersRounds = rounds.filter(r => r.bracket === 'losers');
    const finalsRound = rounds.find(r => r.bracket === 'finals');
    const isDoubleElimination = tournament.format === 'double-elimination' && losersRounds.length > 0;

    const handleFullscreen = () => {
        if (cardRef.current) {
            if (!document.fullscreenElement) {
                cardRef.current.requestFullscreen();
            } else {
                document.exitFullscreen?.();
            }
        }
    }

    if (!tournament) return null;

    const formatDisplay = {
        'single-elimination': 'Eliminación Simple',
        'double-elimination': 'Doble Eliminación',
        'swiss': 'Sistema Suizo'
    }[tournament.format] || tournament.format;

    const gameMode = tournament.game_mode;
    const isTeam = gameMode ? isTeamMode(gameMode) : false;
    const isFFA = gameMode ? isFreeForAll(gameMode) : false;

    return (
        <Card 
            ref={cardRef} 
            className="print:shadow-none print:border-none bg-card fullscreen:bg-background fullscreen:p-4 fullscreen:border-none"
            style={brandingColors?.primary ? {
                borderColor: brandingColors.primary,
                borderWidth: '2px',
                '--bracket-accent': brandingColors.primary,
                '--bracket-bg': brandingColors.secondary,
            } as React.CSSProperties : undefined}
        >
            <CardHeader className="flex-row justify-between items-center print:hidden">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        Bracket del Torneo
                        {isTeam && (
                            <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Equipos
                            </Badge>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">{formatDisplay}</Badge>
                        {gameMode && (
                            <Badge variant="outline">
                                <Gamepad2 className="h-3 w-3 mr-1" />
                                {gameMode}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {tournament.status === 'En curso' && (
                        <div className="flex items-center gap-2 text-sm font-semibold text-red-500">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            LIVE
                        </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFullscreen} title="Pantalla Completa">
                        <Expand className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 print:p-0">
                {rounds.length > 0 ? (
                    <div className="space-y-8">
                        <div>
                            {isDoubleElimination && (
                                <h3 className="text-lg font-semibold mb-4 text-green-500 flex items-center gap-2">
                                    <Trophy className="h-5 w-5" />
                                    Winners Bracket
                                </h3>
                            )}
                            <div ref={bracketRef} className="flex space-x-4 md:space-x-8 lg:space-x-12 overflow-x-auto pb-4">
                                {winnersRounds.map((round) => (
                                    <div key={round.name} className="flex flex-col space-y-4 min-w-[250px]">
                                        <h3 className="text-xl font-bold text-center font-headline">{round.name}</h3>
                                        <div className="flex flex-col justify-around flex-grow space-y-8">
                                            {round.matches.map((match) => (
                                                <MatchCard 
                                                    key={match.id} 
                                                    match={match} 
                                                    onScoreReported={onScoreReported} 
                                                    isOwner={isOwner}
                                                    gameMode={tournament.game_mode}
                                                    stations={tournament.stations}
                                                    onStationAssigned={onStationAssigned}
                                                    cosmeticsMap={cosmeticsMap}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                
                                {!isDoubleElimination && (
                                    <div className="flex flex-col space-y-4 min-w-[250px] items-center justify-center">
                                        <h3 className="text-xl font-bold text-center font-headline">Campeón</h3>
                                        <Trophy className="w-24 h-24 text-yellow-400" />
                                        <p className="font-bold text-lg">{tournamentWinner || 'TBD'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isDoubleElimination && losersRounds.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4 text-orange-500 flex items-center gap-2">
                                    <span className="text-xl">💀</span>
                                    Losers Bracket
                                </h3>
                                <div className="flex space-x-4 md:space-x-8 overflow-x-auto pb-4">
                                    {losersRounds.map((round) => (
                                        <div key={round.name} className="flex flex-col space-y-4 min-w-[220px]">
                                            <h3 className="text-lg font-bold text-center">{round.name}</h3>
                                            <div className="flex flex-col justify-around flex-grow space-y-6">
                                                {round.matches.map((match) => (
                                                    <MatchCard 
                                                        key={match.id} 
                                                        match={match} 
                                                        onScoreReported={onScoreReported} 
                                                        isOwner={isOwner}
                                                        gameMode={tournament.game_mode}
                                                        stations={tournament.stations}
                                                        onStationAssigned={onStationAssigned}
                                                        cosmeticsMap={cosmeticsMap}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isDoubleElimination && finalsRound && (
                            <div className="flex flex-col items-center">
                                <h3 className="text-xl font-semibold mb-4 text-yellow-500 flex items-center gap-2">
                                    <Trophy className="h-6 w-6" />
                                    Gran Final
                                </h3>
                                <div className="w-full max-w-md">
                                    {finalsRound.matches.map((match) => (
                                        <MatchCard 
                                            key={match.id} 
                                            match={match} 
                                            onScoreReported={onScoreReported} 
                                            isOwner={isOwner}
                                            gameMode={tournament.game_mode}
                                            stations={tournament.stations}
                                            onStationAssigned={onStationAssigned}
                                            cosmeticsMap={cosmeticsMap}
                                        />
                                    ))}
                                </div>
                                <div className="mt-6 text-center">
                                    <Trophy className="w-20 h-20 text-yellow-400 mx-auto" />
                                    <p className="font-bold text-xl mt-2">{tournamentWinner || 'Por determinar'}</p>
                                    <p className="text-sm text-muted-foreground">Campeón</p>
                                </div>
                            </div>
                        )}

                        {tournament.format === 'swiss' && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                                <p className="text-sm text-blue-400">
                                    <strong>Sistema Suizo:</strong> Los emparejamientos se realizan basándose en los puntos acumulados. 
                                    Los jugadores con puntajes similares se enfrentarán entre sí en cada ronda.
                                </p>
                            </div>
                        )}

                        {isFFA && (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mt-4">
                                <p className="text-sm text-purple-400">
                                    <strong>Modo Free For All:</strong> En este modo, múltiples jugadores compiten simultáneamente. 
                                    Los puntos se asignan según la posición final de cada jugador.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Bracket no disponible</h3>
                        <p className="text-muted-foreground mb-4">
                            El bracket se generará automáticamente cuando haya participantes aceptados.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Para generar el bracket, ve a la pestaña "Gestionar" y acepta participantes, luego asigna seeds.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
