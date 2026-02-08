"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMemo, useEffect } from "react";
import { useParticipants } from "@/hooks/use-tournaments";
import { Loader2, Trophy, Medal, Crown, Award } from "lucide-react";
import type { Round } from "./bracket";
import { cn } from "@/lib/utils";

type StandingsEntry = {
    id: string;
    rank: number;
    name: string;
    wins: number;
    losses: number;
    draws: number;
    points: number; // For Swiss: 3 for win, 1 for draw, 0 for loss
    buchholz: number; // Swiss tiebreaker: sum of opponents' scores
    gameWins: number; // Total games/rounds won
    avatar: string;
}

interface StandingsTableProps {
    rounds: Round[];
    tournamentId: string;
    format?: string;
    gameMode?: string;
}

const calculateStandings = (rounds: Round[], format?: string): StandingsEntry[] => {
    if (!rounds || rounds.length === 0) return [];
    
    const playerStats: { [name: string]: { 
        wins: number; 
        losses: number; 
        draws: number;
        gameWins: number;
        opponents: string[];
    } } = {};

    rounds.forEach(round => {
        round.matches.forEach(match => {
            const { top, bottom, winner } = match;

            // Initialize player stats
            if (top.name !== 'BYE' && top.name !== 'TBD' && !top.name.includes('(') && !playerStats[top.name]) {
                playerStats[top.name] = { wins: 0, losses: 0, draws: 0, gameWins: 0, opponents: [] };
            }
            if (bottom.name !== 'BYE' && bottom.name !== 'TBD' && !bottom.name.includes('(') && !playerStats[bottom.name]) {
                playerStats[bottom.name] = { wins: 0, losses: 0, draws: 0, gameWins: 0, opponents: [] };
            }

            // Track opponents for Buchholz calculation
            if (playerStats[top.name] && playerStats[bottom.name]) {
                playerStats[top.name].opponents.push(bottom.name);
                playerStats[bottom.name].opponents.push(top.name);
            }

            // Count game wins from scores
            if (top.score !== null && playerStats[top.name]) {
                playerStats[top.name].gameWins += top.score;
            }
            if (bottom.score !== null && playerStats[bottom.name]) {
                playerStats[bottom.name].gameWins += bottom.score;
            }

            if (winner) {
                if (winner === top.name) {
                    if(playerStats[top.name]) playerStats[top.name].wins++;
                    if(playerStats[bottom.name]) playerStats[bottom.name].losses++;
                } else if (winner === bottom.name) {
                    if(playerStats[bottom.name]) playerStats[bottom.name].wins++;
                    if(playerStats[top.name]) playerStats[top.name].losses++;
                }
            }
        });
    });

    // Calculate Buchholz score (sum of opponents' wins)
    const calculateBuchholz = (playerName: string): number => {
        const player = playerStats[playerName];
        if (!player) return 0;
        return player.opponents.reduce((sum, opponent) => {
            return sum + (playerStats[opponent]?.wins || 0);
        }, 0);
    };

    // Calculate points based on format
    const calculatePoints = (wins: number, draws: number): number => {
        if (format === 'swiss') {
            return wins * 3 + draws * 1; // Swiss scoring: 3-1-0
        }
        return wins; // Elimination: just count wins
    };

    const sortedStandings = Object.entries(playerStats)
        .map(([name, stats]) => ({
            id: name,
            name,
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws,
            gameWins: stats.gameWins,
            points: calculatePoints(stats.wins, stats.draws),
            buchholz: calculateBuchholz(name),
        }))
        .sort((a, b) => {
            // Primary: wins/points
            if (b.points !== a.points) return b.points - a.points;
            // Secondary: Buchholz (for Swiss)
            if (format === 'swiss' && b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
            // Tertiary: game wins
            if (b.gameWins !== a.gameWins) return b.gameWins - a.gameWins;
            // Quaternary: fewer losses
            return a.losses - b.losses;
        });
        
    let rank = 0;
    let lastPoints = -1;
    let lastBuchholz = -1;
    return sortedStandings.map((player, index) => {
        if (player.points !== lastPoints || player.buchholz !== lastBuchholz) {
            rank = index + 1;
        }
        lastPoints = player.points;
        lastBuchholz = player.buchholz;
        return {
            ...player,
            rank,
            avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(player.name)}&backgroundColor=6366f1,8b5cf6,ec4899,f43f5e,f97316,eab308,22c55e,06b6d4&fontFamily=Arial&fontSize=40`
        };
    });
};

// Export for use in badge awarding
export { calculateStandings };
export type { StandingsEntry };

const getRankIcon = (rank: number) => {
    switch (rank) {
        case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
        case 2: return <Medal className="h-5 w-5 text-gray-400" />;
        case 3: return <Award className="h-5 w-5 text-amber-600" />;
        default: return <span className="font-bold text-muted-foreground">{rank}</span>;
    }
};

export default function StandingsTable({ rounds, tournamentId, format, gameMode }: StandingsTableProps) {
    const standings = useMemo(() => calculateStandings(rounds, format), [rounds, format]);
    const { participants, isLoading, refresh } = useParticipants(tournamentId);
    const isSwiss = format === 'swiss';

    // Listen for participant updates
    useEffect(() => {
        const handleUpdate = () => refresh();
        window.addEventListener('participantsUpdated', handleUpdate);
        return () => window.removeEventListener('participantsUpdated', handleUpdate);
    }, [refresh]);

    // Get accepted participants for display when no rounds/matches yet
    const acceptedParticipants = useMemo(() => {
        return participants
            .filter(p => p.status === 'Aceptado')
            .map((p, index) => ({
                id: p.id || p.email,
                rank: index + 1,
                name: p.name,
                wins: 0,
                losses: 0,
                draws: 0,
                points: 0,
                buchholz: 0,
                gameWins: 0,
                avatar: p.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(p.name)}&backgroundColor=6366f1,8b5cf6,ec4899,f43f5e,f97316,eab308,22c55e,06b6d4&fontFamily=Arial&fontSize=40`
            }));
    }, [participants]);

    // Use standings from rounds if available, otherwise show accepted participants
    const displayStandings = standings.length > 0 ? standings : acceptedParticipants;
    const hasMatchResults = standings.length > 0 && standings.some(s => s.wins > 0 || s.losses > 0);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Posiciones
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Posiciones
                    {isSwiss && (
                        <Badge variant="secondary" className="ml-2">Sistema Suizo</Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    {hasMatchResults 
                        ? isSwiss 
                            ? "Clasificación basada en puntos (3-1-0) con desempate Buchholz."
                            : "Clasificación actual de los jugadores en el torneo."
                        : "Participantes aceptados. Las posiciones se actualizarán cuando inicien las partidas."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] text-center">#</TableHead>
                            <TableHead>Jugador</TableHead>
                            {isSwiss && <TableHead className="text-center">Pts</TableHead>}
                            <TableHead className="text-center">V</TableHead>
                            <TableHead className="text-center">D</TableHead>
                            {isSwiss && <TableHead className="text-center" title="Buchholz (desempate)">BH</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayStandings.length > 0 ? displayStandings.map((p) => (
                            <TableRow 
                                key={p.id}
                                className={cn(
                                    p.rank === 1 && hasMatchResults && "bg-yellow-500/10",
                                    p.rank === 2 && hasMatchResults && "bg-gray-400/10",
                                    p.rank === 3 && hasMatchResults && "bg-amber-600/10"
                                )}
                            >
                                <TableCell className="text-center">
                                    {getRankIcon(p.rank)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="h-8 w-8">
                                            {p.avatar && <AvatarImage src={p.avatar} />}
                                            <AvatarFallback className="text-xs">{p.name.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{p.name}</span>
                                    </div>
                                </TableCell>
                                {isSwiss && (
                                    <TableCell className="text-center font-bold text-primary">{p.points}</TableCell>
                                )}
                                <TableCell className="text-center font-mono text-green-400">{p.wins}</TableCell>
                                <TableCell className="text-center font-mono text-red-400">{p.losses}</TableCell>
                                {isSwiss && (
                                    <TableCell className="text-center font-mono text-muted-foreground">{p.buchholz}</TableCell>
                                )}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={isSwiss ? 6 : 4} className="text-center text-muted-foreground py-8">
                                    No hay participantes aceptados aún
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
