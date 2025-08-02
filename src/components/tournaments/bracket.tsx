"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { useState } from "react";
import { ReportScoreDialog } from "./report-score-dialog";

// Datos de ejemplo
const initialRounds = [
  {
    name: "Ronda 1",
    matches: [
      { id: 1, top: { name: "CyberNinja", score: null }, bottom: { name: "PixelProwler", score: null }, winner: null },
      { id: 2, top: { name: "QuantumLeap", score: null }, bottom: { name: "SynthWave", score: null }, winner: null },
      { id: 3, top: { name: "GigaGlitch", score: null }, bottom: { name: "VoidRunner", score: null }, winner: null },
      { id: 4, top: { name: "DataDragon", score: null }, bottom: { name: "LogicLancer", score: null }, winner: null },
    ],
  },
  {
    name: "Semifinales",
    matches: [
      { id: 5, top: { name: "TBD", score: null }, bottom: { name: "TBD", score: null }, winner: null },
      { id: 6, top: { name: "TBD", score: null }, bottom: { name: "TBD", score: null }, winner: null },
    ],
  },
  {
    name: "Finales",
    matches: [
      { id: 7, top: { name: "TBD", score: null }, bottom: { name: "TBD", score: null }, winner: null },
    ],
  },
];

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

const MatchCard = ({ match, onScoreReported }: { match: Match, onScoreReported: () => void }) => {
    const isTopWinner = match.winner === match.top.name;
    const isBottomWinner = match.winner === match.bottom.name;
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const canReport = match.top.name !== 'TBD' && match.bottom.name !== 'TBD' && !match.winner;

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
                        <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" onClick={() => setIsDialogOpen(true)}>
                            Reportar Resultado
                        </Button>
                    )}
                </CardContent>
            </Card>
            <ReportScoreDialog 
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                match={match}
                onScoreReported={onScoreReported}
            />
        </>
    )
}

export default function Bracket() {
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const tournamentWinner = rounds[rounds.length - 1].matches[0].winner;

  const handleScoreReported = () => {
        // Esto es un marcador de posición. En una aplicación real, volverías a obtener los datos
        // o tendrías una gestión de estado más sofisticada.
        // Para esta demostración, simplemente simularemos una actualización de datos volviendo a aplicar la lógica de los datos de ejemplo.
        
        // Esta es una simulación simple. Una implementación real sería más compleja.
        const newRounds = JSON.parse(JSON.stringify(initialRounds));
        newRounds[0].matches[0].score = { top: 2, bottom: 1 };
        newRounds[0].matches[0].winner = "CyberNinja";
        newRounds[0].matches[0].top.score = 2;
        newRounds[0].matches[0].bottom.score = 1;
        
        newRounds[0].matches[1].score = { top: 0, bottom: 2 };
        newRounds[0].matches[1].winner = "SynthWave";
        newRounds[0].matches[1].top.score = 0;
        newRounds[0].matches[1].bottom.score = 2;

        newRounds[0].matches[2].score = { top: 2, bottom: 0 };
        newRounds[0].matches[2].winner = "GigaGlitch";
        newRounds[0].matches[2].top.score = 2;
        newRounds[0].matches[2].bottom.score = 0;

        newRounds[0].matches[3].score = { top: 1, bottom: 2 };
        newRounds[0].matches[3].winner = "LogicLancer";
        newRounds[0].matches[3].top.score = 1;
        newRounds[0].matches[3].bottom.score = 2;

        newRounds[1].matches[0].top.name = "CyberNinja";
        newRounds[1].matches[0].bottom.name = "SynthWave";
        newRounds[1].matches[0].winner = "CyberNinja";
        newRounds[1].matches[0].top.score = 2;
        newRounds[1].matches[0].bottom.score = 1;

        newRounds[1].matches[1].top.name = "GigaGlitch";
        newRounds[1].matches[1].bottom.name = "LogicLancer";
        newRounds[1].matches[1].winner = "LogicLancer";
        newRounds[1].matches[1].top.score = 0;
        newRounds[1].matches[1].bottom.score = 2;
        
        newRounds[2].matches[0].top.name = "CyberNinja";
        newRounds[2].matches[0].bottom.name = "LogicLancer";

        setRounds(newRounds);
  };

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
