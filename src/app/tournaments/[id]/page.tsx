
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
import ParticipantsList from "@/components/tournaments/participants-list";
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
import { db, type Tournament, type Participant } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

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


// Interfaces are now imported from database

interface User {
    displayName: string;
    email: string;
    photoURL: string;
}

const formatMapping = {
    'single-elimination': 'Eliminación Simple',
    'double-elimination': 'Doble Eliminación',
    'swiss': 'Suizo'
};

const SUPABASE_SESSION_KEY = (() => {
  if (typeof process === 'undefined') return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  const match = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
  return match ? `sb-${match[1]}-auth-token` : null;
})();

const readStoredSession = (): Session | null => {
  if (typeof window === 'undefined' || !SUPABASE_SESSION_KEY) {
    return null;
  }

  try {
    const raw = localStorage.getItem(SUPABASE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession;
    if (session && typeof session === 'object') {
      return session as Session;
    }
  } catch (error) {
    console.warn('Unable to parse stored Supabase session.', error);
  }

  return null;
};

type StoredTournamentShape = Partial<Tournament> & {
  id?: string;
  name?: string;
  game?: string;
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

type LocalParticipant = Omit<Participant, 'id' | 'created_at' | 'tournament_id'> & { tournament_id?: string };

const normalizeTournament = (raw: StoredTournamentShape | null | undefined): Tournament | null => {
  if (!raw?.id || !raw.name || !raw.game) {
    return null;
  }

  const format = (raw.format ?? 'single-elimination') as Tournament['format'];
  const registrationType = (raw.registration_type ?? raw.registrationType ?? 'public') as Tournament['registration_type'];

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    game: raw.game,
    participants: raw.participants ?? 0,
    max_participants: raw.max_participants ?? raw.maxParticipants ?? 0,
    start_date: raw.start_date ?? raw.startDate ?? '',
    start_time: raw.start_time ?? raw.startTime,
    format,
    status: raw.status ?? 'Próximo',
    owner_email: raw.owner_email ?? raw.ownerEmail ?? '',
    image: raw.image,
    data_ai_hint: raw.data_ai_hint ?? raw.dataAiHint,
    registration_type: registrationType,
    prize_pool: raw.prize_pool ?? raw.prizePool,
    location: raw.location,
    invited_users: raw.invited_users ?? raw.invitedUsers ?? [],
    created_at: raw.created_at ?? raw.createdAt,
    updated_at: raw.updated_at ?? raw.updatedAt,
  };
};


export default function TournamentPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);

  const loadBracketData = useCallback(() => {
    if (!id) return;
    const seededParticipantsData = JSON.parse(localStorage.getItem("seededParticipantsData") || "{}");
    const seededPlayerNames = seededParticipantsData[id] || [];

    const allTournaments = JSON.parse(localStorage.getItem("tournaments") || "[]") as StoredTournamentShape[];
    const currentTournament = allTournaments.find(t => t?.id === id);

    if (currentTournament) {
        const normalizedTournament = normalizeTournament(currentTournament);
        const maxParticipants = normalizedTournament?.max_participants ?? 0;
        const participantCount = seededPlayerNames.length > 0 ? seededPlayerNames.length : maxParticipants;
        setRounds(generateRounds(participantCount, seededPlayerNames));
    }
  }, [id]);


  useEffect(() => {
    const loadTournament = async () => {
      if (!id) return;

      try {
        const supabase = createClient();
        let session: Session | null = readStoredSession();
        const hasStoredSession =
          !!session ||
          (typeof window !== 'undefined' && SUPABASE_SESSION_KEY
            ? !!localStorage.getItem(SUPABASE_SESSION_KEY)
            : false);
        let authenticatedUser: Session['user'] | null = session?.user ?? null;

        if (!authenticatedUser && hasStoredSession) {
          try {
            const { data } = await supabase.auth.getSession();
            session = data.session ?? session;
            authenticatedUser = session?.user ?? null;
          } catch (sessionError) {
            console.warn('Unable to load Supabase session from client.', sessionError);
          }
        }

        const tournamentResult = await db.getTournament(id);

        if (!tournamentResult.tournament) {
          if (tournamentResult.status === 401 || tournamentResult.status === 403) {
            if (!session) {
              toast({
                title: "Acceso restringido",
                description: "Inicia sesión con una cuenta autorizada para ver este torneo.",
                variant: "destructive"
              });
              router.push('/login');
              return;
            }

            toast({
              title: "Acceso restringido",
              description: "No tienes permisos para ver este torneo.",
              variant: "destructive"
            });
            router.push('/tournaments');
            return;
          }

          if (tournamentResult.status === 404) {
            toast({
              title: "Torneo no encontrado",
              description: "El torneo que buscas no existe.",
              variant: "destructive"
            });
            router.push("/tournaments");
            return;
          }

          console.error('No se pudo obtener el torneo', tournamentResult.error);
          toast({
            title: "Error",
            description: "Error al cargar el torneo.",
            variant: "destructive"
          });
          router.push("/tournaments");
          return;
        }

        const currentTournament = tournamentResult.tournament;

        if (!authenticatedUser) {
          session = readStoredSession();
          authenticatedUser = session?.user ?? null;
        }

        if (currentTournament) {
          // Check access permissions
          let canAccessTournament = false;

          if (currentTournament.registration_type === 'public') {
            // Public tournaments are accessible to everyone
            canAccessTournament = true;
          } else if (currentTournament.registration_type === 'private') {
            if (authenticatedUser) {
              // Private tournament: allow access only to owner and invited users
              canAccessTournament =
                authenticatedUser.email === currentTournament.owner_email ||
                (currentTournament.invited_users?.includes(authenticatedUser.email!) ?? false);
            } else {
              // No user logged in and it's a private tournament
              canAccessTournament = false;
            }
          }

          if (!canAccessTournament) {
            toast({
              title: "Acceso restringido",
              description: "Este torneo es privado y requiere invitación.",
              variant: "destructive"
            });
            router.push("/tournaments");
            return;
          }

          setTournament(currentTournament);

          if (authenticatedUser) {
            // Get user data from localStorage as fallback
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              setCurrentUser(userData);
            } else {
              const userData = {
                displayName: authenticatedUser.user_metadata?.full_name || authenticatedUser.email?.split('@')[0] || '',
                email: authenticatedUser.email ?? '',
                photoURL: authenticatedUser.user_metadata?.avatar_url || ''
              } satisfies User;
              setCurrentUser(userData);
              localStorage.setItem("user", JSON.stringify(userData));
            }

            setIsOwner(authenticatedUser.email === currentTournament.owner_email);

            // Check if user is participant
            const isParticipating = await db.isUserParticipating(id, authenticatedUser.email!);
            setIsParticipant(isParticipating);
          } else {
            localStorage.removeItem("user");
            setCurrentUser(null);
          }

          loadBracketData();
        }
      } catch (error) {
        console.error('Error loading tournament:', error);
        toast({
          title: "Error",
          description: "Error al cargar el torneo.",
          variant: "destructive"
        });
        router.push("/tournaments");
      } finally {
        setLoading(false);
      }
    };

    loadTournament();

    window.addEventListener('seedsAssigned', loadBracketData);
    return () => {
        window.removeEventListener('seedsAssigned', loadBracketData);
    }
  }, [id, loadBracketData, router, toast]);

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


  const handleDelete = () => {
    const allTournaments = JSON.parse(localStorage.getItem("tournaments") || "[]") as StoredTournamentShape[];
    const updatedTournaments = allTournaments.filter(t => t?.id !== id);
    localStorage.setItem("tournaments", JSON.stringify(updatedTournaments));

    const participantsData = JSON.parse(localStorage.getItem("participantsData") || "{}") as Record<string, LocalParticipant[]>;
    delete participantsData[id];
    localStorage.setItem("participantsData", JSON.stringify(participantsData));

    toast({
      title: "Torneo eliminado",
      description: `El torneo "${tournament?.name}" ha sido eliminado.`,
      variant: "destructive"
    });
    router.push("/dashboard");
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

  const handleJoinTournament = async () => {
    if (!currentUser) {
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
        email: currentUser.email,
        name: currentUser.displayName,
        avatar: currentUser.photoURL,
        status: 'Pendiente'
      });

      const refreshed = await db.getTournament(id);
      if (refreshed.tournament) {
        setTournament(refreshed.tournament);

        const storedTournaments = JSON.parse(localStorage.getItem("tournaments") || "[]") as StoredTournamentShape[];
        const storedIndex = storedTournaments.findIndex(t => t?.id === id);
        const updatedStoredTournament: StoredTournamentShape = {
          ...(storedTournaments[storedIndex] ?? {}),
          ...refreshed.tournament,
          maxParticipants: refreshed.tournament.max_participants,
          startDate: refreshed.tournament.start_date,
          startTime: refreshed.tournament.start_time,
          ownerEmail: refreshed.tournament.owner_email,
          prizePool: refreshed.tournament.prize_pool,
          registrationType: refreshed.tournament.registration_type,
          invitedUsers: refreshed.tournament.invited_users,
          dataAiHint: refreshed.tournament.data_ai_hint,
          createdAt: refreshed.tournament.created_at,
          updatedAt: refreshed.tournament.updated_at,
        };

        if (storedIndex !== -1) {
          storedTournaments[storedIndex] = updatedStoredTournament;
        } else {
          storedTournaments.push(updatedStoredTournament);
        }

        localStorage.setItem("tournaments", JSON.stringify(storedTournaments));
      }

      const participantsData = JSON.parse(localStorage.getItem("participantsData") || "{}") as Record<string, LocalParticipant[]>;
      const currentList = participantsData[id] ?? [];
      const participantIndex = currentList.findIndex(participant => participant.email === currentUser.email);
      const participantPayload: LocalParticipant = {
        email: currentUser.email,
        name: currentUser.displayName,
        avatar: currentUser.photoURL,
        status: 'Pendiente'
      };

      if (participantIndex !== -1) {
        currentList[participantIndex] = participantPayload;
      } else {
        currentList.push(participantPayload);
      }

      participantsData[id] = currentList;
      localStorage.setItem("participantsData", JSON.stringify(participantsData));

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

  const handleTournamentStatusChange = (newStatus: string) => {
    if(tournament){
        const updatedTournament = { ...tournament, status: newStatus };
        setTournament(updatedTournament);
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
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  }

  if (!tournament) {
    return <div className="text-center py-10">Torneo no encontrado.</div>;
  }
  
  const canJoin = !isOwner && !isParticipant && tournament.status !== 'En curso';

  return (
    <div className="container mx-auto py-10 px-4">
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
          <Badge className="mt-2 text-sm" variant={tournament.status === 'En curso' ? 'default' : 'secondary'}>{tournament.status}</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-6">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="participants">Participantes</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="standings">Posiciones</TabsTrigger>
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
                 <div className="flex items-center space-x-3">
                  <Trophy className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Bolsa de Premios</p>
                    <p className="text-lg text-foreground">{tournament.prize_pool || 'Por anunciar'}</p>
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
              </div>
              <div className="pt-6 border-t">
                  {canJoin && <Button size="lg" onClick={handleJoinTournament}>Unirse al Torneo</Button>}
                  {isParticipant && <Button size="lg" variant="secondary" disabled><CheckCircle2 className="mr-2 h-5 w-5"/> Ya estás inscrito</Button>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="participants" className="mt-6">
          <ParticipantsList tournamentId={id} />
        </TabsContent>
        <TabsContent value="bracket" className="mt-6">
          <Bracket tournament={tournament} isOwner={isOwner} rounds={rounds} onScoreReported={handleScoreReported} />
        </TabsContent>
        <TabsContent value="standings" className="mt-6">
          <StandingsTable rounds={rounds} />
        </TabsContent>
        {isOwner && (
          <TabsContent value="manage" className="mt-6">
            <ParticipantManager tournamentId={id} onTournamentStart={handleTournamentStatusChange}/>
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
