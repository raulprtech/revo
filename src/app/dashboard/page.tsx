"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Users, Search, Loader2, Plus, Trophy, CalendarDays } from "lucide-react";
import Link from 'next/link';
import { useState } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { useUserTournaments } from "@/hooks/use-tournaments";
import { Pagination, paginateArray } from "@/components/ui/pagination";

const DASHBOARD_PER_PAGE = 10;

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { ownedTournaments, participatingTournaments, isLoading: tournamentsLoading } = useUserTournaments();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
    const [ownedPage, setOwnedPage] = useState(1);
    const [participatingPage, setParticipatingPage] = useState(1);
    // Note: Route protection is handled by middleware.
    // The useAuth() hook is used here only for user data display.

    const loading = authLoading || tournamentsLoading;

    // Filter tournaments by status and search term
    const filterTournaments = (tournaments: typeof ownedTournaments) => {
        return tournaments.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            
            switch (activeTab) {
                case 'pending':
                    return t.status === 'Próximo';
                case 'active':
                    return t.status === 'En Curso';
                case 'completed':
                    return t.status === 'Completado';
                default:
                    return true;
            }
        });
    };

    const filteredOwned = filterTournaments(ownedTournaments);
    const filteredParticipating = filterTournaments(participatingTournaments);
    const allFiltered = [...filteredOwned, ...filteredParticipating];

    const paginatedOwned = paginateArray(filteredOwned, ownedPage, DASHBOARD_PER_PAGE);
    const paginatedParticipating = paginateArray(filteredParticipating, participatingPage, DASHBOARD_PER_PAGE);

    // Reset pages when filters/search change
    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setOwnedPage(1);
        setParticipatingPage(1);
    };

    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
        setOwnedPage(1);
        setParticipatingPage(1);
    };

    // Count by status for tabs
    const allTournaments = [...ownedTournaments, ...participatingTournaments];
    const pendingCount = allTournaments.filter(t => t.status === 'Próximo').length;
    const activeCount = allTournaments.filter(t => t.status === 'En Curso').length;
    const completedCount = allTournaments.filter(t => t.status === 'Completado').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="bg-background text-foreground min-h-screen p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <h1 className="text-4xl font-bold">Panel de Organizador</h1>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="lg">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear Nuevo
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem asChild>
                                <Link href="/tournaments/create" className="flex items-center cursor-pointer">
                                    <Trophy className="mr-2 h-4 w-4" />
                                    <div>
                                        <div className="font-medium">Torneo</div>
                                        <div className="text-xs text-muted-foreground">Competencia individual</div>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/events/create" className="flex items-center cursor-pointer">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    <div>
                                        <div className="font-medium">Evento</div>
                                        <div className="text-xs text-muted-foreground">Agrupa múltiples torneos</div>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                <div className="flex border-b border-border mb-6 overflow-x-auto">
                    <button 
                        onClick={() => handleTabChange('all')}
                        className={`py-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'all' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        TODOS {allTournaments.length}
                    </button>
                    <button 
                        onClick={() => handleTabChange('pending')}
                        className={`py-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'pending' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        PENDIENTE {pendingCount}
                    </button>
                    <button 
                        onClick={() => handleTabChange('active')}
                        className={`py-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'active' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        EN CURSO {activeCount}
                    </button>
                    <button 
                        onClick={() => handleTabChange('completed')}
                        className={`py-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'completed' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        COMPLETO {completedCount}
                    </button>
                </div>

                <div className="relative mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar tus torneos" 
                        className="pl-10 bg-card border-border h-12" 
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>

                {/* Owned Tournaments Section */}
                {filteredOwned.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                            Torneos que organizas
                            <span className="text-sm font-normal ml-2">({filteredOwned.length})</span>
                        </h2>
                        <div className="space-y-4">
                            {paginatedOwned.data.map((tournament) => (
                                <TournamentCard key={tournament.id} tournament={tournament} isOwner />
                            ))}
                        </div>
                        <Pagination
                            currentPage={ownedPage}
                            totalPages={paginatedOwned.totalPages}
                            onPageChange={setOwnedPage}
                            className="mt-4"
                        />
                    </div>
                )}

                {/* Participating Tournaments Section */}
                {filteredParticipating.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                            Torneos en los que participas
                            <span className="text-sm font-normal ml-2">({filteredParticipating.length})</span>
                        </h2>
                        <div className="space-y-4">
                            {paginatedParticipating.data.map((tournament) => (
                                <TournamentCard key={tournament.id} tournament={tournament} />
                            ))}
                        </div>
                        <Pagination
                            currentPage={participatingPage}
                            totalPages={paginatedParticipating.totalPages}
                            onPageChange={setParticipatingPage}
                            className="mt-4"
                        />
                    </div>
                )}

                {/* Empty State */}
                {allFiltered.length === 0 && (
                    <div className="text-center py-16 bg-card rounded-lg">
                        <h3 className="text-xl font-semibold">No se encontraron torneos</h3>
                        <p className="text-muted-foreground mt-2">
                            {searchTerm 
                                ? `No hay torneos que coincidan con "${searchTerm}".`
                                : activeTab !== 'all'
                                    ? `No tienes torneos ${activeTab === 'pending' ? 'pendientes' : activeTab === 'active' ? 'en curso' : 'completados'}.`
                                    : "No has creado ni te has unido a ningún torneo todavía."
                            }
                        </p>
                        {!searchTerm && activeTab === 'all' && (
                            <div className="flex gap-4 justify-center mt-4">
                                <Button asChild>
                                    <Link href="/tournaments/create">Crear tu primer torneo</Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href="/tournaments">Explorar torneos</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Tournament Card Component
function TournamentCard({ tournament, isOwner = false }: { 
    tournament: { 
        id: string; 
        name: string; 
        description?: string; 
        participants: number; 
        max_participants: number; 
        start_date: string;
        image?: string;
        status: string;
    }; 
    isOwner?: boolean;
}) {
    return (
        <Link href={`/tournaments/${tournament.id}`} className="block">
            <div className="bg-card p-4 rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={tournament.image} />
                        <AvatarFallback>{tournament.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-semibold">{tournament.name}</p>
                            {isOwner && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Organizador</span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{tournament.description}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{tournament.participants} / {tournament.max_participants}</span>
                    </div>
                    <div className="text-sm text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                            tournament.status === 'En Curso' ? 'bg-green-500/20 text-green-400' :
                            tournament.status === 'Completado' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-muted text-muted-foreground'
                        }`}>
                            {tournament.status}
                        </span>
                        <p className="text-muted-foreground mt-1">
                            {new Date(tournament.start_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    );
}
