'use client';

import React, { useState, useEffect } from 'react';
import { db, MatchRoom, Participant, Tournament } from '@/lib/database';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, AlertCircle, MessageSquare, Copy, Upload, ShieldAlert, Swords, User, Video, Play, ExternalLink, Radio } from 'lucide-react';
import { DiscordBotService } from '@/lib/discord-bot-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MatchRoomProps {
    room: MatchRoom;
    currentUserEmail: string;
    tournament: Tournament;
    p1: Participant;
    p2: Participant;
}

export function MatchRoomComponent({ room: initialRoom, currentUserEmail, tournament, p1, p2 }: MatchRoomProps) {
    const [room, setRoom] = useState<MatchRoom>(initialRoom);
    const [isP1, setIsP1] = useState(currentUserEmail === room.player_1_email);
    const [isHost, setIsHost] = useState(currentUserEmail === room.host_email);
    const [matchCode, setMatchCode] = useState(room.match_code || '');
    const [score1, setScore1] = useState(room.p1_score?.toString() || '');
    const [score2, setScore2] = useState(room.p2_score?.toString() || '');
    const [recordedUrl, setRecordedUrl] = useState(room.recorded_match_url || '');
    const [streamUrl, setStreamUrl] = useState(room.stream_url || '');
    const [isStreamingAnnounced, setIsStreamingAnnounced] = useState(!!room.stream_announced_at);
    const { toast } = useToast();

    // Listen for real-time updates
    useEffect(() => {
        const channel = db.listenToMatchRoom(room.id, (payload) => {
            if (payload.new) {
                const newRoom = payload.new as MatchRoom;
                setRoom(newRoom);
                setRecordedUrl(newRoom.recorded_match_url || '');
                setStreamUrl(newRoom.stream_url || '');
                setIsStreamingAnnounced(!!newRoom.stream_announced_at);
                
                // Update match start announcement logic if ready status changes
                if (newRoom.p1_ready && newRoom.p2_ready && (room.p1_ready === false || room.p2_ready === false)) {
                    DiscordBotService.announceMatchStart(tournament.name, p1.name, p2.name);
                }
            }
        });

        return () => {
            // Unsubscribe logic (simplified)
        };
    }, [room.id, p1.name, p2.name, tournament.id, room.p1_ready, room.p2_ready]);

    const handleReadyToggle = async (checked: boolean) => {
        try {
            const updates = isP1 ? { p1_ready: checked } : { p2_ready: checked };
            await db.updateMatchRoom(room.id, updates);
            toast({
                title: checked ? "¡Listo!" : "Estado cambiado",
                description: checked ? "Esperando al oponente..." : "Has marcado que no estás listo."
            });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
        }
    };

    const handleUpdateCode = async () => {
        try {
            await db.updateMatchRoom(room.id, { match_code: matchCode });
            toast({ title: "Código actualizado", description: "Tu oponente ya puede ver el código de acceso." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar el código.", variant: "destructive" });
        }
    };

    const handleUpdateStreamUrl = async () => {
        try {
            await db.updateMatchRoom(room.id, { stream_url: streamUrl });
            toast({ title: "Enlace de streaming guardado", description: "El enlace ha sido registrado." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar el enlace.", variant: "destructive" });
        }
    };

    const handleAnnounceStream = async () => {
        if (!streamUrl) {
            toast({ title: "Enlace vacío", description: "Debes ingresar un enlace de stream primero.", variant: "destructive" });
            return;
        }

        try {
            const opponentName = isP1 ? p2.name : p1.name;
            const myName = isP1 ? p1.name : p2.name;
            
            await DiscordBotService.announceStream(tournament.name, myName, opponentName, streamUrl);
            await db.updateMatchRoom(room.id, { stream_announced_at: new Date().toISOString() });
            
            setIsStreamingAnnounced(true);
            toast({ title: "Anunciado en Discord", description: "Se ha enviado el aviso al canal #streams-en-vivo." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo anunciar el stream.", variant: "destructive" });
        }
    };

    const handleUpdateRecordedUrl = async () => {
        try {
            await db.updateMatchRoom(room.id, { recorded_match_url: recordedUrl });
            toast({ title: "Grabación guardada", description: "¡Gracias por compartir tu partida!" });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar la grabación.", variant: "destructive" });
        }
    };

    const handleReportScore = async () => {
        try {
            const s1 = parseInt(score1);
            const s2 = parseInt(score2);
            
            if (isNaN(s1) || isNaN(s2)) {
                toast({ title: "Datos inválidos", description: "Por favor ingresa puntuaciones válidas.", variant: "destructive" });
                return;
            }

            // Simple conflict detection: if both score fields are filled but don't match (logic depends on how we handle reporting)
            // For now, we update our fields. A cloud function would check if they match.
            const updates = isP1 
                ? { p1_score: s1, p2_score: s2 } 
                : { p1_score: s1, p2_score: s2 }; // In this simplified version, they report the same fields

            await db.updateMatchRoom(room.id, {
                ...updates,
                status: 'finished' // Simplified: we should have a "dispute" logic if they report different things
            });

            toast({ title: "Resultado enviado", description: "El resultado ha sido registrado correctamente." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo enviar el resultado.", variant: "destructive" });
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(matchCode);
        toast({ title: "Copiado", description: "El código se ha copiado al portapapeles." });
    };

    const playersReady = room.p1_ready && room.p2_ready;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto p-4">
            {/* Main Match Logic */}
            <Card className="md:col-span-2 border-2 border-primary/20 bg-background/50 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Badge variant={room.status === 'finished' ? "secondary" : "default"} className="animate-pulse">
                            {room.status === 'pending' ? 'Esperando inicio' : room.status === 'ongoing' ? 'En curso' : 'Finalizado'}
                        </Badge>
                    </div>
                    <CardTitle className="text-3xl font-bold flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center">
                            <Avatar className="h-16 w-16 mb-2 border-2 border-blue-500">
                                <AvatarImage src={p1.avatar} />
                                <AvatarFallback>{p1.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{p1.name}</span>
                        </div>
                        <span className="text-muted-foreground text-4xl italic">VS</span>
                        <div className="flex flex-col items-center">
                            <Avatar className="h-16 w-16 mb-2 border-2 border-red-500">
                                <AvatarImage src={p2.avatar} />
                                <AvatarFallback>{p2.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{p2.name}</span>
                        </div>
                    </CardTitle>
                    <CardDescription className="mt-4">
                        Match ID: {room.match_id} • Torneo: {tournament.name}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8">
                    {/* Ready Checks */}
                    <div className="flex flex-col sm:flex-row justify-around p-6 bg-accent/50 rounded-xl gap-4">
                        <div className="flex items-center gap-3">
                            <Checkbox 
                                id="p1-ready" 
                                checked={room.p1_ready} 
                                disabled={!isP1 || playersReady}
                                onCheckedChange={(checked) => handleReadyToggle(checked as boolean)}
                            />
                            <label htmlFor="p1-ready" className="text-sm font-medium leading-none flex items-center gap-2">
                                {p1.name} {room.p1_ready ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <span className="text-xs text-muted-foreground">(Pendiente)</span>}
                            </label>
                        </div>
                        <div className="flex items-center gap-3">
                            <Checkbox 
                                id="p2-ready" 
                                checked={room.p2_ready} 
                                disabled={isP1 || playersReady}
                                onCheckedChange={(checked) => handleReadyToggle(checked as boolean)}
                            />
                            <label htmlFor="p2-ready" className="text-sm font-medium leading-none flex items-center gap-2">
                                {p2.name} {room.p2_ready ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <span className="text-xs text-muted-foreground">(Pendiente)</span>}
                            </label>
                        </div>
                    </div>

                    {/* Code & Logistics */}
                    {playersReady && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-2 border-dashed border-primary rounded-xl bg-primary/5 text-center">
                                <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                                    <Swords className="h-5 w-5" /> Código de la Partida
                                </h3>
                                {isHost ? (
                                    <div className="flex gap-2 max-w-sm mx-auto">
                                        <Input 
                                            value={matchCode} 
                                            onChange={(e) => setMatchCode(e.target.value)} 
                                            placeholder="Ingresa el código..." 
                                        />
                                        <Button onClick={handleUpdateCode}>Actualizar</Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-3xl font-mono tracking-widest bg-background px-4 py-2 rounded border shadow-inner">
                                            {room.match_code || 'ESPERANDO CÓDIGO...'}
                                        </div>
                                        {room.match_code && (
                                            <Button variant="ghost" size="sm" onClick={copyCode} className="gap-2">
                                                <Copy className="h-4 w-4" /> Copiar código
                                            </Button>
                                        )}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-4">
                                    {isHost ? 'Eres el host. Crea la sala y comparte el código.' : `El host es ${p1.name}. Espera a que publique el código.`}
                                </p>
                            </div>

                            {/* Stream Connection */}
                            <div className="p-6 border rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
                                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                    <Radio className="h-5 w-5" /> ¿Vas a transmitir en vivo?
                                </h3>
                                <p className="text-sm text-indigo-600/80 dark:text-indigo-400/80 mb-4">
                                    Comparte tu enlace de Twitch o YouTube para que otros puedan ver la partida.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="flex-1 relative">
                                        <Input 
                                            value={streamUrl} 
                                            onChange={(e) => setStreamUrl(e.target.value)} 
                                            placeholder="https://twitch.tv/..." 
                                            className="pr-10"
                                        />
                                        {streamUrl && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2"
                                                onClick={handleUpdateStreamUrl}
                                            >
                                                Guardar
                                            </Button>
                                        )}
                                    </div>
                                    <Button 
                                        onClick={handleAnnounceStream}
                                        disabled={isStreamingAnnounced || !streamUrl}
                                        className="bg-[#5865F2] hover:bg-[#4752C4] text-white gap-2"
                                    >
                                        {isStreamingAnnounced ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                                        {isStreamingAnnounced ? 'Aviso enviado' : 'Avisar a Discord'}
                                    </Button>
                                </div>
                                {isStreamingAnnounced && (
                                    <p className="text-[10px] text-indigo-500 mt-2 italic">
                                        El enlace ya ha sido publicado en el canal #streams-en-vivo.
                                    </p>
                                )}
                            </div>

                            {/* Score Reporting */}
                            <div className="p-6 border rounded-xl bg-card">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-yellow-500" /> Reportar Resultado
                                </h3>
                                <div className="grid grid-cols-2 gap-8 mb-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{p1.name}</label>
                                        <Input type="number" value={score1} onChange={(e) => setScore1(e.target.value)} placeholder="0" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{p2.name}</label>
                                        <Input type="number" value={score2} onChange={(e) => setScore2(e.target.value)} placeholder="0" />
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button className="flex-1" onClick={handleReportScore}>
                                        Confirmar Resultado
                                    </Button>
                                    <Button variant="outline" className="gap-2">
                                        <Upload className="h-4 w-4" /> Subir Evidencia
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-between border-t p-4 bg-muted/30">
                    <span className="text-xs text-muted-foreground">Sistema Automatizado Duels Logistics v1.0</span>
                    <div className="flex gap-2">
                         <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <ShieldAlert className="h-4 w-4 mr-1" /> Soporte / Ticket
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            {/* Sidebar info */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" /> Chat de Soporte
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                El bot ha creado un canal privado para tu duelo en el servidor de Discord.
                            </p>
                            <Button size="sm" className="w-full bg-[#5865F2] hover:bg-[#4752C4]">
                                Ir al Discord
                            </Button>
                        </div>
                        <div className="text-xs space-y-2 text-muted-foreground">
                            <p>• Respeta a tu oponente.</p>
                            <p>• Toma capturas del resultado final.</p>
                            <p>• Tienes 10 min para presentarte.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <User className="h-4 w-4" /> Roles de Discord
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-2 border rounded">
                             <span className="text-sm font-medium">@Jugador-FIFA</span>
                             <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Activo</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3 text-center">
                            Se retirará automáticamente al finalizar el torneo.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Video className="h-4 w-4" /> Comparte tu proeza
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            ¡Queremos ver tus mejores jugadas! Si grabas la partida, comparte el enlace aquí para que la comunidad pueda disfrutarla y nosotros podamos usarla en clips destacados.
                        </p>
                        <div className="space-y-2">
                            <Input 
                                value={recordedUrl} 
                                onChange={(e) => setRecordedUrl(e.target.value)} 
                                placeholder="Link de YouTube/Clip..." 
                                className="text-xs"
                            />
                            <Button size="sm" className="w-full gap-2" variant="outline" onClick={handleUpdateRecordedUrl}>
                                <Play className="h-3 w-3" /> Subir grabación
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
