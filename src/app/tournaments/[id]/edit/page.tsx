
"use client";
import { CreateTournamentForm } from "@/components/tournaments/create-tournament-form";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
    registrationType: 'public' | 'private';
    location?: string;
}

export default function EditTournamentPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState<Tournament | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/login');
            return;
        }

        const user = JSON.parse(userStr);
        const allTournaments: Tournament[] = JSON.parse(localStorage.getItem("tournaments") || "[]");
        const currentTournament = allTournaments.find(t => t.id === id);

        if (currentTournament) {
            if (currentTournament.ownerEmail !== user.email) {
                router.push(`/tournaments/${id}`);
                return;
            }
            setTournament(currentTournament);
        } else {
             router.push('/dashboard');
        }
        
        setLoading(false);
    }, [id, router]);

    if (loading || !tournament) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto py-10 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="space-y-2 mb-8">
                    <h1 className="text-4xl font-bold font-headline">Editar Torneo</h1>
                    <p className="text-muted-foreground text-lg">Actualiza los detalles de tu evento.</p>
                </div>
                <Card>
                    <CardContent className="p-8">
                        <CreateTournamentForm mode="edit" tournamentData={tournament} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
