"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { useState, useEffect } from "react";
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

const generateRounds = (numParticipants: number) => {
    if (numParticipants < 2) return [];
    
    // For simplicity, we'll use mock player names for now
    const playerNames = [
      "CyberNinja", "PixelProwler", "QuantumLeap", "SynthWave",
      "GigaGlitch", "VoidRunner", "DataDragon", "LogicLancer",
      "BinaryBard", "CircuitSorcerer", "FirewallFury", "GridGuardian",
      "MatrixMonarch", "NetworkNomad", "OracleKnight", "ProtocolPaladin"
    ];

    const actualParticipants = playerNames.slice(0, numParticipants).map(name => ({ name }));

    const rounds = [];
    let currentPlayers = [...actualParticipants];
    let roundIndex = 1;
    let matchId = 1;

    while (currentPlayers.length > 1) {
        const roundName = currentPlayers.length === 2 ? "Finales" : currentPlayers.length === 4 ? "Semifinales" : `Ronda ${roundIndex}`;
        const matches = [];
        const nextRoundPlayers = [];

        for (let i = 0; i < currentPlayers.length; i += 2) {
            const top = currentPlayers[i];
            const bottom = currentPlayers[i + 1] || { name: "BYE" }; // Handle byes for odd numbers
            matches.push({
                id: matchId++,
                top: { name: top.name, score: null },
                bottom: { name: bottom.name, score: null },
                winner: bottom.name === "BYE" ? top.name : null,
            });
            nextRoundPlayers.push({ name: "TBD" });
        }
        
        rounds.push({ name: roundName, matches });
        currentPlayers = nextRoundPlayers;
        roundIndex++;
    }
    
    return rounds;
}


type Match = {
    id: number;
    top: { name: string; score: number | null };
    bottom: { name: string; score: number | null };
    winner: string | null;
};

type Round = {
    name: string;
    matches: Match[];
};

const MatchCard = ({ match, onScoreReported }: { match: Match, onScoreReported: (matchId: number, scores: { top: number, bottom: number }) => void }) => {
    const isTopWinner = match.winner === match.top.name;
    const isBottomWinner = match.winner === match.bottom.name;
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const canReport = match.top.name !== 'TBD' && match.bottom.name !== 'TBD' && !match.winner && match.bottom.name !== 'BYE';

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

export default function Bracket({ tournament }: { tournament: Tournament }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const tournamentWinner = rounds.length > 0 ? rounds[rounds.length - 1].matches[0].winner : null;

  useEffect(() => {
    if (tournament) {
      setRounds(generateRounds(tournament.maxParticipants));
    }
  }, [tournament]);

  const handleScoreReported = (matchId: number, scores: {top: number, bottom: number}) => {
      setRounds(prevRounds => {
          const newRounds = JSON.parse(JSON.stringify(prevRounds));
          let matchFound = false;

          for (let i = 0; i < newRounds.length; i++) {
              const round = newRounds[i];
              const match = round.matches.find(m => m.id === matchId);
              
              if (match) {
                  match.top.score = scores.top;
                  match.bottom.score = scores.bottom;
                  match.winner = scores.top > scores.bottom ? match.top.name : match.bottom.name;
                  
                  // Propagate winner to next round
                  if (i + 1 < newRounds.length) {
                      const nextRound = newRounds[i+1];
                      const matchInNextRoundIndex = Math.floor(round.matches.indexOf(match) / 2);
                      const nextMatch = nextRound.matches[matchInNextRoundIndex];
                      
                      if (round.matches.indexOf(match) % 2 === 0) {
                          nextMatch.top.name = match.winner;
                      } else {
                          nextMatch.bottom.name = match.winner;
                      }
                  }
                  matchFound = true;
                  break;
              }
          }
          return newRounds;
      });
  };

  if (!tournament) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bracket del Torneo</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex space-x-4 md:space-x-8 lg:space-x-12 overflow-x-auto pb-4">
          {rounds.map((round) => (
            <div key={round.name} className="flex flex-col space-y-4 min-w-[250px]">
              <h3 className="text-xl font-bold text-center font-headline">{round.name}</h3>
              <div className="flex flex-col justify-around flex-grow space-y-8">
                {round.matches.map((match) => (
                  <MatchCard key={match.id} match={match} onScoreReported={handleScoreReported} />
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col space-y-4 min-w-[250px] items-center justify-center">
              <h3 className="text-xl font-bold text-center font-headline">Ganador</h3>
              <Trophy className="w-24 h-24 text-yellow-400" />
              <p className="font-bold text-lg">{tournamentWinner || 'TBD'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
