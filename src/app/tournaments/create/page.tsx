"use client";
import { CreateTournamentForm } from "@/components/tournaments/create-tournament-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Loader2, Calendar } from "lucide-react";
import { db, type Event } from "@/lib/database";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-context";

function CreateTournamentContent() {
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const [loadingEvent, setLoadingEvent] = useState(false);
    const [linkedEvent, setLinkedEvent] = useState<Event | null>(null);
    
    const eventId = searchParams.get('eventId');

    useEffect(() => {
        const loadEvent = async () => {
            // Load linked event if eventId is provided
            if (eventId) {
                setLoadingEvent(true);
                const event = await db.getEventById(eventId);
                setLinkedEvent(event);
                setLoadingEvent(false);
            }
        };

        loadEvent();
    }, [eventId]);

    if (authLoading || loadingEvent) {
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
                    <h1 className="text-4xl font-bold font-headline">Crear un Nuevo Torneo</h1>
                    <p className="text-muted-foreground text-lg">Rellena el formulario para configurar tu evento.</p>
                    
                    {linkedEvent && (
                        <div className="flex items-center gap-2 mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                            <Calendar className="h-5 w-5 text-primary" />
                            <span className="text-sm">
                                Este torneo será parte del evento{" "}
                                <Link href={`/events/${linkedEvent.slug}`} className="font-semibold text-primary hover:underline">
                                    {linkedEvent.name}
                                </Link>
                            </span>
                            <Badge variant="secondary" className="ml-auto">
                                Vinculado
                            </Badge>
                        </div>
                    )}
                </div>
                <Card>
                    <CardContent className="p-8">
                        <CreateTournamentForm mode="create" eventId={eventId || undefined} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function CreateTournamentPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        }>
            <CreateTournamentContent />
        </Suspense>
    );
}
