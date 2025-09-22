"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Users, Search, Loader2 } from "lucide-react";
import Link from 'next/link';
import { useRouter } from "next/navigation";

interface Tournament {
    id: string;
    name: string;
    description: string;
    participants: number;
    maxParticipants: number;
    startDate: string;
    avatar: string;
    owner_email: string;
}

export default function DashboardPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            router.push('/login');
            return;
        }

        const user = JSON.parse(storedUser);
        const allTournaments: Tournament[] = JSON.parse(localStorage.getItem("tournaments") || "[]");
        const userTournaments = allTournaments.filter(t => t.owner_email === user.email);
        setTournaments(userTournaments);
        setLoading(false);
    }, [router]);

    const filteredTournaments = tournaments.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <h1 className="text-4xl font-bold mb-4 sm:mb-0">Tus Torneos</h1>
                    <Button size="lg" asChild>
                       <Link href="/tournaments/create">
                            Crear un Torneo
                            <ChevronDown className="ml-2 h-4 w-4" />
                       </Link>
                    </Button>
                </header>

                <div className="flex border-b border-border mb-6">
                    <button className="py-2 px-4 text-sm font-semibold border-b-2 border-primary text-primary">TODOS {filteredTournaments.length}</button>
                    <button className="py-2 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground">PENDIENTE 0</button>
                    <button className="py-2 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground">EN CURSO 0</button>
                    <button className="py-2 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground">COMPLETO 0</button>
                </div>

                <div className="relative mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar tus torneos" 
                        className="pl-10 bg-card border-border h-12" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="space-y-4">
                    {filteredTournaments.length > 0 ? (
                        filteredTournaments.map((tournament) => (
                            <Link href={`/tournaments/${tournament.id}`} key={tournament.id} className="block">
                                <div className="bg-card p-4 rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={tournament.avatar} />
                                            <AvatarFallback>{tournament.name.substring(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{tournament.name}</p>
                                            <p className="text-sm text-muted-foreground">{tournament.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-6">
                                        <div className="flex items-center space-x-2 text-muted-foreground">
                                            <Users className="h-4 w-4" />
                                            <span>{tournament.participants} / {tournament.maxParticipants}</span>
                                        </div>
                                        <div className="text-sm text-right text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
                                            <p>{new Date(tournament.startDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="text-center py-16 bg-card rounded-lg">
                            <h3 className="text-xl font-semibold">No se encontraron torneos</h3>
                            <p className="text-muted-foreground mt-2">
                                {searchTerm 
                                    ? `No hay torneos que coincidan con "${searchTerm}".`
                                    : "No has creado ningún torneo todavía."
                                }
                            </p>
                            {!searchTerm && (
                                <Button asChild className="mt-4">
                                    <Link href="/tournaments/create">Crear tu primer torneo</Link>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
