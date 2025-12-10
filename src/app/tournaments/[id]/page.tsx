"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Users, Calendar, Trophy, Shield, GitBranch, Loader2, Pencil, Trash2, CheckCircle2, MapPin, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Bracket, { generateRounds, type Round } from "@/components/tournaments/bracket";
import StandingsTable from "@/components/tournaments/standings-table";
import ParticipantManager from "@/components/tournaments/participant-manager";
import { InvitationManager } from "@/components/tournaments/invitation-manager";
import { EventLinkManager } from "@/components/tournaments/event-link-manager";
import TournamentStats from "@/components/tournaments/tournament-stats";
import { PrizeDisplay } from "@/components/tournaments/prize-manager";
import { OrganizerManager } from "@/components/shared/organizer-manager";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { db, type Tournament, type Participant, type Event } from "@/lib/database";
import { useAuth } from "@/lib/supabase/auth-context";
import { useTournament, useIsParticipating, useParticipants, invalidateCache } from "@/hooks/use-tournaments";
import { calculateStandings } from "@/components/tournaments/standings-table";

const getDefaultTournamentImage = (gameName: string) => {
  const colors = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-red-500 to-pink-600',
    'from-yellow-500 to-orange-600',
    'from-indigo-500 to-blue-600',
    'from-purple-500 to-indigo-600'
  ];

  const colorIndex = gameName.length % colors.length;
  return colors[colorIndex];
};

const formatMapping = {
    'single-elimination': 'Eliminación Simple',
    'double-elimination': 'Doble Eliminación',
    'swiss': 'Suizo'
};

type LocalParticipant = Omit<Participant, 'id' | 'created_at' | 'tournament_id'> & { tournament_id?: string };

export default function TournamentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  
  // Use auth context for user
  const { user, loading: authLoading } = useAuth();
  
  // Use SWR hooks for tournament data
  const { tournament: fetchedTournament, isLoading: tournamentLoading, refresh: refreshTournament } = useTournament(id);
  const { isParticipating: isParticipantFromHook, isLoading: participantLoading } = useIsParticipating(id);
  
  // Local state for tournament (allows updates)
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [linkedEvent, setLinkedEvent] = useState<Event | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  // Sync fetched tournament to local state
  useEffect(() => {
    if (fetchedTournament) {
      setTournament(fetchedTournament);
    }
  }, [fetchedTournament]);

  // Load linked event when tournament has event_id
  useEffect(() => {
    const loadLinkedEvent = async () => {
      if (tournament?.event_id) {
        const event = await db.getEventById(tournament.event_id);
        setLinkedEvent(event);
      } else {
        setLinkedEvent(null);
      }
    };
    loadLinkedEvent();
  }, [tournament?.event_id]);

  // Sync participant status
  useEffect(() => {
    setIsParticipant(isParticipantFromHook);
  }, [isParticipantFromHook]);

  // Check if user is owner or co-organizer
  const isOwner = user?.email === tournament?.owner_email || 
    (tournament?.organizers?.includes(user?.email ?? '') ?? false);
  const isMainOwner = user?.email === tournament?.owner_email;

  const loadBracketData = useCallback(() => {
    if (!id || !tournament) return;
    const seededParticipantsData = JSON.parse(localStorage.getItem("seededParticipantsData") || "{}");
    const seededPlayers = seededParticipantsData[id] || [];

    if (seededPlayers.length > 0) {
      setRounds(generateRounds(seededPlayers.length, seededPlayers, tournament.format));
    } else {
      setRounds([]);
    }
  }, [id, tournament]);

  // Access control and initial setup
  useEffect(() => {
    if (tournamentLoading || authLoading) return;
    
    // Tournament not found
    if (!fetchedTournament && !tournamentLoading) {
      toast({
        title: "Torneo no encontrado",
        description: "El torneo que buscas no existe o no tienes acceso.",
        variant: "destructive"
      });
      router.push("/tournaments");
      return;
    }

    if (fetchedTournament) {
      // Check access for private tournaments
      if (fetchedTournament.registration_type === 'private') {
        const canAccess = 
          user?.email === fetchedTournament.owner_email ||
          (fetchedTournament.invited_users?.includes(user?.email ?? '') ?? false);
        
        if (!canAccess) {
          toast({
            title: "Acceso restringido",
            description: "Este torneo es privado y requiere invitación.",
            variant: "destructive"
          });
          router.push("/tournaments");
          return;
        }
      }
      
      setAccessChecked(true);
      loadBracketData();
    }
  }, [fetchedTournament, tournamentLoading, authLoading, user, router, toast, loadBracketData]);

  // Listen for bracket updates
  useEffect(() => {
    window.addEventListener('seedsAssigned', loadBracketData);
    return () => {
      window.removeEventListener('seedsAssigned', loadBracketData);
    };
  }, [loadBracketData]);

  // Get participants for badge awarding
  const { participants } = useParticipants(id);

  // Function to award badges when tournament finishes
  const awardBadgesToParticipants = async () => {
    if (!tournament || !tournament.badges || tournament.badges.length === 0) return;
    if (rounds.length === 0) {
      console.log('No rounds data available for badge awarding');
      return;
    }

    try {
      // Calculate standings from the rounds
      const standings = calculateStandings(rounds, tournament.format);
      
      if (standings.length === 0) {
        console.log('No standings calculated');
        return;
      }

      // Map standings to participant emails
      const finalStandings: { email: string; position: string }[] = [];
      
      for (const standing of standings) {
        // Find participant by name
        const participant = participants.find(p => 
          p.name === standing.name || 
          p.email.split('@')[0] === standing.name ||
          (p.name && standing.name.includes(p.name))
        );
        
        if (participant) {
          finalStandings.push({
            email: participant.email,
            position: standing.rank.toString(),
          });
        }
      }

      // Also add all accepted participants who may not have standings (for participation badges)
      const acceptedParticipants = participants.filter(p => p.status === 'Aceptado');
      for (const p of acceptedParticipants) {
        if (!finalStandings.find(fs => fs.email === p.email)) {
          finalStandings.push({
            email: p.email,
            position: 'participant',
          });
        }
      }

      // Award badges using the database function
      await db.awardBadgesToParticipants(tournament, finalStandings);

      toast({
        title: "🏆 Badges otorgados",
        description: `Se han otorgado ${tournament.badges.length} tipos de badges a los participantes.`,
      });
    } catch (error) {
      console.error('Error awarding badges:', error);
      toast({
        title: "Error",
        description: "No se pudieron otorgar los badges automáticamente.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: tournament?.name,
      text: `Únete a mi torneo "${tournament?.name}" en TournaVerse!`,
      url: window.location.href,
    };

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "¡Enlace Copiado!",
          description: "El enlace al torneo ha sido copiado a tu portapapeles.",
        });
      } catch (copyError) {
        console.error("Error al copiar al portapapeles:", copyError);
        toast({
          title: "Error",
          description: "No se pudo copiar el enlace.",
          variant: "destructive",
        });
      }
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to copying the link if share fails, unless the user cancelled the share action
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.log("El usuario canceló la acción de compartir.");
        } else {
          console.error("Error al compartir, copiando enlace como alternativa:", error);
          await copyLink();
        }
      }
    } else {
      // Fallback for browsers that don't support navigator.share
      await copyLink();
    }
  };


  const handleDelete = async () => {
    if (!tournament || !user) return;

    try {
      await db.deleteTournament(id);

      // Invalidate caches
      invalidateCache.tournament(id);
      invalidateCache.publicTournaments();
      invalidateCache.userTournaments(user.email);

      toast({
        title: "Torneo eliminado",
        description: `El torneo "${tournament?.name}" ha sido eliminado.`,
      });
      router.push("/dashboard");
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el torneo. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  }

  const handleScoreReported = (matchId: number, scores: {top: number, bottom: number}) => {
      setRounds(prevRounds => {
          const newRounds: Round[] = JSON.parse(JSON.stringify(prevRounds));
          let matchFound = false;

          for (let i = 0; i < newRounds.length; i++) {
              const round = newRounds[i];
              const matchIndex = round.matches.findIndex(m => m.id === matchId);
              
              if (matchIndex !== -1) {
                  const match = round.matches[matchIndex];
                  match.top.score = scores.top;
                  match.bottom.score = scores.bottom;
                  match.winner = scores.top > scores.bottom ? match.top.name : match.bottom.name;
                  
                  // Propagate winner to next round
                  if (i + 1 < newRounds.length) {
                      const nextRound = newRounds[i+1];
                      const nextMatchIndex = Math.floor(matchIndex / 2);
                      const nextMatch = nextRound.matches[nextMatchIndex];
                      
                      if (nextMatch) {
                          if (matchIndex % 2 === 0) { // Top slot of next match
                              nextMatch.top.name = match.winner;
                          } else { // Bottom slot of next match
                              nextMatch.bottom.name = match.winner;
                          }

                          if(nextMatch.top.name !== 'TBD' && nextMatch.bottom.name !== 'TBD') {
                              if(nextMatch.bottom.name === 'BYE') nextMatch.winner = nextMatch.top.name;
                              if(nextMatch.top.name === 'BYE') nextMatch.winner = nextMatch.bottom.name;
                          }
                      }
                  }
                  matchFound = true;
                  break;
              }
          }

            let roundsUpdated = true;
            while(roundsUpdated) {
                roundsUpdated = false;
                for (let i = 0; i < newRounds.length - 1; i++) {
                    const round = newRounds[i];
                    const nextRound = newRounds[i+1];

                    for(let j = 0; j < round.matches.length; j++) {
                        const match = round.matches[j];

                        if (match.winner) {
                            const nextMatchIndex = Math.floor(j/2);
                            const nextMatch = nextRound.matches[nextMatchIndex];
                            if (nextMatch) {
                                const isTopSlot = j % 2 === 0;
                                if(isTopSlot) {
                                    if (nextMatch.top.name === "TBD") {
                                        nextMatch.top.name = match.winner;
                                        if(nextMatch.bottom.name === 'BYE') {
                                            nextMatch.winner = match.winner;
                                        }
                                        roundsUpdated = true;
                                    }
                                } else {
                                    if (nextMatch.bottom.name === "TBD") {
                                    nextMatch.bottom.name = match.winner;
                                        if(nextMatch.top.name === 'BYE') {
                                            nextMatch.winner = match.winner;
                                        }
                                    roundsUpdated = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
          
          return newRounds;
      });
  };

  // Handle station assignment for matches
  const handleStationAssigned = (matchId: number, stationId: string | null) => {
    if (!tournament?.stations) return;

    const station = stationId 
      ? tournament.stations.find(s => s.id === stationId)
      : null;

    setRounds(prevRounds => {
      const newRounds: Round[] = JSON.parse(JSON.stringify(prevRounds));
      
      for (const round of newRounds) {
        const match = round.matches.find(m => m.id === matchId);
        if (match) {
          match.station = station ? {
            id: station.id,
            name: station.name,
            location: station.location,
          } : null;
          break;
        }
      }
      
      return newRounds;
    });

    // Update station availability in tournament
    if (tournament) {
      const updatedStations = tournament.stations.map(s => ({
        ...s,
        isAvailable: s.id === stationId ? false : (s.currentMatchId === matchId ? true : s.isAvailable),
        currentMatchId: s.id === stationId ? matchId : (s.currentMatchId === matchId ? null : s.currentMatchId),
      }));

      setTournament(prev => prev ? { ...prev, stations: updatedStations } : null);

      // Optionally save to database
      db.updateTournament(tournament.id, { 
        stations: updatedStations,
        station_assignments: [
          ...(tournament.station_assignments || []).filter(a => a.matchId !== matchId),
          ...(stationId ? [{
            matchId,
            stationId,
            roundName: '', // Could be enhanced to include round name
            assignedAt: new Date().toISOString(),
            status: 'pending' as const,
          }] : []),
        ],
      }).catch(err => console.error('Error saving station assignment:', err));
    }

    toast({
      title: stationId ? "Estación asignada" : "Estación removida",
      description: stationId 
        ? `La partida ha sido asignada a ${station?.name}`
        : "La asignación de estación ha sido removida",
    });
  };

  const handleJoinTournament = async () => {
    if (!user) {
        toast({ title: "Debes iniciar sesión", description: "Inicia sesión para unirte a un torneo.", variant: "destructive" });
        router.push('/login');
        return;
    }
    if (!tournament) return;

    const capacity = tournament.max_participants;
    if (tournament.participants >= capacity) {
        toast({ title: "Torneo Lleno", description: "Este torneo ya ha alcanzado el máximo de participantes.", variant: "destructive" });
        return;
    }

    try {
      await db.addParticipant({
        tournament_id: tournament.id,
        email: user.email,
        name: user.displayName,
        avatar: user.photoURL,
        status: 'Pendiente'
      });

      // Refresh tournament data
      refreshTournament();
      
      // Invalidate caches
      invalidateCache.participants(tournament.id);
      invalidateCache.publicTournaments();

      setIsParticipant(true);
      toast({ title: "¡Inscripción Enviada!", description: "Tu solicitud para unirte al torneo ha sido enviada." });
      window.dispatchEvent(new CustomEvent('participantsUpdated'));
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar tu inscripción. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  }

  const handleTournamentStatusChange = async (newStatus: string) => {
    if(tournament){
        const updatedTournament = { ...tournament, status: newStatus };
        setTournament(updatedTournament);

        // Award badges when tournament is finalized
        if (newStatus === 'Finalizado' && tournament.badges && tournament.badges.length > 0) {
          await awardBadgesToParticipants();
        }
    }
  }

  const handleInvitationUpdate = (updatedInvitations: string[]) => {
    if (tournament) {
        setTournament({
            ...tournament,
            invited_users: updatedInvitations
        });
    }
  }

  const handleOrganizersUpdate = async (updatedOrganizers: string[]) => {
    if (!tournament) return;
    
    await db.updateTournament(tournament.id, { organizers: updatedOrganizers });
    setTournament({
      ...tournament,
      organizers: updatedOrganizers
    });
    invalidateCache.tournament(tournament.id);
  }

  // Combined loading state
  const loading = tournamentLoading || authLoading || (!accessChecked && !!fetchedTournament);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  }

  if (!tournament) {
    return <div className="text-center py-10">Torneo no encontrado.</div>;
  }
  
  const canJoin = !isOwner && !isParticipant && tournament.status !== 'En curso';

  // Find if current participant has a pending match with station assigned
  const getParticipantNextMatch = () => {
    if (!user || !isParticipant) return null;
    
    for (const round of rounds) {
      for (const match of round.matches) {
        if (!match.winner && match.station) {
          const userName = user.displayName;
          if (match.top.name === userName || match.bottom.name === userName) {
            return { match, roundName: round.name };
          }
        }
      }
    }
    return null;
  };

  const participantNextMatch = getParticipantNextMatch();

  return (
    <div className="container mx-auto py-10 px-4">
      {/* Station Alert for Participants */}
      {participantNextMatch && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-full">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">¡Tu partida está lista!</h3>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{participantNextMatch.roundName}</span>
                {' vs '}
                <span className="font-medium text-foreground">
                  {participantNextMatch.match.top.name === user?.displayName 
                    ? participantNextMatch.match.bottom.name 
                    : participantNextMatch.match.top.name}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Dirígete a</p>
              <p className="text-xl font-bold text-primary">{participantNextMatch.match.station?.name}</p>
              {participantNextMatch.match.station?.location && (
                <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                  <MapPin className="h-3 w-3" />
                  {participantNextMatch.match.station.location}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full h-48 md:h-64 lg:h-80 rounded-lg overflow-hidden mb-8 shadow-lg">
        {tournament.image && tournament.image.trim() !== '' ? (
          <Image src={tournament.image} layout="fill" objectFit="cover" alt={tournament.name} data-ai-hint={tournament.data_ai_hint} />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getDefaultTournamentImage(tournament.game)} flex items-center justify-center`}>
            <div className="text-center text-white">
              <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-80" />
              <p className="font-semibold text-lg opacity-90">{tournament.game}</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6">
          <h1 className="text-3xl md:text-5xl font-bold text-white font-headline">{tournament.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="text-sm" variant={tournament.status === 'En curso' ? 'default' : 'secondary'}>{tournament.status}</Badge>
            {linkedEvent && (
              <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent">
                <Calendar className="h-3 w-3 mr-1" />
                {linkedEvent.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="standings">Posiciones</TabsTrigger>
          {isOwner && <TabsTrigger value="stats">Estadísticas</TabsTrigger>}
          {isOwner && <TabsTrigger value="manage">Gestionar</TabsTrigger>}
          {isOwner && tournament.registration_type === 'private' && <TabsTrigger value="invitations">Invitaciones</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <CardTitle>Detalles del Torneo</CardTitle>
               {isOwner && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Compartir
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tournaments/${tournament.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente tu torneo
                          y todos sus datos de nuestros servidores.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{tournament.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <Gamepad2 className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Juego</p>
                    <p className="text-lg text-foreground">{tournament.game}</p>
                    {tournament.game_mode && (
                      <p className="text-sm text-muted-foreground">{tournament.game_mode}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Fecha de Inicio</p>
                    <p className="text-lg text-foreground">{tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Por anunciar'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <GitBranch className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Formato</p>
                    <p className="text-lg text-foreground">{formatMapping[tournament.format]}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Participantes</p>
                    <p className="text-lg text-foreground">{tournament.participants} / {tournament.max_participants}</p>
                  </div>
                </div>
                 <div className="flex items-start space-x-3">
                  <Trophy className="h-8 w-8 text-primary mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">Bolsa de Premios</p>
                    {tournament.prizes && tournament.prizes.length > 0 ? (
                      <PrizeDisplay prizes={tournament.prizes} />
                    ) : (
                      <p className="text-lg text-foreground">{tournament.prize_pool || 'Por anunciar'}</p>
                    )}
                  </div>
                </div>
                 <div className="flex items-center space-x-3">
                  <Shield className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Organizador</p>
                    <p className="text-lg text-foreground">{tournament.owner_email?.split('@')[0]}</p>
                  </div>
                </div>
                {tournament.location && (
                    <div className="flex items-center space-x-3">
                        <MapPin className="h-8 w-8 text-primary" />
                        <div>
                        <p className="text-sm font-medium">Ubicación</p>
                        <p className="text-lg text-foreground">{tournament.location}</p>
                        </div>
                    </div>
                )}
                {tournament.stations && tournament.stations.length > 0 && (
                    <div className="flex items-start space-x-3">
                        <Gamepad2 className="h-8 w-8 text-primary mt-1" />
                        <div>
                        <p className="text-sm font-medium">Estaciones de juego</p>
                        <p className="text-lg text-foreground">{tournament.stations.length} estación{tournament.stations.length !== 1 ? 'es' : ''}</p>
                        <p className="text-sm text-muted-foreground">
                          {tournament.stations.filter(s => s.isAvailable).length} disponible{tournament.stations.filter(s => s.isAvailable).length !== 1 ? 's' : ''}
                        </p>
                        </div>
                    </div>
                )}
                {linkedEvent && (
                    <div className="flex items-center space-x-3">
                        <Calendar className="h-8 w-8 text-accent" />
                        <div>
                        <p className="text-sm font-medium">Parte del evento</p>
                        <Link href={`/events/${linkedEvent.slug}`} className="text-lg text-primary hover:underline">
                          {linkedEvent.name}
                        </Link>
                        </div>
                    </div>
                )}
              </div>
              <div className="pt-6 border-t">
                  {canJoin && <Button size="lg" onClick={handleJoinTournament}>Unirse al Torneo</Button>}
                  {isParticipant && <Button size="lg" variant="secondary" disabled><CheckCircle2 className="mr-2 h-5 w-5"/> Ya estás inscrito</Button>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bracket" className="mt-6">
          <Bracket 
            tournament={tournament} 
            isOwner={isOwner} 
            rounds={rounds} 
            onScoreReported={handleScoreReported}
            onStationAssigned={handleStationAssigned}
          />
        </TabsContent>
        <TabsContent value="standings" className="mt-6">
          <StandingsTable 
            rounds={rounds} 
            tournamentId={id} 
            format={tournament.format}
            gameMode={tournament.game_mode}
          />
        </TabsContent>
        {isOwner && (
          <TabsContent value="stats" className="mt-6">
            <TournamentStats tournament={tournament} rounds={rounds} />
          </TabsContent>
        )}
        {isOwner && (
          <TabsContent value="manage" className="mt-6 space-y-6">
            <EventLinkManager 
              tournamentId={id} 
              currentEventId={tournament.event_id}
              onEventChanged={() => refreshTournament()}
            />
            <ParticipantManager tournamentId={id} onTournamentStart={handleTournamentStatusChange}/>
            {isMainOwner && (
              <OrganizerManager
                ownerEmail={tournament.owner_email}
                organizers={tournament.organizers || []}
                onOrganizersChange={handleOrganizersUpdate}
                entityType="torneo"
              />
            )}
          </TabsContent>
        )}
        {isOwner && tournament.registration_type === 'private' && (
          <TabsContent value="invitations" className="mt-6">
            <InvitationManager
              tournamentId={id}
              invitedUsers={tournament.invited_users || []}
              onInvitationUpdate={handleInvitationUpdate}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
