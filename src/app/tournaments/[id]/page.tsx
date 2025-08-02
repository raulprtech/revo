import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Users, Calendar, Trophy, Shield, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import Bracket from "@/components/tournaments/bracket";
import ParticipantList from "@/components/tournaments/participant-list";
import ParticipantManager from "@/components/tournaments/participant-manager";
import Image from "next/image";

const tournament = {
    id: '1',
    name: 'Summer Brawl 2024',
    game: 'Street Fighter 6',
    description: 'El torneo definitivo de Street Fighter 6 del verano. Los mejores jugadores de todo el mundo competirán por el gran premio y el título de campeón. Únete a nosotros para un enfrentamiento épico de habilidad y estrategia.',
    participants: 4,
    maxParticipants: 128,
    startDate: 'Julio 20, 2024',
    format: 'Eliminación Simple',
    status: 'En curso',
    isOwner: true, 
    image: 'https://placehold.co/1200x400.png',
    dataAiHint: 'fighting game esports',
};

export default function TournamentPage({ params }: { params: { id: string } }) {
  // En una aplicación real, obtendrías los datos del torneo usando params.id
  
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
          {tournament.isOwner && <TabsTrigger value="manage">Gestionar</TabsTrigger>}
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
                    <p className="text-lg text-foreground">{tournament.startDate}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <GitBranch className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Formato</p>
                    <p className="text-lg text-foreground">{tournament.format}</p>
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
                    <p className="text-lg text-foreground">AdminUser</p>
                  </div>
                </div>
              </div>
              {!tournament.isOwner && tournament.status !== 'En curso' && (
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
        {tournament.isOwner && (
          <TabsContent value="manage" className="mt-6">
            <ParticipantManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
