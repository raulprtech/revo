"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

// Mock data
const mockRounds = [
  {
    name: "Round 1",
    matches: [
      { id: 1, top: { name: "CyberNinja", score: 2 }, bottom: { name: "PixelProwler", score: 1 }, winner: "CyberNinja" },
      { id: 2, top: { name: "QuantumLeap", score: 0 }, bottom: { name: "SynthWave", score: 2 }, winner: "SynthWave" },
      { id: 3, top: { name: "GigaGlitch", score: 2 }, bottom: { name: "VoidRunner", score: 0 }, winner: "GigaGlitch" },
      { id: 4, top: { name: "DataDragon", score: 1 }, bottom: { name: "LogicLancer", score: 2 }, winner: "LogicLancer" },
    ],
  },
  {
    name: "Semifinals",
    matches: [
      { id: 5, top: { name: "CyberNinja", score: 2 }, bottom: { name: "SynthWave", score: 1 }, winner: "CyberNinja" },
      { id: 6, top: { name: "GigaGlitch", score: 0 }, bottom: { name: "LogicLancer", score: 2 }, winner: "LogicLancer" },
    ],
  },
  {
    name: "Finals",
    matches: [
      { id: 7, top: { name: "CyberNinja", score: null }, bottom: { name: "LogicLancer", score: null }, winner: null },
    ],
  },
];

const MatchCard = ({ match }: { match: (typeof mockRounds)[0]['matches'][0] }) => {
    const isTopWinner = match.winner === match.top.name;
    const isBottomWinner = match.winner === match.bottom.name;

    return (
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
                {!match.winner && (
                    <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs">Report Score</Button>
                )}
            </CardContent>
        </Card>
    )
}

export default function Bracket() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Bracket</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex space-x-4 md:space-x-8 lg:space-x-12 overflow-x-auto pb-4">
          {mockRounds.map((round, roundIndex) => (
            <div key={round.name} className="flex flex-col space-y-4 min-w-[250px]">
              <h3 className="text-xl font-bold text-center font-headline">{round.name}</h3>
              <div className="flex flex-col justify-around flex-grow space-y-8">
                {round.matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col space-y-4 min-w-[250px] items-center justify-center">
              <h3 className="text-xl font-bold text-center font-headline">Winner</h3>
              <Trophy className="w-24 h-24 text-yellow-400" />
              <p className="text-muted-foreground">TBD</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
