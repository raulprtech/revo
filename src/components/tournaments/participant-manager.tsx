"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Shuffle, Play, X } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { db, type Participant as DbParticipant, type Tournament as DbTournament } from "@/lib/database";

type Participant = DbParticipant;

type StoredTournament = Partial<DbTournament> & {
    id?: string;
    maxParticipants?: number;
    startDate?: string;
    startTime?: string;
    ownerEmail?: string;
    prizePool?: string;
    registrationType?: 'public' | 'private';
    invitedUsers?: string[];
    dataAiHint?: string;
    createdAt?: string;
    updatedAt?: string;
};

interface ParticipantManagerProps {
    tournamentId: string;
    onTournamentStart: (newStatus: string) => void;
}

export default function ParticipantManager({ tournamentId, onTournamentStart }: ParticipantManagerProps) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [tournament, setTournament] = useState<DbTournament | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        try {
            const [participantsData, tournamentData] = await Promise.all([
                db.getParticipants(tournamentId),
                db.getTournament(tournamentId)
            ]);

            setParticipants(participantsData);
            if (tournamentData.tournament) {
                setTournament(tournamentData.tournament);
            }

            // Sync localStorage for backwards compatibility
            const storedParticipants = JSON.parse(localStorage.getItem("participantsData") || "{}") as Record<string, Participant[]>;
            storedParticipants[tournamentId] = participantsData.map(p => ({
                id: p.id,
                tournament_id: p.tournament_id,
                email: p.email,
                name: p.name,
                avatar: p.avatar,
                status: p.status,
            }));
            localStorage.setItem("participantsData", JSON.stringify(storedParticipants));

            if (tournamentData.tournament) {
                const storedTournaments = JSON.parse(localStorage.getItem("tournaments") || "[]") as StoredTournament[];
                const index = storedTournaments.findIndex(t => t?.id === tournamentId);
                const normalizedStored: StoredTournament = {
                    ...(storedTournaments[index] ?? {}),
                    ...tournamentData.tournament,
                    maxParticipants: tournamentData.tournament.max_participants,
                    startDate: tournamentData.tournament.start_date,
                    startTime: tournamentData.tournament.start_time,
                    ownerEmail: tournamentData.tournament.owner_email,
                    prizePool: tournamentData.tournament.prize_pool,
                    registrationType: tournamentData.tournament.registration_type,
                    invitedUsers: tournamentData.tournament.invited_users,
                    dataAiHint: tournamentData.tournament.data_ai_hint,
                    createdAt: tournamentData.tournament.created_at,
                    updatedAt: tournamentData.tournament.updated_at,
                } as StoredTournament;

                if (index !== -1) {
                    storedTournaments[index] = normalizedStored;
                } else {
                    storedTournaments.push(normalizedStored);
                }

                localStorage.setItem("tournaments", JSON.stringify(storedTournaments));
            }
        } catch (error) {
            console.error('Error loading participants data:', error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los participantes.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [tournamentId, toast]);

    useEffect(() => {
        loadData();

        const handleParticipantsUpdated = () => {
            loadData();
        };

        window.addEventListener('participantsUpdated', handleParticipantsUpdated);
        return () => window.removeEventListener('participantsUpdated', handleParticipantsUpdated);
    }, [loadData]);

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
            setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
            toast({
                title: "Participante actualizado",
                description: `El estado de ${updated.email} ha sido cambiado a ${newStatus}.`
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

        const shuffled = [...acceptedParticipants].sort(() => Math.random() - 0.5);
        const seededParticipantsData = JSON.parse(localStorage.getItem("seededParticipantsData") || "{}");
        seededParticipantsData[tournamentId] = shuffled.map(p => p.name);
        localStorage.setItem("seededParticipantsData", JSON.stringify(seededParticipantsData));

        toast({
            title: "Seeds Asignados",
            description: "Los participantes han sido mezclados aleatoriamente en el bracket."
        });

        window.dispatchEvent(new CustomEvent('seedsAssigned'));
    };

    const handleStartTournament = async () => {
        if (!tournament) return;

        try {
            const updated = await db.updateTournament(tournamentId, { status: 'En curso' });
            setTournament(updated);
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

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle>Gestionar Participantes</CardTitle>
                        <CardDescription>Acepta o rechaza solicitantes, asigna seeds e inicia el torneo.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleSeed} disabled={tournament?.status === 'En curso'}><Shuffle className="mr-2 h-4 w-4" /> Asignar Seeds</Button>
                        <Button onClick={handleStartTournament} disabled={tournament?.status === 'En curso'}><Play className="mr-2 h-4 w-4" /> Iniciar Torneo</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Jugador</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">Cargando participantes...</TableCell>
                            </TableRow>
                        ) : participants.length > 0 ? (
                            participants.map((p) => (
                                <TableRow key={p.id ?? p.email}>
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            <Avatar>
                                                <AvatarImage src={p.avatar} />
                                                <AvatarFallback>{p.name.substring(0,2)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{p.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={p.status === "Aceptado" ? "default" : p.status === "Pendiente" ? "secondary" : "destructive"}>{p.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {p.status === "Pendiente" && (
                                            <div className="space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-600"
                                                    onClick={() => handleParticipantStatusChange(p.id, "Aceptado")}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600"
                                                    onClick={() => handleParticipantStatusChange(p.id, "Rechazado")}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">No hay participantes aún.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
