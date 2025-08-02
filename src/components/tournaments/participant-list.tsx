import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const mockParticipants = [
  { id: 1, name: "CyberNinja", status: "Aceptado", seed: 1, avatar: 'https://placehold.co/40x40.png' },
  { id: 2, name: "SynthWave", status: "Aceptado", seed: 2, avatar: 'https://placehold.co/40x40.png' },
  { id: 3, name: "GigaGlitch", status: "Aceptado", seed: 3, avatar: 'https://placehold.co/40x40.png' },
  { id: 4, name: "LogicLancer", status: "Aceptado", seed: 4, avatar: 'https://placehold.co/40x40.png' },
  { id: 5, name: "QuantumLeap", status: "Pendiente", seed: null, avatar: 'https://placehold.co/40x40.png' },
  { id: 6, name: "PixelProwler", status: "Pendiente", seed: null, avatar: 'https://placehold.co/40x40.png' },
  { id: 7, name: "VoidRunner", status: "Rechazado", seed: null, avatar: 'https://placehold.co/40x40.png' },
];

export default function ParticipantList() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Participantes</CardTitle>
                <CardDescription>Una lista de todos los jugadores en el torneo.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Seed</TableHead>
                            <TableHead>Jugador</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockParticipants.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium text-center">{p.seed ?? 'N/A'}</TableCell>
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
                                    <Badge variant={
                                        p.status === "Aceptado" ? "default" 
                                        : p.status === "Pendiente" ? "secondary" 
                                        : "destructive"
                                    }>{p.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
