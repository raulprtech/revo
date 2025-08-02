"use client";

import { useEffect, useState, use } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Users, Calendar, Trophy, Shield, GitBranch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Bracket from "@/components/tournaments/bracket";
import ParticipantList from "@/components/tournaments/participant-list";
import ParticipantManager from "@/components/tournaments/participant-manager";
import Image from "next/image";

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
}

const formatMapping = {
    'single-elimination': 'Eliminación Simple',
    'double-elimination': 'Doble Eliminación',
    'swiss': 'Suizo'
};


export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const { id } = use(params);

  useEffect(() => {
    const allTournaments: Tournament[] = JSON.parse(localStorage.getItem("tournaments") || "[]");
    const currentTournament = allTournaments.find(t => t.id === id);

    if (currentTournament) {
        setTournament(currentTournament);
        const storedUser = localStorage.getItem("user");
        if(storedUser) {
            const user = JSON.parse(storedUser);
            setIsOwner(user.email === currentTournament.ownerEmail);
        }
    }
    setLoading(false);
  }, [id]);
  
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
          <TabsTrigger value="participants">Participantes</TabsTrigger>
          {isOwner && <TabsTrigger value="manage">Gestionar</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Torneo</CardTitle>
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
                    <p className="text-lg text-foreground">$10,000</p>
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
          <Bracket />
        </TabsContent>
        <TabsContent value="participants" className="mt-6">
          <ParticipantList />
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
