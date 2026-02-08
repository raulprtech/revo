
"use client";
import { CreateTournamentForm } from "@/components/tournaments/create-tournament-form";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { db, type Tournament, type Prize } from "@/lib/database";
import { useAuth } from "@/lib/supabase/auth-context";

// Form data type for the CreateTournamentForm
interface TournamentFormData {
    id: string;
    name: string;
    description: string;
    game: string;
    gameMode: string;
    maxParticipants: number;
    startDate: Date;
    startTime: string;
    format: 'single-elimination' | 'double-elimination' | 'swiss';
    tournamentMode: 'online' | 'presencial';
    prizePool?: string;
    prizes?: Prize[];
    registrationType: 'public' | 'private';
    location?: string;
    image?: string;
}

export default function EditTournamentPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [loading, setLoading] = useState(true);
    const [tournamentData, setTournamentData] = useState<TournamentFormData | null>(null);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading) return;
        
        // Middleware handles redirect to login if not authenticated.
        // If user is still null after auth resolves, don't load.
        if (!user) return;

        const loadTournament = async () => {
            try {
                const result = await db.getTournament(id);
                const tournament = result.tournament;
                
                if (!tournament) {
                    router.push('/dashboard');
                    return;
                }
                
                if (tournament.owner_email !== user.email) {
                    router.push(`/tournaments/${id}`);
                    return;
                }
                
                // Map to form data format
                setTournamentData({
                    id: tournament.id,
                    name: tournament.name,
                    description: tournament.description || '',
                    game: tournament.game,
                    gameMode: tournament.game_mode || '',
                    maxParticipants: tournament.max_participants,
                    startDate: new Date(tournament.start_date),
                    startTime: tournament.start_time || '10:00',
                    format: tournament.format,
                    tournamentMode: tournament.location ? 'presencial' : 'online',
                    prizePool: tournament.prize_pool,
                    prizes: tournament.prizes || [],
                    registrationType: tournament.registration_type,
                    location: tournament.location,
                    image: tournament.image || '',
                });
            } catch (error) {
                console.error('Error loading tournament:', error);
                router.push('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        
        loadTournament();
    }, [id, router, user, authLoading]);

    if (loading || authLoading || !tournamentData) {
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
                        <CreateTournamentForm mode="edit" tournamentData={tournamentData} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
