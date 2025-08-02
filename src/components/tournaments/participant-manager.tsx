"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "../ui/button";
import { Check, X, Shuffle } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Participant {
    email: string;
    name: string;
    avatar: string;
    status: 'Aceptado' | 'Pendiente' | 'Rechazado';
}

interface ParticipantManagerProps {
    tournamentId: string;
}

export default function ParticipantManager({ tournamentId }: ParticipantManagerProps) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const participantsData: Record<string, Participant[]> = JSON.parse(localStorage.getItem("participantsData") || "{}");
        setParticipants(participantsData[tournamentId] || []);
        setLoading(false);
    }, [tournamentId]);

    const handleParticipantStatusChange = (email: string, newStatus: 'Aceptado' | 'Rechazado') => {
        const participantsData: Record<string, Participant[]> = JSON.parse(localStorage.getItem("participantsData") || "{}");
        const tournamentParticipants = participantsData[tournamentId] || [];
        const participantIndex = tournamentParticipants.findIndex(p => p.email === email);

        if (participantIndex !== -1) {
            tournamentParticipants[participantIndex].status = newStatus;
            participantsData[tournamentId] = tournamentParticipants;
            localStorage.setItem("participantsData", JSON.stringify(participantsData));
            setParticipants([...tournamentParticipants]);

            toast({
                title: "Participante actualizado",
                description: `El estado de ${email} ha sido cambiado a ${newStatus}.`,
            });
        }
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle>Gestionar Participantes</CardTitle>
                        <CardDescription>Acepta o rechaza solicitantes y asigna los seeds del torneo.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline"><Shuffle className="mr-2 h-4 w-4" /> Asignar Seeds</Button>
                        <Button>Iniciar Torneo</Button>
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
                        {participants.length > 0 ? participants.map((p) => (
                            <TableRow key={p.email}>
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
                                            <Button variant="ghost" size="icon" className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-600" onClick={() => handleParticipantStatusChange(p.email, "Aceptado")}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600" onClick={() => handleParticipantStatusChange(p.email, "Rechazado")}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        )) : (
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
