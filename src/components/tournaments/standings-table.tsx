import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const mockStandings = [
  { id: 1, rank: 1, name: "CyberNinja", wins: 4, losses: 0, avatar: 'https://placehold.co/40x40.png' },
  { id: 2, rank: 2, name: "SynthWave", wins: 3, losses: 1, avatar: 'https://placehold.co/40x40.png' },
  { id: 3, rank: 3, name: "GigaGlitch", wins: 2, losses: 2, avatar: 'https://placehold.co/40x40.png' },
  { id: 4, rank: 4, name: "LogicLancer", wins: 1, losses: 2, avatar: 'https://placehold.co/40x40.png' },
  { id: 5, rank: 5, name: "QuantumLeap", wins: 0, losses: 2, avatar: 'https://placehold.co/40x40.png' },
  { id: 6, rank: 5, name: "PixelProwler", wins: 0, losses: 2, avatar: 'https://placehold.co/40x40.png' },
];

export default function StandingsTable() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Posiciones</CardTitle>
                <CardDescription>Clasificación actual de los jugadores en el torneo.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px] text-center">Rango</TableHead>
                            <TableHead>Jugador</TableHead>
                            <TableHead className="text-center">Victorias</TableHead>
                            <TableHead className="text-center">Derrotas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockStandings.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium text-center">{p.rank}</TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-3">
                                        <Avatar>
                                            <AvatarImage src={p.avatar} />
                                            <AvatarFallback>{p.name.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{p.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-mono text-green-400">{p.wins}</TableCell>
                                <TableCell className="text-center font-mono text-red-400">{p.losses}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
