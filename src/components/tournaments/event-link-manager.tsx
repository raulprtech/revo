"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, Plus, X, ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { db, type Event } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";

interface EventLinkManagerProps {
    tournamentId: string;
    currentEventId?: string | null;
    onEventChanged?: () => void;
}

export function EventLinkManager({ tournamentId, currentEventId, onEventChanged }: EventLinkManagerProps) {
    const [loading, setLoading] = useState(false);
    const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string>(currentEventId || 'none');
    const router = useRouter();
    const { toast } = useToast();

    // Load available events
    useEffect(() => {
        const loadEvents = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                const userEvents = await db.getUserEvents(user.email);
                setAvailableEvents(userEvents);
            }
        };
        loadEvents();
    }, []);

    // Load current event if linked
    useEffect(() => {
        if (currentEventId) {
            db.getEventById(currentEventId).then(event => {
                setCurrentEvent(event);
                setSelectedEventId(currentEventId);
            });
        } else {
            setCurrentEvent(null);
            setSelectedEventId('none');
        }
    }, [currentEventId]);

    const handleEventChange = async (newEventId: string) => {
        if (newEventId === 'new') {
            router.push('/events/create');
            return;
        }

        setLoading(true);
        try {
            const eventIdToSet = newEventId === 'none' ? null : newEventId;
            await db.assignTournamentToEvent(tournamentId, eventIdToSet);

            if (eventIdToSet) {
                const event = availableEvents.find(e => e.id === eventIdToSet);
                setCurrentEvent(event || null);
                toast({
                    title: "Torneo vinculado",
                    description: `El torneo ahora es parte del evento "${event?.name}".`,
                });
            } else {
                setCurrentEvent(null);
                toast({
                    title: "Torneo desvinculado",
                    description: "El torneo ahora es independiente.",
                });
            }

            setSelectedEventId(newEventId);
            onEventChanged?.();
        } catch (error) {
            console.error('Error updating event link:', error);
            toast({
                title: "Error",
                description: "No se pudo actualizar la vinculación del evento.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUnlink = async () => {
        await handleEventChange('none');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Evento Vinculado
                </CardTitle>
                <CardDescription>
                    Vincula este torneo a un evento para agruparlo con otros torneos
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {currentEvent ? (
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ 
                                    background: `linear-gradient(135deg, ${currentEvent.primary_color}, ${currentEvent.secondary_color})` 
                                }}
                            >
                                <Trophy className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="font-medium">{currentEvent.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {currentEvent.tournaments_count || 0} torneos en este evento
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/events/${currentEvent.slug}`}>
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Desvincular del evento?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            El torneo dejará de aparecer en la página del evento "{currentEvent.name}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleUnlink}>
                                            Desvincular
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <Select 
                            value={selectedEventId} 
                            onValueChange={handleEventChange}
                            disabled={loading}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Seleccionar evento...">
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Actualizando...
                                        </span>
                                    ) : (
                                        "Torneo independiente"
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <span className="text-muted-foreground">Sin evento</span>
                                </SelectItem>
                                {availableEvents.length > 0 && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                            Tus Eventos
                                        </div>
                                        {availableEvents.map((event) => (
                                            <SelectItem key={event.id} value={event.id}>
                                                <span className="flex items-center gap-2">
                                                    <Trophy className="h-4 w-4 text-primary" />
                                                    {event.name}
                                                    <Badge variant="secondary" className="ml-1 text-xs">
                                                        {event.tournaments_count || 0}
                                                    </Badge>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                                <div className="border-t my-1" />
                                <SelectItem value="new">
                                    <span className="flex items-center gap-2 text-primary">
                                        <Plus className="h-4 w-4" />
                                        Crear nuevo evento
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {availableEvents.length === 0 && !currentEvent && (
                    <p className="text-sm text-muted-foreground">
                        No tienes eventos creados.{" "}
                        <Link href="/events/create" className="text-primary hover:underline">
                            Crea tu primer evento
                        </Link>{" "}
                        para agrupar múltiples torneos.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
