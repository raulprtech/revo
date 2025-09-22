
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Gamepad2, MapPin, Loader2, CheckCircle2 } from "lucide-react";

const getDefaultTournamentImage = (gameName: string) => {
  const colors = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-red-500 to-pink-600',
    'from-yellow-500 to-orange-600',
    'from-indigo-500 to-blue-600',
    'from-purple-500 to-indigo-600'
  ];

  const colorIndex = gameName.length % colors.length;
  return colors[colorIndex];
};
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db, type Tournament, type Participant } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";

// Interfaces are now imported from database

interface User {
    displayName: string;
    email: string;
    photoURL: string;
}

export default function TournamentsPage() {
    const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [participatingTournamentIds, setParticipatingTournamentIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const router = useRouter();


    useEffect(() => {
        const loadTournaments = async () => {
            try {
                const publicTournaments = await db.getPublicTournaments();
                setAllTournaments(publicTournaments);

                // Check current user
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (user && user.email) {
                    // Create user object from Supabase auth data
                    const userData = {
                        displayName: user.user_metadata?.full_name || user.email.split('@')[0],
                        email: user.email,
                        photoURL: user.user_metadata?.avatar_url || ''
                    };
                    setCurrentUser(userData);

                    // Also store in localStorage for consistency
                    localStorage.setItem("user", JSON.stringify(userData));

                    // Check which tournaments user is participating in
                    const ids = new Set<string>();
                    for (const tournament of publicTournaments) {
                        const isParticipating = await db.isUserParticipating(tournament.id, user.email);
                        if (isParticipating) {
                            ids.add(tournament.id);
                        }
                    }
                    setParticipatingTournamentIds(ids);
                } else {
                    // No authenticated user, clear localStorage
                    localStorage.removeItem("user");
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error('Error loading tournaments:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTournaments();
    }, []);

    const handleJoinTournament = async (tournamentId: string) => {
        if (!currentUser) {
            toast({ title: "Debes iniciar sesión", description: "Inicia sesión para unirte a un torneo.", variant: "destructive" });
            router.push('/login');
            return;
        }

        try {
            const tournamentIndex = allTournaments.findIndex(t => t.id === tournamentId);
            if (tournamentIndex === -1) return;

            const tournament = allTournaments[tournamentIndex];

            if (tournament.participants >= tournament.max_participants) {
                toast({ title: "Torneo Lleno", description: "Este torneo ya ha alcanzado el máximo de participantes.", variant: "destructive" });
                return;
            }

            // Add participant to database
            await db.addParticipant({
                tournament_id: tournamentId,
                email: currentUser.email,
                name: currentUser.displayName,
                avatar: currentUser.photoURL,
                status: 'Pendiente'
            });

            // Reload tournaments to get updated participant count from database
            const updatedTournaments = await db.getPublicTournaments();
            setAllTournaments(updatedTournaments);
            setParticipatingTournamentIds(prev => new Set(prev).add(tournamentId));

            toast({ title: "¡Inscripción Enviada!", description: "Tu solicitud para unirte al torneo ha sido enviada." });
        } catch (error) {
            console.error('Error joining tournament:', error);
            toast({
                title: "Error",
                description: "No se pudo procesar tu inscripción. Inténtalo de nuevo.",
                variant: "destructive"
            });
        }
    }

    const filteredTournaments = allTournaments.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.game.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-background text-foreground min-h-screen p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-bold font-headline">Explorar Torneos</h1>
                        <p className="text-muted-foreground">Encuentra y únete a competiciones de la comunidad.</p>
                    </div>
                </header>

                <div className="relative mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por nombre o juego..." 
                        className="pl-10 bg-card border-border h-12" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {filteredTournaments.length > 0 ? (
                    <div className="mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredTournaments.map((tournament) => {
                            const isParticipant = participatingTournamentIds.has(tournament.id);
                            return (
                                <Card key={tournament.id} className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-card flex flex-col">
                                    <Link href={`/tournaments/${tournament.id}`} className="block">
                                        {tournament.image && tournament.image.trim() !== '' ? (
                                            <Image
                                            src={tournament.image}
                                            width={600}
                                            height={400}
                                            alt={tournament.name}
                                            className="w-full h-48 object-cover"
                                            />
                                        ) : (
                                            <div className={`w-full h-48 bg-gradient-to-br ${getDefaultTournamentImage(tournament.game)} flex items-center justify-center`}>
                                                <div className="text-center text-white">
                                                    <Gamepad2 className="h-12 w-12 mx-auto mb-2 opacity-80" />
                                                    <p className="font-semibold text-sm opacity-90">{tournament.game}</p>
                                                </div>
                                            </div>
                                        )}
                                    </Link>
                                    <CardHeader>
                                        <CardTitle>{tournament.name}</CardTitle>
                                        <CardDescription className="flex items-center pt-2">
                                        <Gamepad2 className="mr-2 h-4 w-4" />
                                        {tournament.game}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Users className="mr-2 h-4 w-4" />
                                            <span>{tournament.participants} / {tournament.max_participants} Participantes</span>
                                        </div>
                                        {tournament.location && (
                                        <div className="flex items-center text-sm text-muted-foreground mt-2">
                                            <MapPin className="mr-2 h-4 w-4" />
                                            <span>{tournament.location}</span>
                                        </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-4 flex gap-2">
                                        <Button asChild className="w-full">
                                            <Link href={`/tournaments/${tournament.id}`}>
                                                Ver Detalles
                                            </Link>
                                        </Button>
                                         <Button 
                                            variant="secondary" 
                                            className="w-full"
                                            onClick={() => handleJoinTournament(tournament.id)}
                                            disabled={isParticipant}
                                        >
                                            {isParticipant ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
                                            {isParticipant ? 'Inscrito' : 'Inscribirse'}
                                         </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                 ) : (
                    <div className="text-center py-16 bg-card rounded-lg">
                        <h3 className="text-xl font-semibold">No se encontraron torneos abiertos</h3>
                        <p className="text-muted-foreground mt-2">
                            {searchTerm 
                                ? `No hay torneos abiertos que coincidan con "${searchTerm}".`
                                : "Actualmente no hay torneos públicos que acepten participantes."
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
