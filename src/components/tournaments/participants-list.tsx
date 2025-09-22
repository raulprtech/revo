"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { db, type Participant } from "@/lib/database";
import { Loader2, Users } from "lucide-react";

interface ParticipantsListProps {
    tournamentId: string;
}

export default function ParticipantsList({ tournamentId }: ParticipantsListProps) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadParticipants = async () => {
            try {
                const data = await db.getParticipants(tournamentId);
                setParticipants(data);
            } catch (error) {
                console.error('Error loading participants:', error);
            } finally {
                setLoading(false);
            }
        };

        loadParticipants();
    }, [tournamentId]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Participantes
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participantes ({participants.length})
                </CardTitle>
                <CardDescription>
                    Lista de participantes registrados en este torneo
                </CardDescription>
            </CardHeader>
            <CardContent>
                {participants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aún no hay participantes registrados</p>
                        <p className="text-sm">¡Sé el primero en unirte!</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Participante</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha de Registro</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {participants.map((participant) => (
                                <TableRow key={participant.id}>
                                    <TableCell className="flex items-center space-x-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={participant.avatar} />
                                            <AvatarFallback>
                                                {participant.name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{participant.name}</p>
                                            <p className="text-sm text-muted-foreground">{participant.email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                participant.status === 'Aceptado' ? 'default' :
                                                participant.status === 'Pendiente' ? 'secondary' :
                                                'destructive'
                                            }
                                        >
                                            {participant.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {participant.created_at ?
                                            new Date(participant.created_at).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            }) :
                                            'No disponible'
                                        }
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}