"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo } from "react";
import type { Round } from "./bracket";

type StandingsEntry = {
    id: string;
    rank: number;
    name: string;
    wins: number;
    losses: number;
    avatar: string;
}

const calculateStandings = (rounds: Round[]): StandingsEntry[] => {
    if (!rounds || rounds.length === 0) return [];
    
    const playerStats: { [name: string]: { wins: number, losses: number } } = {};

    rounds.forEach(round => {
        round.matches.forEach(match => {
            const { top, bottom, winner } = match;

            if (top.name !== 'BYE' && top.name !== 'TBD' && !playerStats[top.name]) {
                playerStats[top.name] = { wins: 0, losses: 0 };
            }
            if (bottom.name !== 'BYE' && bottom.name !== 'TBD' && !playerStats[bottom.name]) {
                playerStats[bottom.name] = { wins: 0, losses: 0 };
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

    const sortedStandings = Object.entries(playerStats)
        .map(([name, stats]) => ({
            id: name,
            name,
            ...stats
        }))
        .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
        
    let rank = 0;
    let lastWins = -1;
    let lastLosses = -1;
    return sortedStandings.map((player, index) => {
        if (player.wins !== lastWins || player.losses !== lastLosses) {
            rank = index + 1;
        }
        lastWins = player.wins;
        lastLosses = player.losses;
        return {
            ...player,
            rank,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`
        };
    });
};

export default function StandingsTable({ rounds }: { rounds: Round[] }) {
    const standings = useMemo(() => calculateStandings(rounds), [rounds]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Posiciones</CardTitle>
                <CardDescription>Clasificación actual de los jugadores en el torneo.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px] text-center">Rango</TableHead>
                            <TableHead>Jugador</TableHead>
                            <TableHead className="text-center">Victorias</TableHead>
                            <TableHead className="text-center">Derrotas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {standings.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium text-center">{p.rank}</TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-3">
                                        <Avatar>
                                            <AvatarImage src={p.avatar} />
                                            <AvatarFallback>{p.name.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{p.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-mono text-green-400">{p.wins}</TableCell>
                                <TableCell className="text-center font-mono text-red-400">{p.losses}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
