"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
    Calendar, MapPin, Trophy, Users, Gamepad2, ArrowLeft, 
    ExternalLink, Edit, Plus, Loader2, Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { db, type Event, type Tournament } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";
import { LinkExistingTournaments } from "@/components/events/link-existing-tournaments";
import EventStats from "@/components/events/event-stats";
import { OrganizerManager } from "@/components/shared/organizer-manager";
import { useToast } from "@/hooks/use-toast";

const getStatusVariant = (status: string) => {
    switch (status) {
        case 'En curso':
            return 'default';
        case 'Próximo':
            return 'secondary';
        case 'Finalizado':
            return 'outline';
        default:
            return 'secondary';
    }
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
        return formatDate(startDate);
    }
    
    return `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;
};

const getDefaultTournamentGradient = (game: string) => {
    const colors = [
        'from-blue-500 to-purple-600',
        'from-green-500 to-teal-600',
        'from-red-500 to-pink-600',
        'from-yellow-500 to-orange-600',
        'from-indigo-500 to-blue-600',
    ];
    return colors[game.length % colors.length];
};

// Sponsor card component with image error handling
function SponsorCard({ sponsor }: { sponsor: { name: string; logo: string; url?: string } }) {
    const [imageError, setImageError] = useState(false);
    
    // Check if we have a valid logo URL
    const hasValidLogo = sponsor.logo && sponsor.logo.trim() !== '' && 
        (sponsor.logo.startsWith('http://') || sponsor.logo.startsWith('https://'));
    
    // Check if it's a Supabase storage URL (no CORS issues)
    const isSupabaseUrl = sponsor.logo?.includes('supabase.co/storage');
    
    const content = (
        <div className="text-center group">
            <div className="bg-muted rounded-lg p-4 h-24 flex items-center justify-center transition-all group-hover:bg-muted/80">
                {!hasValidLogo || imageError ? (
                    // Fallback when no logo or image fails to load
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Trophy className="h-8 w-8 mb-1" />
                        <span className="text-xs font-medium">{sponsor.name}</span>
                    </div>
                ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={sponsor.logo}
                        alt={sponsor.name}
                        className="object-contain max-h-16 max-w-full"
                        onError={() => setImageError(true)}
                        loading="lazy"
                        {...(!isSupabaseUrl && { referrerPolicy: "no-referrer" })}
                    />
                )}
            </div>
            <p className="mt-2 text-sm font-medium flex items-center justify-center">
                {sponsor.name}
                {sponsor.url && <ExternalLink className="ml-1 h-3 w-3" />}
            </p>
        </div>
    );

    if (sponsor.url) {
        return (
            <a 
                href={sponsor.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
            >
                {content}
            </a>
        );
    }

    return content;
}

function TournamentCard({ tournament, eventColors }: { tournament: Tournament; eventColors: { primary: string; secondary: string } }) {
    return (
        <Card className="overflow-hidden transition-all hover:shadow-lg group">
            <div className="relative h-32 w-full overflow-hidden">
                {tournament.image ? (
                    <Image
                        src={tournament.image}
                        alt={tournament.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                    />
                ) : (
                    <div 
                        className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getDefaultTournamentGradient(tournament.game)}`}
                    >
                        <Gamepad2 className="h-10 w-10 text-white/80" />
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    <Badge variant={getStatusVariant(tournament.status)}>{tournament.status}</Badge>
                </div>
            </div>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-1">{tournament.name}</CardTitle>
                <CardDescription className="flex items-center">
                    <Gamepad2 className="mr-1 h-3 w-3" />
                    {tournament.game}
                    {tournament.game_mode && ` - ${tournament.game_mode}`}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground">
                        <Users className="mr-1 h-3 w-3" />
                        {tournament.participants}/{tournament.max_participants}
                    </span>
                    <span className="flex items-center text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {tournament.start_time || "TBD"}
                    </span>
                </div>
                <Button asChild size="sm" className="w-full" variant="outline">
                    <Link href={`/tournaments/${tournament.id}`}>Ver Torneo</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

export default function EventPage() {
    const [event, setEvent] = useState<Event | null>(null);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [isMainOwner, setIsMainOwner] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const slug = params.slug as string;

    const loadTournaments = async (eventId: string) => {
        const eventTournaments = await db.getEventTournaments(eventId);
        setTournaments(eventTournaments);
    };

    useEffect(() => {
        const loadEvent = async () => {
            try {
                const eventData = await db.getEventBySlug(slug);
                
                if (!eventData) {
                    router.push('/events');
                    return;
                }

                setEvent(eventData);

                // Load tournaments for this event
                await loadTournaments(eventData.id);

                // Check if current user is owner or co-organizer
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUserEmail(user?.email || null);
                
                const isMainOwnerCheck = user?.email === eventData.owner_email;
                const isOrganizerCheck = eventData.organizers?.includes(user?.email ?? '') ?? false;
                
                setIsMainOwner(isMainOwnerCheck);
                setIsOwner(isMainOwnerCheck || isOrganizerCheck);
            } catch (error) {
                console.error('Error loading event:', error);
            } finally {
                setLoading(false);
            }
        };

        loadEvent();
    }, [slug, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="container mx-auto py-10 px-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Evento no encontrado</h1>
                <Button asChild>
                    <Link href="/events">Volver a Eventos</Link>
                </Button>
            </div>
        );
    }

    const eventColors = {
        primary: event.primary_color,
        secondary: event.secondary_color,
    };

    // Group tournaments by status
    const ongoingTournaments = tournaments.filter(t => t.status === 'En curso');
    const upcomingTournaments = tournaments.filter(t => t.status === 'Próximo');
    const finishedTournaments = tournaments.filter(t => t.status === 'Finalizado');

    // Group tournaments by game
    const tournamentsByGame = tournaments.reduce((acc, t) => {
        if (!acc[t.game]) acc[t.game] = [];
        acc[t.game].push(t);
        return acc;
    }, {} as Record<string, Tournament[]>);

    return (
        <div className="min-h-screen">
            {/* Hero Banner */}
            <div 
                className="relative w-full h-64 md:h-80 lg:h-96"
                style={{
                    background: event.banner_image 
                        ? `url(${event.banner_image}) center/cover no-repeat`
                        : `linear-gradient(135deg, ${event.primary_color}, ${event.secondary_color})`
                }}
            >
                <div className="absolute inset-0 bg-black/50" />
                
                {/* Back Button */}
                <div className="absolute top-4 left-4">
                    <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20">
                        <Link href="/events">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Eventos
                        </Link>
                    </Button>
                </div>

                {/* Edit Button */}
                {isOwner && (
                    <div className="absolute top-4 right-4">
                        <Button variant="secondary" size="sm" asChild>
                            <Link href={`/events/${slug}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </Link>
                        </Button>
                    </div>
                )}

                {/* Event Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <div className="container mx-auto flex items-end gap-6">
                        {event.logo_image && (
                            <div className="hidden md:block">
                                <Image
                                    src={event.logo_image}
                                    alt={event.name}
                                    width={120}
                                    height={120}
                                    className="rounded-lg bg-white p-2"
                                />
                            </div>
                        )}
                        <div className="flex-1">
                            <Badge variant={getStatusVariant(event.status)} className="mb-2">
                                {event.status}
                            </Badge>
                            <h1 className="text-3xl md:text-5xl font-bold text-white font-headline mb-2">
                                {event.name}
                            </h1>
                            {event.organizer_name && (
                                <p className="text-white/80 flex items-center">
                                    Organizado por <span className="font-semibold ml-1">{event.organizer_name}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto py-8 px-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 -mt-12 relative z-10">
                    <Card className="bg-card/95 backdrop-blur">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Calendar className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground">Fechas</p>
                                <p className="font-semibold text-sm">
                                    {formatDateRange(event.start_date, event.end_date)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {event.location && (
                        <Card className="bg-card/95 backdrop-blur">
                            <CardContent className="p-4 flex items-center gap-3">
                                <MapPin className="h-8 w-8 text-primary" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Ubicación</p>
                                    <p className="font-semibold text-sm">{event.location}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    
                    <Card className="bg-card/95 backdrop-blur">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Trophy className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground">Torneos</p>
                                <p className="font-semibold text-sm">{tournaments.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-card/95 backdrop-blur">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Users className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground">Participantes</p>
                                <p className="font-semibold text-sm">
                                    {tournaments.reduce((sum, t) => sum + t.participants, 0)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="tournaments" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="tournaments">Torneos</TabsTrigger>
                        <TabsTrigger value="info">Información</TabsTrigger>
                        {event.sponsors.length > 0 && (
                            <TabsTrigger value="sponsors">Patrocinadores</TabsTrigger>
                        )}
                        {isOwner && <TabsTrigger value="stats">Estadísticas</TabsTrigger>}
                        {isOwner && <TabsTrigger value="manage">Gestionar</TabsTrigger>}
                    </TabsList>

                    {/* Tournaments Tab */}
                    <TabsContent value="tournaments">
                        {tournaments.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold mb-2">No hay torneos aún</h3>
                                <p className="text-muted-foreground mb-6">
                                    {isOwner 
                                        ? "Crea torneos y asígnalos a este evento."
                                        : "Los torneos se agregarán próximamente."
                                    }
                                </p>
                                {isOwner && (
                                    <Button asChild>
                                        <Link href="/tournaments/create">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Crear Torneo
                                        </Link>
                                    </Button>
                                )}
                            </Card>
                        ) : (
                            <div className="space-y-8">
                                {/* By Game */}
                                {Object.entries(tournamentsByGame).map(([game, gameTournaments]) => (
                                    <section key={game}>
                                        <h3 className="text-xl font-semibold mb-4 flex items-center">
                                            <Gamepad2 className="mr-2 h-5 w-5" />
                                            {game}
                                            <Badge variant="secondary" className="ml-2">
                                                {gameTournaments.length}
                                            </Badge>
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {gameTournaments.map(tournament => (
                                                <TournamentCard 
                                                    key={tournament.id} 
                                                    tournament={tournament}
                                                    eventColors={eventColors}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Info Tab */}
                    <TabsContent value="info">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Acerca del Evento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {event.description ? (
                                        <p className="whitespace-pre-wrap">{event.description}</p>
                                    ) : (
                                        <p className="text-muted-foreground">No hay descripción disponible.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Detalles</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fecha de inicio</p>
                                        <p className="font-medium">{formatDate(event.start_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fecha de fin</p>
                                        <p className="font-medium">{formatDate(event.end_date)}</p>
                                    </div>
                                    {event.location && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Ubicación</p>
                                            <p className="font-medium">{event.location}</p>
                                        </div>
                                    )}
                                    {event.organizer_name && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Organizador</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {event.organizer_logo && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={event.organizer_logo} />
                                                        <AvatarFallback>{event.organizer_name[0]}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <p className="font-medium">{event.organizer_name}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Sponsors Tab */}
                    {event.sponsors.length > 0 && (
                        <TabsContent value="sponsors">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Patrocinadores</CardTitle>
                                    <CardDescription>
                                        Gracias a nuestros patrocinadores por hacer posible este evento
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                        {event.sponsors.map((sponsor, index) => (
                                            <SponsorCard key={index} sponsor={sponsor} />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}

                    {/* Stats Tab (Owner Only) */}
                    {isOwner && (
                        <TabsContent value="stats">
                            <EventStats event={event} tournaments={tournaments} />
                        </TabsContent>
                    )}

                    {/* Manage Tab (Owner Only) */}
                    {isOwner && (
                        <TabsContent value="manage">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Crear Nuevo Torneo</CardTitle>
                                            <CardDescription>
                                                Crea un nuevo torneo y asígnalo automáticamente a este evento
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button asChild className="w-full">
                                                <Link href={`/tournaments/create?eventId=${event.id}`}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Crear Torneo
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Configuración del Evento</CardTitle>
                                            <CardDescription>
                                                Modifica la información del evento
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <Button asChild variant="outline" className="w-full">
                                                <Link href={`/events/${slug}/edit`}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar Evento
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Link Existing Tournaments */}
                                <LinkExistingTournaments
                                    eventId={event.id}
                                    ownerEmail={event.owner_email}
                                    linkedTournamentIds={tournaments.map(t => t.id)}
                                    onTournamentsLinked={() => loadTournaments(event.id)}
                                />

                                {/* Linked Tournaments Management */}
                                {tournaments.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Torneos del Evento</CardTitle>
                                            <CardDescription>
                                                Gestiona los torneos vinculados a este evento
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {tournaments.map(tournament => (
                                                    <div
                                                        key={tournament.id}
                                                        className="flex items-center justify-between p-3 rounded-lg border"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                                                            <div>
                                                                <p className="font-medium">{tournament.name}</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {tournament.game} • {tournament.participants}/{tournament.max_participants} participantes
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={tournament.status === 'En curso' ? 'default' : 'secondary'}>
                                                                {tournament.status}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={async () => {
                                                                    await db.assignTournamentToEvent(tournament.id, null);
                                                                    loadTournaments(event.id);
                                                                }}
                                                            >
                                                                Desvincular
                                                            </Button>
                                                            <Button variant="outline" size="sm" asChild>
                                                                <Link href={`/tournaments/${tournament.id}`}>
                                                                    Ver
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Organizer Manager - Only for main owner */}
                                                {isMainOwner && (
                                                    <OrganizerManager
                                                        ownerEmail={event.owner_email}
                                                        organizers={event.organizers || []}
                                                        onOrganizersChange={async (updatedOrganizers) => {
                                                            await db.updateEvent(event.id, { organizers: updatedOrganizers });
                                                            setEvent({ ...event, organizers: updatedOrganizers });
                                                            toast({
                                                                title: "Organizadores actualizados",
                                                                description: "Los cambios han sido guardados."
                                                            });
                                                        }}
                                                        entityType="evento"
                                                    />
                                                )}
                                            </div>
                                        </TabsContent>
                                    )}
                                </Tabs>
                            </div>
                        </div>
                    );
                }