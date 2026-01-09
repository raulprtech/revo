"use client";

import { useEffect, useState, useMemo } from "react";
import { Check, Shuffle, Play, X, Flag, RotateCcw, UserCheck, UserX, MapPin, Search, Filter, Settings, Download } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "@/hooks/use-toast";
import { db, type Participant as DbParticipant } from "@/lib/database";
import { useParticipants, useTournament, invalidateCache } from "@/hooks/use-tournaments";

type Participant = DbParticipant;
type FilterStatus = 'all' | 'pending-checkin' | 'checked-in' | 'pending' | 'accepted' | 'rejected';
type TournamentStatus = 'Próximo' | 'En curso' | 'Finalizado';

// Helper function to calculate age from birth date
const calculateAge = (birthDate?: string): number | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

// Helper function to format gender for display
const formatGender = (gender?: string): string => {
    if (!gender) return '-';
    const genderMap: Record<string, string> = {
        'male': 'Masculino',
        'female': 'Femenino',
        'non-binary': 'No binario',
        'prefer-not-to-say': 'Prefiere no decir',
        'other': 'Otro'
    };
    return genderMap[gender] || gender;
};

interface ParticipantManagerProps {
    tournamentId: string;
    onTournamentStart: (newStatus: string) => void;
}

export default function ParticipantManager({ tournamentId, onTournamentStart }: ParticipantManagerProps) {
    const { participants, isLoading: loadingParticipants, refresh: refreshParticipants } = useParticipants(tournamentId);
    const { tournament, isLoading: loadingTournament, refresh: refreshTournament } = useTournament(tournamentId);
    const { toast } = useToast();
    
    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

    const loading = loadingParticipants || loadingTournament;
    
    // Determine if tournament is in-person (has location)
    const isInPersonTournament = Boolean(tournament?.location);

    // Filter and search participants
    const filteredParticipants = useMemo(() => {
        let result = [...participants];
        
        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.email.toLowerCase().includes(query) ||
                (p.full_name && p.full_name.toLowerCase().includes(query))
            );
        }
        
        // Apply status filter
        switch (filterStatus) {
            case 'pending-checkin':
                result = result.filter(p => p.status === 'Aceptado' && !p.checked_in_at);
                break;
            case 'checked-in':
                result = result.filter(p => p.status === 'Aceptado' && p.checked_in_at);
                break;
            case 'pending':
                result = result.filter(p => p.status === 'Pendiente');
                break;
            case 'accepted':
                result = result.filter(p => p.status === 'Aceptado');
                break;
            case 'rejected':
                result = result.filter(p => p.status === 'Rechazado');
                break;
        }
        
        return result;
    }, [participants, searchQuery, filterStatus]);

    // Listen for updates from other components
    useEffect(() => {
        const handleParticipantsUpdated = () => {
            refreshParticipants();
            refreshTournament();
        };

        window.addEventListener('participantsUpdated', handleParticipantsUpdated);
        return () => window.removeEventListener('participantsUpdated', handleParticipantsUpdated);
    }, [refreshParticipants, refreshTournament]);

    const handleParticipantStatusChange = async (participantId: string | undefined, newStatus: 'Aceptado' | 'Rechazado') => {
        if (!participantId) {
            toast({
                title: "Operación no disponible",
                description: "No se pudo identificar al participante.",
                variant: "destructive"
            });
            return;
        }

        try {
            const updated = await db.updateParticipant(participantId, { status: newStatus });
            
            // Invalidate cache to refresh data
            invalidateCache.participants(tournamentId);
            
            toast({
                title: "Participante actualizado",
                description: `El estado de ${updated.name} ha sido cambiado a ${newStatus}.`
            });
            window.dispatchEvent(new CustomEvent('participantsUpdated'));
        } catch (error) {
            console.error('Error updating participant:', error);
            toast({
                title: "Error",
                description: "No se pudo actualizar el estado del participante.",
                variant: "destructive"
            });
        }
    };

    const handleCheckIn = async (participantId: string | undefined, participantName: string) => {
        if (!participantId) {
            toast({
                title: "Operación no disponible",
                description: "No se pudo identificar al participante.",
                variant: "destructive"
            });
            return;
        }

        try {
            await db.checkInParticipant(participantId);
            
            // Invalidate cache to refresh data
            invalidateCache.participants(tournamentId);
            
            toast({
                title: "Check-in completado",
                description: `${participantName} ha hecho check-in exitosamente.`
            });
            window.dispatchEvent(new CustomEvent('participantsUpdated'));
        } catch (error) {
            console.error('Error checking in participant:', error);
            toast({
                title: "Error",
                description: "No se pudo completar el check-in.",
                variant: "destructive"
            });
        }
    };

    const handleUndoCheckIn = async (participantId: string | undefined, participantName: string) => {
        if (!participantId) {
            toast({
                title: "Operación no disponible",
                description: "No se pudo identificar al participante.",
                variant: "destructive"
            });
            return;
        }

        try {
            await db.undoCheckIn(participantId);
            
            // Invalidate cache to refresh data
            invalidateCache.participants(tournamentId);
            
            toast({
                title: "Check-in revertido",
                description: `Se ha revertido el check-in de ${participantName}.`
            });
            window.dispatchEvent(new CustomEvent('participantsUpdated'));
        } catch (error) {
            console.error('Error undoing check-in:', error);
            toast({
                title: "Error",
                description: "No se pudo revertir el check-in.",
                variant: "destructive"
            });
        }
    };

    // Helper to get next power of 2
    const getNextPowerOf2 = (n: number): number => {
        let power = 1;
        while (power < n) power *= 2;
        return power;
    };

    const handleSeed = () => {
        const acceptedParticipants = participants.filter(p => p.status === 'Aceptado');
        if (acceptedParticipants.length < 2) {
            toast({
                title: "No hay suficientes participantes",
                description: "Se necesitan al menos 2 participantes aceptados para asignar seeds.",
                variant: "destructive"
            });
            return;
        }

        // Shuffle accepted participants
        const shuffled = [...acceptedParticipants].sort(() => Math.random() - 0.5);
        
        // Calculate bracket size and BYEs needed
        const bracketSize = getNextPowerOf2(shuffled.length);
        const byesNeeded = bracketSize - shuffled.length;
        
        const seededParticipantsData = JSON.parse(localStorage.getItem("seededParticipantsData") || "{}");
        // Store both name and avatar for bracket display
        seededParticipantsData[tournamentId] = shuffled.map(p => ({
            name: p.name,
            avatar: p.avatar || null
        }));
        localStorage.setItem("seededParticipantsData", JSON.stringify(seededParticipantsData));

        let description = "Los participantes han sido mezclados aleatoriamente en el bracket.";
        if (byesNeeded > 0) {
            description += ` Se añadirán ${byesNeeded} BYE${byesNeeded > 1 ? 's' : ''} para completar el bracket de ${bracketSize}.`;
        }

        toast({
            title: "Seeds Asignados",
            description
        });

        window.dispatchEvent(new CustomEvent('seedsAssigned'));
    };

    const handleStartTournament = async () => {
        if (!tournament) return;

        try {
            const acceptedParticipants = participants.filter(p => p.status === 'Aceptado');
            if (acceptedParticipants.length < 2) {
                toast({
                    title: "No hay suficientes participantes",
                    description: "Se necesitan al menos 2 participantes aceptados para iniciar el torneo.",
                    variant: "destructive"
                });
                return;
            }

            // Auto-asignar seeds si no se han asignado
            const seededParticipantsData = JSON.parse(localStorage.getItem("seededParticipantsData") || "{}");
            if (!seededParticipantsData[tournamentId] || seededParticipantsData[tournamentId].length === 0) {
                const shuffled = [...acceptedParticipants].sort(() => Math.random() - 0.5);
                seededParticipantsData[tournamentId] = shuffled.map(p => ({
                    name: p.name,
                    avatar: p.avatar || null
                }));
                localStorage.setItem("seededParticipantsData", JSON.stringify(seededParticipantsData));
                window.dispatchEvent(new CustomEvent('seedsAssigned'));
            }

            await db.updateTournament(tournamentId, { status: 'En curso' });
            
            // Invalidate cache
            invalidateCache.tournament(tournamentId);
            invalidateCache.publicTournaments();
            
            onTournamentStart('En curso');
            toast({
                title: "¡Torneo Iniciado!",
                description: "La competición ha comenzado. ¡Buena suerte a todos los participantes!",
            });
            window.dispatchEvent(new CustomEvent('participantsUpdated'));
        } catch (error) {
            console.error('Error starting tournament:', error);
            toast({
                title: "Error",
                description: "No se pudo cambiar el estado del torneo.",
                variant: "destructive"
            });
        }
    };

    const handleFinishTournament = async () => {
        if (!tournament) return;

        try {
            await db.updateTournament(tournamentId, { status: 'Finalizado' });
            
            // Invalidate cache
            invalidateCache.tournament(tournamentId);
            invalidateCache.publicTournaments();
            
            onTournamentStart('Finalizado');
            toast({
                title: "¡Torneo Finalizado!",
                description: "El torneo ha sido marcado como finalizado. ¡Felicidades a todos los participantes!",
            });
            window.dispatchEvent(new CustomEvent('participantsUpdated'));
        } catch (error) {
            console.error('Error finishing tournament:', error);
            toast({
                title: "Error",
                description: "No se pudo finalizar el torneo.",
                variant: "destructive"
            });
        }
    };

    const handleRepeatTournament = async () => {
        if (!tournament) return;

        try {
            // Resetear el estado del torneo
            await db.updateTournament(tournamentId, { status: 'Próximo' });
            
            // Limpiar seeds del localStorage
            const seededParticipantsData = JSON.parse(localStorage.getItem("seededParticipantsData") || "{}");
            delete seededParticipantsData[tournamentId];
            localStorage.setItem("seededParticipantsData", JSON.stringify(seededParticipantsData));

            // Invalidate cache
            invalidateCache.tournament(tournamentId);
            invalidateCache.publicTournaments();
            
            onTournamentStart('Próximo');

            toast({
                title: "Torneo Reiniciado",
                description: "El torneo ha sido reiniciado. Los participantes aceptados se mantienen.",
            });

            window.dispatchEvent(new CustomEvent('participantsUpdated'));
            window.dispatchEvent(new CustomEvent('seedsAssigned'));
        } catch (error) {
            console.error('Error repeating tournament:', error);
            toast({
                title: "Error",
                description: "No se pudo reiniciar el torneo.",
                variant: "destructive"
            });
        }
    };

    const handleStatusChange = async (newStatus: TournamentStatus) => {
        if (!tournament) return;
        
        try {
            // If changing to "En curso", require minimum participants
            if (newStatus === 'En curso') {
                const acceptedParticipants = participants.filter(p => p.status === 'Aceptado');
                if (acceptedParticipants.length < 2) {
                    toast({
                        title: "No hay suficientes participantes",
                        description: "Se necesitan al menos 2 participantes aceptados para iniciar el torneo.",
                        variant: "destructive"
                    });
                    return;
                }

                // Auto-assign seeds if starting
                const seededParticipantsData = JSON.parse(localStorage.getItem("seededParticipantsData") || "{}");
                if (!seededParticipantsData[tournamentId] || seededParticipantsData[tournamentId].length === 0) {
                    const shuffled = [...acceptedParticipants].sort(() => Math.random() - 0.5);
                    seededParticipantsData[tournamentId] = shuffled.map(p => ({
                        name: p.name,
                        avatar: p.avatar || null
                    }));
                    localStorage.setItem("seededParticipantsData", JSON.stringify(seededParticipantsData));
                    window.dispatchEvent(new CustomEvent('seedsAssigned'));
                }
            }

            // If changing from Finalizado to Próximo, clear seeds
            if (tournament.status === 'Finalizado' && newStatus === 'Próximo') {
                const seededParticipantsData = JSON.parse(localStorage.getItem("seededParticipantsData") || "{}");
                delete seededParticipantsData[tournamentId];
                localStorage.setItem("seededParticipantsData", JSON.stringify(seededParticipantsData));
                window.dispatchEvent(new CustomEvent('seedsAssigned'));
            }

            await db.updateTournament(tournamentId, { status: newStatus });
            
            // Invalidate cache
            invalidateCache.tournament(tournamentId);
            invalidateCache.publicTournaments();
            
            onTournamentStart(newStatus);

            const statusMessages: Record<TournamentStatus, { title: string; description: string }> = {
                'Próximo': {
                    title: "Estado: Próximo",
                    description: "El torneo está programado y aceptando inscripciones."
                },
                'En curso': {
                    title: "¡Torneo en curso!",
                    description: "La competición ha comenzado. ¡Buena suerte a todos!"
                },
                'Finalizado': {
                    title: "Torneo Finalizado",
                    description: "El torneo ha sido marcado como completado."
                }
            };

            toast(statusMessages[newStatus]);
            window.dispatchEvent(new CustomEvent('participantsUpdated'));
        } catch (error) {
            console.error('Error changing tournament status:', error);
            toast({
                title: "Error",
                description: "No se pudo cambiar el estado del torneo.",
                variant: "destructive"
            });
        }
    };

    // Helper to get participant status display
    const getParticipantStatusBadge = (participant: Participant) => {
        if (isInPersonTournament && participant.status === 'Aceptado') {
            if (participant.checked_in_at) {
                return <Badge variant="default" className="bg-green-600"><UserCheck className="mr-1 h-3 w-3" /> Check-in</Badge>;
            }
            return <Badge variant="secondary">Aceptado (Sin check-in)</Badge>;
        }
        
        return (
            <Badge variant={participant.status === "Aceptado" ? "default" : participant.status === "Pendiente" ? "secondary" : "destructive"}>
                {participant.status}
            </Badge>
        );
    };

    // Export participants to Excel/CSV
    const handleExportToExcel = () => {
        if (participants.length === 0) {
            toast({
                title: "Sin datos",
                description: "No hay participantes para exportar.",
                variant: "destructive"
            });
            return;
        }

        // Prepare CSV data
        const headers = [
            'Nickname',
            'Nombre Completo',
            'Email',
            'Edad',
            'Género',
            'Estado',
            'Check-in',
            'Fecha de Inscripción'
        ];

        const rows = participants.map(p => [
            p.name,
            p.full_name || 'No disponible',
            p.email,
            calculateAge(p.birth_date)?.toString() || 'No disponible',
            p.gender ? formatGender(p.gender) : 'No disponible',
            p.status,
            p.checked_in_at ? new Date(p.checked_in_at).toLocaleString('es-ES') : 'No',
            p.created_at ? new Date(p.created_at).toLocaleString('es-ES') : ''
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Add BOM for Excel UTF-8 compatibility
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `participantes_${tournament?.name?.replace(/[^a-zA-Z0-9]/g, '_') || tournamentId}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
            title: "Exportación completada",
            description: `Se han exportado ${participants.length} participantes.`
        });
    };

    // Count stats for in-person tournaments
    const acceptedCount = participants.filter(p => p.status === 'Aceptado').length;
    const pendingCount = participants.filter(p => p.status === 'Pendiente').length;
    const checkedInCount = participants.filter(p => p.status === 'Aceptado' && p.checked_in_at).length;
    
    // Bracket calculations
    const bracketSize = getNextPowerOf2(acceptedCount || 2);
    const byesNeeded = acceptedCount > 0 ? bracketSize - acceptedCount : 0;
    const maxParticipants = tournament?.max_participants || 16;
    const spotsLeft = maxParticipants - acceptedCount;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Gestionar Participantes
                            {isInPersonTournament && (
                                <Badge variant="outline" className="ml-2">
                                    <MapPin className="mr-1 h-3 w-3" /> Presencial
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {isInPersonTournament 
                                ? "Acepta solicitantes y gestiona el check-in de los participantes."
                                : "Acepta o rechaza solicitantes, asigna seeds e inicia el torneo."
                            }
                        </CardDescription>
                        
                        {/* Stats section */}
                        <div className="mt-3 space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Aceptados: <span className="font-medium text-foreground">{acceptedCount}</span> / {maxParticipants}
                                {pendingCount > 0 && (
                                    <span className="ml-2">
                                        • Pendientes: <span className="font-medium text-yellow-600">{pendingCount}</span>
                                    </span>
                                )}
                            </p>
                            {acceptedCount > 0 && acceptedCount < maxParticipants && (
                                <p className="text-sm text-muted-foreground">
                                    Bracket: {bracketSize} jugadores
                                    {byesNeeded > 0 && (
                                        <span className="ml-1 text-blue-600">
                                            ({byesNeeded} BYE{byesNeeded > 1 ? 's' : ''} automático{byesNeeded > 1 ? 's' : ''})
                                        </span>
                                    )}
                                </p>
                            )}
                            {isInPersonTournament && acceptedCount > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Check-in: <span className="font-medium text-foreground">{checkedInCount}</span> / {acceptedCount}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 items-end">
                        {/* Tournament Status Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Estado:</span>
                            <Select 
                                value={tournament?.status || 'Próximo'} 
                                onValueChange={(value) => handleStatusChange(value as TournamentStatus)}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <Settings className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Próximo">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                                            Próximo
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="En curso">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-green-500" />
                                            En curso
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="Finalizado">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-gray-500" />
                                            Finalizado
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Quick Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                            {tournament?.status === 'Próximo' && (
                                <>
                                    <Button variant="outline" size="sm" onClick={handleSeed}>
                                        <Shuffle className="mr-2 h-4 w-4" /> Asignar Seeds
                                    </Button>
                                    <Button size="sm" onClick={handleStartTournament}>
                                        <Play className="mr-2 h-4 w-4" /> Iniciar
                                    </Button>
                                </>
                            )}
                            {tournament?.status === 'En curso' && (
                                <Button variant="destructive" size="sm" onClick={handleFinishTournament}>
                                    <Flag className="mr-2 h-4 w-4" /> Finalizar
                                </Button>
                            )}
                            {tournament?.status === 'Finalizado' && (
                                <Button variant="outline" size="sm" onClick={handleRepeatTournament}>
                                    <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
                                </Button>
                            )}
                            {/* Export Button */}
                            <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                                <Download className="mr-2 h-4 w-4" /> Exportar
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Search and filter bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filtrar por estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {isInPersonTournament ? (
                                <>
                                    <SelectItem value="pending-checkin">Pendiente check-in</SelectItem>
                                    <SelectItem value="checked-in">Con check-in</SelectItem>
                                </>
                            ) : (
                                <>
                                    <SelectItem value="pending">Pendientes</SelectItem>
                                    <SelectItem value="accepted">Aceptados</SelectItem>
                                    <SelectItem value="rejected">Rechazados</SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Results count */}
                {(searchQuery || filterStatus !== 'all') && (
                    <p className="text-sm text-muted-foreground mb-3">
                        Mostrando {filteredParticipants.length} de {participants.length} participantes
                        {searchQuery && <span className="ml-1">para &quot;{searchQuery}&quot;</span>}
                    </p>
                )}

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nickname / Email</TableHead>
                            <TableHead>Nombre Completo</TableHead>
                            <TableHead>Edad</TableHead>
                            <TableHead>Género</TableHead>
                            <TableHead>Estado</TableHead>
                            {isInPersonTournament && <TableHead>Check-in</TableHead>}
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={isInPersonTournament ? 7 : 6} className="text-center h-24">Cargando participantes...</TableCell>
                            </TableRow>
                        ) : filteredParticipants.length > 0 ? (
                            filteredParticipants.map((p) => (
                                <TableRow key={p.id ?? p.email} className={searchQuery && p.name.toLowerCase().includes(searchQuery.toLowerCase()) ? "bg-accent/50" : ""}>
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            <Avatar>
                                                <AvatarImage src={p.avatar} />
                                                <AvatarFallback>{p.name.substring(0,2)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <span className="font-medium block">{p.name}</span>
                                                <span className="text-xs text-muted-foreground">{p.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {p.full_name ? (
                                            <span className="font-medium text-sm">{p.full_name}</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">No disponible</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {calculateAge(p.birth_date) !== null ? (
                                            <span className="text-sm">{calculateAge(p.birth_date)} años</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {p.gender ? (
                                            <span className="text-sm">{formatGender(p.gender)}</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {getParticipantStatusBadge(p)}
                                    </TableCell>
                                    {isInPersonTournament && (
                                        <TableCell>
                                            {p.status === 'Aceptado' && (
                                                p.checked_in_at ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(p.checked_in_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end space-x-1">
                                            {/* Acciones para participantes pendientes */}
                                            {p.status === "Pendiente" && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-600"
                                                        onClick={() => handleParticipantStatusChange(p.id, "Aceptado")}
                                                        title="Aceptar participante"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600"
                                                        onClick={() => handleParticipantStatusChange(p.id, "Rechazado")}
                                                        title="Rechazar participante"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            
                                            {/* Acciones para participantes aceptados */}
                                            {p.status === "Aceptado" && (
                                                <>
                                                    {/* Check-in para torneos presenciales */}
                                                    {isInPersonTournament && (
                                                        !p.checked_in_at ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-600"
                                                                onClick={() => handleCheckIn(p.id, p.name)}
                                                                title="Hacer check-in"
                                                            >
                                                                <UserCheck className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/50 hover:text-orange-600"
                                                                onClick={() => handleUndoCheckIn(p.id, p.name)}
                                                                title="Revertir check-in"
                                                            >
                                                                <UserX className="h-4 w-4" />
                                                            </Button>
                                                        )
                                                    )}
                                                    {/* Rechazar participante aceptado */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600"
                                                        onClick={() => handleParticipantStatusChange(p.id, "Rechazado")}
                                                        title="Rechazar participante"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            
                                            {/* Acciones para participantes rechazados */}
                                            {p.status === "Rechazado" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-600"
                                                    onClick={() => handleParticipantStatusChange(p.id, "Aceptado")}
                                                    title="Aceptar participante"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={isInPersonTournament ? 5 : 4} className="text-center h-24">
                                    {participants.length === 0 
                                        ? "No hay participantes aún."
                                        : "No se encontraron participantes con los filtros aplicados."
                                    }
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
