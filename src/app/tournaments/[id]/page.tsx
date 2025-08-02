"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Users, Calendar, Trophy, Shield, GitBranch, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Bracket, { generateRounds, type Round } from "@/components/tournaments/bracket";
import StandingsTable from "@/components/tournaments/standings-table";
import ParticipantManager from "@/components/tournaments/participant-manager";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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

const formatMapping = {
    'single-elimination': 'Eliminación Simple',
    'double-elimination': 'Doble Eliminación',
    'swiss': 'Suizo'
};


export default function TournamentPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const [rounds, setRounds] = useState<Round[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const allTournaments: Tournament[] = JSON.parse(localStorage.getItem("tournaments") || "[]");
    const currentTournament = allTournaments.find(t => t.id === id);

    if (currentTournament) {
        setTournament(currentTournament);
        const storedUser = localStorage.getItem("user");
        if(storedUser) {
            const user = JSON.parse(storedUser);
            setIsOwner(user.email === currentTournament.ownerEmail);
        }
        setRounds(generateRounds(currentTournament.maxParticipants));
    }
    setLoading(false);
  }, [id]);

  const handleDelete = () => {
    const allTournaments: Tournament[] = JSON.parse(localStorage.getItem("tournaments") || "[]");
    const updatedTournaments = allTournaments.filter(t => t.id !== id);
    localStorage.setItem("tournaments", JSON.stringify(updatedTournaments));
    toast({
      title: "Torneo eliminado",
      description: `El torneo "${tournament?.name}" ha sido eliminado.`,
      variant: "destructive"
    });
    router.push("/dashboard");
  }

  const handleScoreReported = (matchId: number, scores: {top: number, bottom: number}) => {
      setRounds(prevRounds => {
          const newRounds: Round[] = JSON.parse(JSON.stringify(prevRounds));
          let matchFound = false;

          for (let i = 0; i < newRounds.length; i++) {
              const round = newRounds[i];
              const matchIndex = round.matches.findIndex(m => m.id === matchId);
              
              if (matchIndex !== -1) {
                  const match = round.matches[matchIndex];
                  match.top.score = scores.top;
                  match.bottom.score = scores.bottom;
                  match.winner = scores.top > scores.bottom ? match.top.name : match.bottom.name;
                  
                  // Propagate winner to next round
                  if (i + 1 < newRounds.length) {
                      const nextRound = newRounds[i+1];
                      const nextMatchIndex = Math.floor(matchIndex / 2);
                      const nextMatch = nextRound.matches[nextMatchIndex];
                      
                      if (nextMatch) {
                          if (matchIndex % 2 === 0) { // Top slot of next match
                              nextMatch.top.name = match.winner;
                          } else { // Bottom slot of next match
                              nextMatch.bottom.name = match.winner;
                          }

                          // If both players for the next match are decided, determine winner if one is a BYE
                          if(nextMatch.top.name !== 'TBD' && nextMatch.bottom.name !== 'TBD') {
                              if(nextMatch.bottom.name === 'BYE') nextMatch.winner = nextMatch.top.name;
                              if(nextMatch.top.name === 'BYE') nextMatch.winner = nextMatch.bottom.name;
                          }
                      }
                  }
                  matchFound = true;
                  break;
              }
          }
          // This part is for handling bye propagation when winner is set in nextMatch
           let roundsUpdated = true;
            while(roundsUpdated) {
                roundsUpdated = false;
                for (let i = 0; i < newRounds.length - 1; i++) {
                    const round = newRounds[i];
                    const nextRound = newRounds[i+1];

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
          
          return newRounds;
      });
  };
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  }

  if (!tournament) {
    return <div className="text-center py-10">Torneo no encontrado.</div>;
  }
  
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="relative w-full h-48 md:h-64 lg:h-80 rounded-lg overflow-hidden mb-8 shadow-lg">
        <Image src={tournament.image} layout="fill" objectFit="cover" alt={tournament.name} data-ai-hint={tournament.dataAiHint} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6">
          <h1 className="text-3xl md:text-5xl font-bold text-white font-headline">{tournament.name}</h1>
          <Badge className="mt-2 text-sm" variant="secondary">{tournament.status}</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="standings">Posiciones</TabsTrigger>
          {isOwner && <TabsTrigger value="manage">Gestionar</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <CardTitle>Detalles del Torneo</CardTitle>
               {isOwner && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tournaments/${tournament.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente tu torneo
                          y todos sus datos de nuestros servidores.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{tournament.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <Gamepad2 className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Juego</p>
                    <p className="text-lg text-foreground">{tournament.game}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Fecha de Inicio</p>
                    <p className="text-lg text-foreground">{new Date(tournament.startDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <GitBranch className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Formato</p>
                    <p className="text-lg text-foreground">{formatMapping[tournament.format]}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Participantes</p>
                    <p className="text-lg text-foreground">{tournament.participants} / {tournament.maxParticipants}</p>
                  </div>
                </div>
                 <div className="flex items-center space-x-3">
                  <Trophy className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Bolsa de Premios</p>
                    <p className="text-lg text-foreground">{tournament.prizePool || 'Por anunciar'}</p>
                  </div>
                </div>
                 <div className="flex items-center space-x-3">
                  <Shield className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Organizador</p>
                    <p className="text-lg text-foreground">{tournament.ownerEmail.split('@')[0]}</p>
                  </div>
                </div>
              </div>
              {!isOwner && tournament.status !== 'En curso' && (
                <div className="pt-6 border-t">
                    <Button size="lg">Unirse al Torneo</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bracket" className="mt-6">
          <Bracket tournament={tournament} isOwner={isOwner} rounds={rounds} onScoreReported={handleScoreReported} />
        </TabsContent>
        <TabsContent value="standings" className="mt-6">
          <StandingsTable rounds={rounds} />
        </TabsContent>
        {isOwner && (
          <TabsContent value="manage" className="mt-6">
            <ParticipantManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
