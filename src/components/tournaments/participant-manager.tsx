"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "../ui/button";
import { Check, X, Shuffle } from "lucide-react";

const mockParticipants = [
  { id: 1, name: "CyberNinja", status: "Accepted", seed: 1, avatar: 'https://placehold.co/40x40.png' },
  { id: 2, name: "SynthWave", status: "Accepted", seed: 2, avatar: 'https://placehold.co/40x40.png' },
  { id: 3, name: "GigaGlitch", status: "Accepted", seed: 3, avatar: 'https://placehold.co/40x40.png' },
  { id: 4, name: "LogicLancer", status: "Accepted", seed: 4, avatar: 'https://placehold.co/40x40.png' },
  { id: 5, name: "QuantumLeap", status: "Pending", seed: null, avatar: 'https://placehold.co/40x40.png' },
  { id: 6, name: "PixelProwler", status: "Pending", seed: null, avatar: 'https://placehold.co/40x40.png' },
  { id: 7, name: "VoidRunner", status: "Rejected", seed: null, avatar: 'https://placehold.co/40x40.png' },
];

export default function ParticipantManager() {
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle>Manage Participants</CardTitle>
                        <CardDescription>Accept or reject applicants and seed the tournament.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline"><Shuffle className="mr-2 h-4 w-4" /> Seed Participants</Button>
                        <Button>Start Tournament</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockParticipants.map((p) => (
                            <TableRow key={p.id}>
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
                                    <Badge variant={p.status === "Accepted" ? "default" : p.status === "Pending" ? "secondary" : "destructive"}>{p.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {p.status === "Pending" && (
                                        <div className="space-x-2">
                                            <Button variant="ghost" size="icon" className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-600">
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
