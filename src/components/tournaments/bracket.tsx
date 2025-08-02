"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Trophy, Expand } from "lucide-react";
import { useState, useRef } from "react";
import { ReportScoreDialog } from "./report-score-dialog";

interface Tournament {
    id: string;
    name: string;
    description: string;
    game: string;
    participants: number;
    maxParticipants: number;
    startDate: string;
    format: 'single-elimination' | 'double-elimination' | 'swiss';
    status: string;
    ownerEmail: string;
    image: string;
    dataAiHint: string;
    prizePool?: string;
}

export const generateRounds = (numParticipants: number, seededPlayerNames?: string[]) => {
    if (numParticipants < 2) return [];

    let playerNames;

    if (seededPlayerNames && seededPlayerNames.length > 0) {
        playerNames = seededPlayerNames;
    } else {
        const defaultNames = [
          "CyberNinja", "PixelProwler", "QuantumLeap", "SynthWave",
          "GigaGlitch", "VoidRunner", "DataDragon", "LogicLancer",
          "BinaryBard", "CircuitSorcerer", "FirewallFury", "GridGuardian",
          "MatrixMonarch", "NetworkNomad", "OracleKnight", "ProtocolPaladin",
          "GlitchCat", "TechWarlock", "DataWrangler", "CodeComrade",
          "ScriptKiddie", "ByteBrawler", "KernelKnight", "BugHunter",
          "StackSmasher", "PointerProtector", "HeapHero", "CacheCommander",
          "ArrayAvenger", "StringSamurai", "FunctionFighter", "ClassChampion",
        ].slice(0, numParticipants);
        playerNames = defaultNames.sort(() => Math.random() - 0.5);
    }
    
    let n = 1;
    while (n < numParticipants) {
        n *= 2;
    }
    const bracketSize = n;
    
    const byes = bracketSize - numParticipants;

    let players = playerNames.map(name => ({ name }));
    for (let i = 0; i < byes; i++) {
        players.push({ name: "BYE" });
    }
    
    // Simple seeding for now
    if (!seededPlayerNames) {
      players.sort(() => Math.random() - 0.5);
    }

    const rounds = [];
    let currentPlayers = players;
    let roundIndex = 1;
    let matchId = 1;

    while (currentPlayers.length > 1) {
        const roundName = currentPlayers.length === 2 ? "Finales" : currentPlayers.length === 4 ? "Semifinales" : `Ronda ${roundIndex}`;
        const matches = [];
        const nextRoundPlayers = [];

        for (let i = 0; i < currentPlayers.length; i += 2) {
            const top = currentPlayers[i];
            const bottom = currentPlayers[i + 1];
            
            const isTopBye = top.name === "BYE";
            const isBottomBye = bottom.name === "BYE";
            const winner = isBottomBye ? top.name : (isTopBye ? bottom.name : null);

            matches.push({
                id: matchId++,
                top: { name: top.name, score: null },
                bottom: { name: bottom.name, score: null },
                winner: winner,
            });

             if (winner) {
                nextRoundPlayers.push({ name: winner });
             } else {
                nextRoundPlayers.push({ name: "TBD" });
             }
        }
        
        rounds.push({ name: roundName, matches });
        currentPlayers = nextRoundPlayers;
        roundIndex++;
    }

    // Auto-advance winners of BYE matches to the next round immediately
    let roundsUpdated = true;
    while(roundsUpdated) {
        roundsUpdated = false;
        for (let i = 0; i < rounds.length - 1; i++) {
            const round = rounds[i];
            const nextRound = rounds[i+1];

            for(let j = 0; j < round.matches.length; j++) {
                const match = round.matches[j];

                if (match.winner) {
                    const nextMatchIndex = Math.floor(j/2);
                    const nextMatch = nextRound.matches[nextMatchIndex];
                    if (nextMatch) {
                        const isTopSlot = j % 2 === 0;
                        if(isTopSlot) {
                            if (nextMatch.top.name === "TBD") {
                                nextMatch.top.name = match.winner;
                                if(nextMatch.bottom.name === 'BYE') {
                                    nextMatch.winner = match.winner;
                                }
                                roundsUpdated = true;
                            }
                        } else {
                            if (nextMatch.bottom.name === "TBD") {
                               nextMatch.bottom.name = match.winner;
                                if(nextMatch.top.name === 'BYE') {
                                    nextMatch.winner = match.winner;
                                }
                               roundsUpdated = true;
                            }
                        }
                    }
                }
            }
        }
    }


    return rounds;
}


export type Match = {
    id: number;
    top: { name: string; score: number | null };
    bottom: { name: string; score: number | null };
    winner: string | null;
};

export type Round = {
    name: string;
    matches: Match[];
};

const MatchCard = ({ match, onScoreReported, isOwner }: { match: Match, onScoreReported: (matchId: number, scores: { top: number, bottom: number }) => void, isOwner: boolean }) => {
    const isTopWinner = match.winner === match.top.name;
    const isBottomWinner = match.winner === match.bottom.name;
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const canReport = match.top.name !== 'TBD' && match.bottom.name !== 'TBD' && !match.winner && match.bottom.name !== 'BYE' && isOwner;

    const handleReport = () => {
        setIsDialogOpen(true);
    };

    return (
        <>
            <Card className="bg-card/50 w-full">
                <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className={cn("text-sm", isTopWinner && "font-bold text-primary")}>{match.top.name}</span>
                        <span className={cn("text-sm font-mono px-2 py-0.5 rounded", isTopWinner ? "bg-primary/20 text-primary" : "bg-muted")}>{match.top.score ?? '-'}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className={cn("text-sm", isBottomWinner && "font-bold text-primary")}>{match.bottom.name}</span>
                        <span className={cn("text-sm font-mono px-2 py-0.5 rounded", isBottomWinner ? "bg-primary/20 text-primary" : "bg-muted")}>{match.bottom.score ?? '-'}</span>
                    </div>
                    {canReport && (
                        <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" onClick={handleReport}>
                            Reportar Resultado
                        </Button>
                    )}
                </CardContent>
            </Card>
            <ReportScoreDialog 
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                match={match}
                onScoreReported={(scores) => onScoreReported(match.id, scores)}
            />
        </>
    )
}

export default function Bracket({ tournament, isOwner, rounds, onScoreReported }: { tournament: Tournament, isOwner: boolean, rounds: Round[], onScoreReported: (matchId: number, scores: {top: number, bottom: number}) => void }) {
  const bracketRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const tournamentWinner = rounds.length > 0 ? rounds[rounds.length - 1].matches[0].winner : null;

  const handleFullscreen = () => {
    if (cardRef.current) {
        if (!document.fullscreenElement) {
            cardRef.current.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
  }

  if (!tournament) return null;

  return (
    <Card ref={cardRef} className="print:shadow-none print:border-none bg-card fullscreen:bg-background fullscreen:p-4 fullscreen:border-none">
      <CardHeader className="flex-row justify-between items-center print:hidden">
        <CardTitle>Bracket del Torneo</CardTitle>
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
        <div ref={bracketRef} className="flex space-x-4 md:space-x-8 lg:space-x-12 overflow-x-auto pb-4">
          {rounds.map((round) => (
            <div key={round.name} className="flex flex-col space-y-4 min-w-[250px]">
              <h3 className="text-xl font-bold text-center font-headline">{round.name}</h3>
              <div className="flex flex-col justify-around flex-grow space-y-8">
                {round.matches.map((match) => (
                  <MatchCard key={match.id} match={match} onScoreReported={onScoreReported} isOwner={isOwner} />
                ))}
              </div>
            </div>
          ))}
          {rounds.length > 0 && (
            <div className="flex flex-col space-y-4 min-w-[250px] items-center justify-center">
                <h3 className="text-xl font-bold text-center font-headline">Ganador</h3>
                <Trophy className="w-24 h-24 text-yellow-400" />
                <p className="font-bold text-lg">{tournamentWinner || 'TBD'}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
