"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Users, Plus, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { db, type Event } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";
import { Pagination, paginateArray } from "@/components/ui/pagination";

const EVENTS_PER_PAGE = 9;

const getStatusVariant = (status: Event['status']) => {
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

const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    
    if (start.toDateString() === end.toDateString()) {
        return start.toLocaleDateString('es-ES', options);
    }
    
    return `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', options)}`;
};

function EventCard({ event }: { event: Event }) {
    return (
        <Card className="overflow-hidden transition-all hover:shadow-lg group">
            <div className="relative h-48 w-full overflow-hidden">
                {event.banner_image ? (
                    <Image
                        src={event.banner_image}
                        alt={event.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                    />
                ) : (
                    <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ 
                            background: `linear-gradient(135deg, ${event.primary_color}, ${event.secondary_color})` 
                        }}
                    >
                        {event.logo_image ? (
                            <Image
                                src={event.logo_image}
                                alt={event.name}
                                width={120}
                                height={120}
                                className="object-contain"
                            />
                        ) : (
                            <Trophy className="h-16 w-16 text-white/80" />
                        )}
                    </div>
                )}
                <div className="absolute top-3 right-3">
                    <Badge variant={getStatusVariant(event.status)}>{event.status}</Badge>
                </div>
                {event.organizer_name && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <p className="text-white/80 text-sm">Organizado por</p>
                        <p className="text-white font-semibold">{event.organizer_name}</p>
                    </div>
                )}
            </div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xl line-clamp-1">{event.name}</CardTitle>
                {event.description && (
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    {formatDateRange(event.start_date, event.end_date)}
                </div>
                {event.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {event.location}
                    </div>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                    <Trophy className="mr-2 h-4 w-4" />
                    {event.tournaments_count || 0} torneos
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full" variant="outline">
                    <Link href={`/events/${event.slug}`}>Ver Evento</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [ongoingPage, setOngoingPage] = useState(1);
    const [upcomingPage, setUpcomingPage] = useState(1);
    const [pastPage, setPastPage] = useState(1);
    const router = useRouter();

    useEffect(() => {
        const loadData = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                setIsAuthenticated(!!user);

                const publicEvents = await db.getPublicEvents();
                setEvents(publicEvents);
            } catch (error) {
                console.error('Error loading events:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const filteredEvents = events.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const upcomingEvents = filteredEvents.filter(e => e.status === 'Próximo');
    const ongoingEvents = filteredEvents.filter(e => e.status === 'En curso');
    const pastEvents = filteredEvents.filter(e => e.status === 'Finalizado');

    const paginatedOngoing = paginateArray(ongoingEvents, ongoingPage, EVENTS_PER_PAGE);
    const paginatedUpcoming = paginateArray(upcomingEvents, upcomingPage, EVENTS_PER_PAGE);
    const paginatedPast = paginateArray(pastEvents, pastPage, EVENTS_PER_PAGE);

    // Reset pages when search changes
    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setOngoingPage(1);
        setUpcomingPage(1);
        setPastPage(1);
    };

    if (loading) {
        return (
            <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold font-headline">Eventos</h1>
                    <p className="text-muted-foreground mt-2">
                        Descubre grandes eventos que agrupan múltiples torneos
                    </p>
                </div>
                {isAuthenticated && (
                    <Button asChild>
                        <Link href="/events/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Crear Evento
                        </Link>
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="mb-8">
                <Input
                    placeholder="Buscar eventos..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="max-w-md"
                />
            </div>

            {/* Events Grid */}
            {filteredEvents.length === 0 ? (
                <Card className="p-12 text-center">
                    <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No hay eventos disponibles</h3>
                    <p className="text-muted-foreground mb-6">
                        {searchTerm ? 'No se encontraron eventos con esos criterios.' : 'Sé el primero en crear un gran evento.'}
                    </p>
                    {isAuthenticated && !searchTerm && (
                        <Button asChild>
                            <Link href="/events/create">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear Evento
                            </Link>
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="space-y-10">
                    {/* En Curso */}
                    {ongoingEvents.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 flex items-center">
                                <span className="w-3 h-3 rounded-full bg-green-500 mr-3 animate-pulse" />
                                En Curso
                                <span className="text-sm font-normal text-muted-foreground ml-2">({ongoingEvents.length})</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedOngoing.data.map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                            <Pagination
                                currentPage={ongoingPage}
                                totalPages={paginatedOngoing.totalPages}
                                onPageChange={setOngoingPage}
                                className="mt-6"
                            />
                        </section>
                    )}

                    {/* Próximos */}
                    {upcomingEvents.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-semibold mb-4">
                                Próximos Eventos
                                <span className="text-sm font-normal text-muted-foreground ml-2">({upcomingEvents.length})</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedUpcoming.data.map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                            <Pagination
                                currentPage={upcomingPage}
                                totalPages={paginatedUpcoming.totalPages}
                                onPageChange={setUpcomingPage}
                                className="mt-6"
                            />
                        </section>
                    )}

                    {/* Finalizados */}
                    {pastEvents.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-muted-foreground">
                                Eventos Pasados
                                <span className="text-sm font-normal ml-2">({pastEvents.length})</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
                                {paginatedPast.data.map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                            <Pagination
                                currentPage={pastPage}
                                totalPages={paginatedPast.totalPages}
                                onPageChange={setPastPage}
                                className="mt-6"
                            />
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
