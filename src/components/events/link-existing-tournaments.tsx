"use client";

import { useState, useEffect } from "react";
import { Check, Link2, Loader2, Unlink, Search, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { db, type Tournament } from "@/lib/database";

interface LinkExistingTournamentsProps {
    eventId: string;
    ownerEmail: string;
    linkedTournamentIds: string[];
    onTournamentsLinked: () => void;
}

export function LinkExistingTournaments({ 
    eventId, 
    ownerEmail, 
    linkedTournamentIds,
    onTournamentsLinked 
}: LinkExistingTournamentsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    // Load owner's tournaments that are not already linked to this event
    useEffect(() => {
        const loadTournaments = async () => {
            try {
                const ownerTournaments = await db.getTournamentsByOwner(ownerEmail);
                // Filter out tournaments that are already linked to this event
                const unlinked = ownerTournaments.filter(
                    t => !linkedTournamentIds.includes(t.id) && (!t.event_id || t.event_id !== eventId)
                );
                setAvailableTournaments(unlinked);
            } catch (error) {
                console.error('Error loading tournaments:', error);
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los torneos",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        loadTournaments();
    }, [ownerEmail, linkedTournamentIds, eventId, toast]);

    const toggleSelection = (tournamentId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(tournamentId)) {
            newSelected.delete(tournamentId);
        } else {
            newSelected.add(tournamentId);
        }
        setSelectedIds(newSelected);
    };

    const handleLinkSelected = async () => {
        if (selectedIds.size === 0) return;

        setSaving(true);
        try {
            // Link all selected tournaments to this event
            const linkPromises = Array.from(selectedIds).map(
                tournamentId => db.assignTournamentToEvent(tournamentId, eventId)
            );
            await Promise.all(linkPromises);

            toast({
                title: "¡Torneos vinculados!",
                description: `Se vincularon ${selectedIds.size} torneo(s) al evento.`,
            });

            setSelectedIds(new Set());
            onTournamentsLinked();
        } catch (error) {
            console.error('Error linking tournaments:', error);
            toast({
                title: "Error",
                description: "No se pudieron vincular los torneos",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const filteredTournaments = availableTournaments.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.game.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Link2 className="mr-2 h-5 w-5" />
                    Vincular Torneos Existentes
                </CardTitle>
                <CardDescription>
                    Selecciona torneos que ya hayas creado para agregarlos a este evento
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {availableTournaments.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <Unlink className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No tienes torneos disponibles para vincular.</p>
                        <p className="text-sm">Todos tus torneos ya están vinculados a este evento o a otros eventos.</p>
                    </div>
                ) : (
                    <>
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o juego..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Tournament List */}
                        <ScrollArea className="h-[300px] border rounded-lg">
                            <div className="p-2 space-y-2">
                                {filteredTournaments.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">
                                        No se encontraron torneos
                                    </p>
                                ) : (
                                    filteredTournaments.map(tournament => (
                                        <div
                                            key={tournament.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                selectedIds.has(tournament.id)
                                                    ? 'bg-primary/10 border-primary'
                                                    : 'hover:bg-muted'
                                            }`}
                                            onClick={() => toggleSelection(tournament.id)}
                                        >
                                            <Checkbox
                                                checked={selectedIds.has(tournament.id)}
                                                onCheckedChange={() => toggleSelection(tournament.id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{tournament.name}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Gamepad2 className="h-3 w-3" />
                                                    <span>{tournament.game}</span>
                                                    {tournament.game_mode && (
                                                        <span>• {tournament.game_mode}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {tournament.participants}/{tournament.max_participants}
                                                </Badge>
                                                <Badge variant={tournament.status === 'En curso' ? 'default' : 'secondary'}>
                                                    {tournament.status}
                                                </Badge>
                                            </div>
                                            {tournament.event_id && tournament.event_id !== eventId && (
                                                <Badge variant="destructive" className="text-xs">
                                                    Otro evento
                                                </Badge>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {selectedIds.size} torneo(s) seleccionado(s)
                            </p>
                            <Button
                                onClick={handleLinkSelected}
                                disabled={selectedIds.size === 0 || saving}
                            >
                                {saving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="mr-2 h-4 w-4" />
                                )}
                                Vincular Seleccionados
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
