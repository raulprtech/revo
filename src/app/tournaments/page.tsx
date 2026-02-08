"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Gamepad2, MapPin, Loader2, CheckCircle2, Calendar } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";
import { usePublicTournaments, joinTournamentOptimistic, invalidateCache } from "@/hooks/use-tournaments";
import { useTournamentsListRealtime } from "@/hooks/use-realtime";
import { db } from "@/lib/database";
import useSWR from "swr";
import { getDefaultTournamentImage } from "@/lib/utils";
import { Pagination, paginateArray } from "@/components/ui/pagination";

const TOURNAMENTS_PER_PAGE = 12;

export default function TournamentsPage() {
    const { user, loading: authLoading } = useAuth();
    const { tournaments, isLoading: tournamentsLoading, refresh } = usePublicTournaments();
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [joiningTournamentId, setJoiningTournamentId] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    // Real-time updates for the tournaments list
    useTournamentsListRealtime(
        useCallback(() => {
            // Silently refresh the list on any change
            refresh();
        }, [refresh]),
        !tournamentsLoading
    );

    // Fetch events to display event names on tournament cards
    const { data: eventsMap = new Map<string, string>() } = useSWR(
        tournaments.length > 0 ? 'events-map' : null,
        async () => {
            const events = await db.getEvents();
            const map = new Map<string, string>();
            events.forEach(e => map.set(e.id, e.name));
            return map;
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    // Fetch participating tournament IDs for current user (cached)
    const { data: participatingIds = new Set<string>(), mutate: mutateParticipating } = useSWR(
        user?.email ? `user-participating:${user.email}` : null,
        async () => {
            if (!user?.email || tournaments.length === 0) return new Set<string>();
            
            // Batch check participation for all tournaments
            const checks = await Promise.all(
                tournaments.map(async (t) => {
                    const isParticipating = await db.isUserParticipating(t.id, user.email);
                    return { id: t.id, isParticipating };
                })
            );
            
            return new Set(checks.filter(c => c.isParticipating).map(c => c.id));
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 10000,
        }
    );

    const loading = authLoading || tournamentsLoading;

    const handleJoinTournament = async (tournamentId: string) => {
        if (!user) {
            toast({ title: "Debes iniciar sesión", description: "Inicia sesión para unirte a un torneo.", variant: "destructive" });
            router.push('/login');
            return;
        }

        const tournament = tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;

        if (tournament.participants >= tournament.max_participants) {
            toast({ title: "Torneo Lleno", description: "Este torneo ya ha alcanzado el máximo de participantes.", variant: "destructive" });
            return;
        }

        setJoiningTournamentId(tournamentId);

        try {
            await joinTournamentOptimistic(tournamentId, {
                tournament_id: tournamentId,
                email: user.email,
                name: user.displayName,
                avatar: user.photoURL,
                status: 'Pendiente'
            });

            // Update local participating set
            mutateParticipating(new Set([...participatingIds, tournamentId]), false);
            
            // Refresh tournaments to get updated count
            refresh();

            toast({ title: "¡Inscripción Enviada!", description: "Tu solicitud para unirte al torneo ha sido enviada." });
        } catch (error) {
            console.error('Error joining tournament:', error);
            toast({
                title: "Error",
                description: "No se pudo procesar tu inscripción. Inténtalo de nuevo.",
                variant: "destructive"
            });
        } finally {
            setJoiningTournamentId(null);
        }
    }

    const filteredTournaments = tournaments.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.game.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const { data: paginatedTournaments, totalPages, totalItems } = paginateArray(
        filteredTournaments,
        currentPage,
        TOURNAMENTS_PER_PAGE
    );

    // Reset to page 1 when search changes
    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

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
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>

                {filteredTournaments.length > 0 && (
                    <p className="text-sm text-muted-foreground mb-4">
                        Mostrando {paginatedTournaments.length} de {totalItems} torneos
                    </p>
                )}

                {paginatedTournaments.length > 0 ? (
                    <div className="mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {paginatedTournaments.map((tournament) => {
                            const isParticipant = participatingIds.has(tournament.id);
                            const isJoining = joiningTournamentId === tournament.id;
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
                                        {tournament.event_id && eventsMap.get(tournament.event_id) && (
                                            <Badge variant="outline" className="mt-2 w-fit text-xs bg-accent/10">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {eventsMap.get(tournament.event_id)}
                                            </Badge>
                                        )}
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
                                            disabled={isParticipant || isJoining}
                                        >
                                            {isJoining ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : isParticipant ? (
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                            ) : null}
                                            {isJoining ? 'Inscribiendo...' : isParticipant ? 'Inscrito' : 'Inscribirse'}
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

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    className="mt-8"
                />
            </div>
        </div>
    );
}
