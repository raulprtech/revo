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
    description: 'The ultimate Street Fighter 6 tournament of the summer. Top players from around the world will compete for the grand prize and the title of champion. Join us for an epic showdown of skill and strategy.',
    participants: 4,
    maxParticipants: 128,
    startDate: 'July 20, 2024',
    format: 'Single Elimination',
    status: 'Ongoing',
    isOwner: true, 
    image: 'https://placehold.co/1200x400.png',
    dataAiHint: 'fighting game esports',
};

export default function TournamentPage({ params }: { params: { id: string } }) {
  // In a real app, you would fetch tournament data using params.id
  
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
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          {tournament.isOwner && <TabsTrigger value="manage">Manage</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{tournament.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <Gamepad2 className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Game</p>
                    <p className="text-lg text-foreground">{tournament.game}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-lg text-foreground">{tournament.startDate}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <GitBranch className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Format</p>
                    <p className="text-lg text-foreground">{tournament.format}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Participants</p>
                    <p className="text-lg text-foreground">{tournament.participants} / {tournament.maxParticipants}</p>
                  </div>
                </div>
                 <div className="flex items-center space-x-3">
                  <Trophy className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Prize Pool</p>
                    <p className="text-lg text-foreground">$10,000</p>
                  </div>
                </div>
                 <div className="flex items-center space-x-3">
                  <Shield className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Organizer</p>
                    <p className="text-lg text-foreground">AdminUser</p>
                  </div>
                </div>
              </div>
              {!tournament.isOwner && tournament.status !== 'Ongoing' && (
                <div className="pt-6 border-t">
                    <Button size="lg">Join Tournament</Button>
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
