"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Trophy, Move, Printer, Code } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ReportScoreDialog } from "./report-score-dialog";
import { useToast } from "@/hooks/use-toast";

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
    
    const playerNames = [
      "CyberNinja", "PixelProwler", "QuantumLeap", "SynthWave",
      "GigaGlitch", "VoidRunner", "DataDragon", "LogicLancer",
      "BinaryBard", "CircuitSorcerer", "FirewallFury", "GridGuardian",
      "MatrixMonarch", "NetworkNomad", "OracleKnight", "ProtocolPaladin",
      "GlitchCat", "TechWarlock", "DataWrangler", "CodeComrade",
      "ScriptKiddie", "ByteBrawler", "KernelKnight", "BugHunter",
      "StackSmasher", "PointerProtector", "HeapHero", "CacheCommander",
      "ArrayAvenger", "StringSamurai", "FunctionFighter", "ClassChampion",
    ].slice(0, numParticipants);

    const actualParticipants = playerNames.map(name => ({ name }));

    const rounds = [];
    let currentPlayers = [...actualParticipants];
    let roundIndex = 1;
    let matchId = 1;

    // Handle byes by padding to the next power of 2
    const numRounds = Math.ceil(Math.log2(numParticipants));
    const bracketSize = Math.pow(2, numRounds);
    const byes = bracketSize - numParticipants;
    
    let firstRoundPlayers = [];
    let playersToPlay = actualParticipants.slice(byes * 2);
    let playersWithByes = actualParticipants.slice(0, byes * 2);

    for(let i = 0; i < playersToPlay.length; i+=2) {
        firstRoundPlayers.push(playersToPlay[i]);
        firstRoundPlayers.push(playersToPlay[i+1]);
    }
    for(let i = 0; i < playersWithByes.length; i++) {
        if(i % 2 === 0) firstRoundPlayers.splice(i, 0, playersWithByes[i]);
        else firstRoundPlayers.push(playersWithByes[i]);
    }

    currentPlayers = firstRoundPlayers;


    while (currentPlayers.length > 1) {
        const roundName = currentPlayers.length === 2 ? "Finales" : currentPlayers.length === 4 ? "Semifinales" : `Ronda ${roundIndex}`;
        const matches = [];
        const nextRoundPlayers = [];

        for (let i = 0; i < currentPlayers.length; i += 2) {
            const top = currentPlayers[i];
            const bottom = currentPlayers[i + 1] || { name: "BYE" };
            matches.push({
                id: matchId++,
                top: { name: top.name, score: null },
                bottom: { name: bottom.name, score: null },
                winner: bottom.name === "BYE" ? top.name : null,
            });
            if (bottom.name === 'BYE') {
              nextRoundPlayers.push(top);
            } else {
              nextRoundPlayers.push({ name: "TBD" });
            }
        }
        
        rounds.push({ name: roundName, matches });
        
        const newNextRoundPlayers = [];
        for (let i = 0; i < nextRoundPlayers.length; i+=2) {
          if (nextRoundPlayers[i].name !== 'TBD' && nextRoundPlayers[i+1]?.name !== 'TBD') {
             newNextRoundPlayers.push(nextRoundPlayers[i]);
             newNextRoundPlayers.push(nextRoundPlayers[i+1]);
          } else if (nextRoundPlayers[i].name !== 'TBD' && nextRoundPlayers[i+1]?.name === 'TBD') {
             const winnerMatch = rounds[rounds.length-1].matches.find(m => m.winner === nextRoundPlayers[i].name);
             const tbdMatch = rounds[rounds.length-1].matches[nextRoundPlayers.indexOf(nextRoundPlayers[i+1])];
             if(winnerMatch && tbdMatch) {
               const winnerIndex = rounds[rounds.length-1].matches.indexOf(winnerMatch);
               const tbdIndex = rounds[rounds.length-1].matches.indexOf(tbdMatch);
                if (Math.floor(winnerIndex / 2) === Math.floor(tbdIndex / 2)) {
                   newNextRoundPlayers.push(nextRoundPlayers[i]);
                   newNextRoundPlayers.push(nextRoundPlayers[i+1]);
                } else {
                   newNextRoundPlayers.push(nextRoundPlayers[i]);
                   newNextRoundPlayers.push({ name: "TBD" });
                }
             } else {
                newNextRoundPlayers.push(nextRoundPlayers[i]);
                newNextRoundPlayers.push(nextRoundPlayers[i+1]);
             }
          } else {
              newNextRoundPlayers.push(nextRoundPlayers[i]);
              newNextRoundPlayers.push(nextRoundPlayers[i+1]);
          }
        }
        
        currentPlayers = newNextRoundPlayers;
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
                if (match.winner && match.bottom.name === "BYE") {
                    const nextMatchIndex = Math.floor(j/2);
                    const nextMatch = nextRound.matches[nextMatchIndex];
                    if(j % 2 === 0) {
                        if (nextMatch.top.name === "TBD") {
                            nextMatch.top.name = match.winner;
                            roundsUpdated = true;
                        }
                    } else {
                        if (nextMatch.bottom.name === "TBD") {
                           nextMatch.bottom.name = match.winner;
                           roundsUpdated = true;
                        }
                    }
                }
            }
        }
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

export default function Bracket({ tournament, isOwner }: { tournament: Tournament, isOwner: boolean }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [showEmbed, setShowEmbed] = useState(false);
  const { toast } = useToast();
  const bracketRef = useRef<HTMLDivElement>(null);
  
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
                      const currentMatchIndex = round.matches.findIndex(m => m.id === matchId);
                      const nextMatchIndex = Math.floor(currentMatchIndex / 2);
                      const nextMatch = nextRound.matches[nextMatchIndex];
                      
                      if (currentMatchIndex % 2 === 0) {
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

  const handlePrint = () => {
    window.print();
  };

  const handleEmbedClick = () => {
    setShowEmbed(!showEmbed);
  }

  const handleEmbedCopy = () => {
    const embedCode = `<iframe src="${window.location.href}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Copiado al portapapeles",
      description: "El código para embeber el bracket ha sido copiado.",
    });
  }

  if (!tournament) return null;

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
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
            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-grab" title="Arrastrar para mover">
                <Move className="h-4 w-4" />
            </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEmbedClick}>
                <Code className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 print:p-0">
        {showEmbed && (
            <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Copia y pega este código para embeber el bracket en tu sitio web.</p>
                <div className="flex gap-2">
                <textarea
                    readOnly
                    className="w-full p-2 text-xs rounded-md bg-muted font-mono border"
                    value={`<iframe src="${window.location.origin}/tournaments/${tournament.id}?embed=true" width="100%" height="600" frameborder="0"></iframe>`}
                />
                <Button onClick={handleEmbedCopy}>Copiar</Button>
                </div>
            </div>
        )}
        <div ref={bracketRef} className="flex space-x-4 md:space-x-8 lg:space-x-12 overflow-x-auto pb-4">
          {rounds.map((round) => (
            <div key={round.name} className="flex flex-col space-y-4 min-w-[250px]">
              <h3 className="text-xl font-bold text-center font-headline">{round.name}</h3>
              <div className="flex flex-col justify-around flex-grow space-y-8">
                {round.matches.map((match) => (
                  <MatchCard key={match.id} match={match} onScoreReported={handleScoreReported} isOwner={isOwner} />
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
