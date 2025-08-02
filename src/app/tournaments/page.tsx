
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Gamepad2 } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from "lucide-react";

interface Tournament {
    id: string;
    name: string;
    description: string;
    game: string;
    participants: number;
    maxParticipants: number;
    startDate: string;
    image: string;
    dataAiHint: string;
    registrationType: 'public' | 'private';
    status: string;
}

export default function TournamentsPage() {
    const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const storedTournaments: Tournament[] = JSON.parse(localStorage.getItem("tournaments") || "[]");
        
        const openTournaments = storedTournaments.filter(t => 
            t.registrationType === 'public' && 
            t.status !== 'En curso' &&
            t.participants < t.maxParticipants
        );
        
        setAllTournaments(openTournaments);
        setLoading(false);
    }, []);

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
                        {filteredTournaments.map((tournament) => (
                            <Card key={tournament.id} className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-card">
                                <Link href={`/tournaments/${tournament.id}`} className="block">
                                    <Image
                                    src={tournament.image}
                                    width={600}
                                    height={400}
                                    alt={tournament.name}
                                    data-ai-hint={tournament.dataAiHint}
                                    className="w-full h-48 object-cover"
                                    />
                                </Link>
                                <CardHeader>
                                    <CardTitle>{tournament.name}</CardTitle>
                                    <CardDescription className="flex items-center pt-2">
                                    <Gamepad2 className="mr-2 h-4 w-4" />
                                    {tournament.game}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Users className="mr-2 h-4 w-4" />
                                        <span>{tournament.participants} / {tournament.maxParticipants} Participantes</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4">
                                    <Button asChild className="w-full">
                                        <Link href={`/tournaments/${tournament.id}`}>
                                            Ver Detalles
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
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
