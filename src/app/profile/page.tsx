
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, Gamepad2, Loader2, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface User {
    displayName: string;
    email: string;
    photoURL: string;
}

interface Tournament {
    id: string;
    name: string;
    game: string;
    status: string; // Tournament status
    image: string;
    dataAiHint: string;
    ownerEmail: string;
}

interface ParticipatingTournament extends Tournament {
    participantStatus: ParticipantStatus; // Participant status
}

type ParticipantStatus = 'Aceptado' | 'Pendiente' | 'Rechazado';

interface Participant {
    email: string;
    name: string;
    avatar: string;
    status: ParticipantStatus;
}

const TournamentListItem = ({ tournament }: { tournament: ParticipatingTournament | Tournament }) => {
    const isParticipating = 'participantStatus' in tournament;

    const getStatusVariant = (status: ParticipantStatus) => {
        switch (status) {
            case 'Aceptado':
                return 'default';
            case 'Pendiente':
                return 'secondary';
            case 'Rechazado':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    return (
        <Card className="transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row items-center space-x-4 p-4">
                <Image src={tournament.image} width={120} height={80} alt={tournament.name} data-ai-hint={tournament.dataAiHint} className="rounded-md w-full sm:w-32 h-24 object-cover" />
                <div className="flex-grow pt-4 sm:pt-0 text-center sm:text-left">
                    <CardTitle className="text-lg">{tournament.name}</CardTitle>
                    <CardDescription className="flex items-center justify-center sm:justify-start pt-1"><Gamepad2 className="mr-2 h-4 w-4"/>{tournament.game}</CardDescription>
                </div>
                <div className="flex items-center space-x-4 pt-4 sm:pt-0">
                    {isParticipating ? (
                         <Badge variant={getStatusVariant(tournament.participantStatus)}>{tournament.participantStatus}</Badge>
                    ) : (
                        <Badge variant={tournament.status === 'En curso' ? 'default' : 'secondary'}>{tournament.status}</Badge>
                    )}
                    <Button asChild variant="outline">
                    <Link href={`/tournaments/${tournament.id}`}>Ver <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [createdTournaments, setCreatedTournaments] = useState<Tournament[]>([]);
    const [participatingTournaments, setParticipatingTournaments] = useState<ParticipatingTournament[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);

            const allTournaments: Tournament[] = JSON.parse(localStorage.getItem("tournaments") || "[]");
            const allParticipants: Record<string, Participant[]> = JSON.parse(localStorage.getItem("participantsData") || "{}");

            const userCreated = allTournaments.filter(t => t.ownerEmail === parsedUser.email);
            
            const userParticipating: ParticipatingTournament[] = [];
            allTournaments.forEach(tournament => {
                const participants = allParticipants[tournament.id] || [];
                const userAsParticipant = participants.find(p => p.email === parsedUser.email);
                
                if (userAsParticipant && userAsParticipant.status !== 'Rechazado') {
                    userParticipating.push({
                        ...tournament,
                        participantStatus: userAsParticipant.status,
                    });
                }
            });

            setCreatedTournaments(userCreated);
            setParticipatingTournaments(userParticipating);

        } else {
            router.push("/login");
        }
        setLoading(false);
    }, [router]);

    const getInitials = (name?: string | null) => {
        if (!name) return "U";
        const names = name.split(" ");
        return names.length > 1
          ? `${names[0][0]}${names[names.length - 1][0]}`
          : names[0][0];
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <Card className="mb-8">
                <CardContent className="p-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.photoURL} alt={user.displayName || ''} />
                        <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left flex-grow">
                        <h1 className="text-3xl font-bold font-headline">{user.displayName}</h1>
                        <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Editar Perfil</Button>
                </CardContent>
            </Card>

            <Tabs defaultValue="created" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="created">Mis Torneos</TabsTrigger>
                    <TabsTrigger value="participating">Participando En</TabsTrigger>
                </TabsList>
                <TabsContent value="created" className="mt-6">
                    <div className="space-y-4">
                        {createdTournaments.length > 0 ? (
                             createdTournaments.map(t => <TournamentListItem key={t.id} tournament={t} />)
                        ) : (
                            <Card className="flex items-center justify-center h-40 flex-col gap-4">
                                <p className="text-muted-foreground">Aún no has creado ningún torneo.</p>
                                <Button asChild>
                                    <Link href="/tournaments/create">Crear uno ahora</Link>
                                </Button>
                            </Card>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="participating" className="mt-6">
                    <div className="space-y-4">
                         {participatingTournaments.length > 0 ? (
                             participatingTournaments.map(t => <TournamentListItem key={t.id} tournament={t} />)
                        ) : (
                             <Card className="flex items-center justify-center h-40">
                                <p className="text-muted-foreground">No estás participando en ningún torneo.</p>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
