"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowRight, 
  Edit, 
  Gamepad2, 
  Loader2, 
  Users, 
  MapPin, 
  Calendar,
  Globe,
  User,
  MessageCircle,
  Video,
  Twitter,
  Instagram,
  Youtube
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/supabase/auth-context";
import { useUserTournaments } from "@/hooks/use-tournaments";
import { db, type Tournament, type Participant } from "@/lib/database";
import useSWR from "swr";

interface ParticipatingTournament extends Tournament {
    participantStatus: ParticipantStatus;
}

type ParticipantStatus = 'Aceptado' | 'Pendiente' | 'Rechazado';

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

const TournamentListItem = ({ tournament, isParticipating = false, participantStatus }: { 
    tournament: Tournament; 
    isParticipating?: boolean;
    participantStatus?: ParticipantStatus;
}) => {
    const getStatusVariant = (status: ParticipantStatus) => {
        switch (status) {
            case 'Aceptado':
                return 'default';
            case 'Pendiente':
                return 'secondary';
            case 'Rechazado':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const hasValidImage = tournament.image && tournament.image.trim() !== '';

    return (
        <Card className="transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row items-center space-x-4 p-4">
                {hasValidImage ? (
                    <Image 
                        src={tournament.image!} 
                        width={120} 
                        height={80} 
                        alt={tournament.name} 
                        className="rounded-md w-full sm:w-32 h-24 object-cover" 
                    />
                ) : (
                    <div className={`rounded-md w-full sm:w-32 h-24 bg-gradient-to-br ${getDefaultTournamentImage(tournament.game)} flex items-center justify-center`}>
                        <Gamepad2 className="h-8 w-8 text-white/80" />
                    </div>
                )}
                <div className="flex-grow pt-4 sm:pt-0 text-center sm:text-left">
                    <CardTitle className="text-lg">{tournament.name}</CardTitle>
                    <CardDescription className="flex items-center justify-center sm:justify-start pt-1">
                        <Gamepad2 className="mr-2 h-4 w-4"/>{tournament.game}
                    </CardDescription>
                </div>
                <div className="flex items-center space-x-4 pt-4 sm:pt-0">
                    {isParticipating && participantStatus ? (
                         <Badge variant={getStatusVariant(participantStatus)}>{participantStatus}</Badge>
                    ) : (
                        <Badge variant={tournament.status === 'En Curso' ? 'default' : 'secondary'}>{tournament.status}</Badge>
                    )}
                    <Button asChild variant="outline">
                        <Link href={`/tournaments/${tournament.id}`}>Ver <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export default function ProfilePage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const { ownedTournaments, participatingTournaments: participatingIds, isLoading: tournamentsLoading } = useUserTournaments();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const router = useRouter();

    // Fetch participant statuses for tournaments user is participating in
    const { data: participatingWithStatus = [] } = useSWR(
        user?.email && participatingIds.length > 0 
            ? `participating-status:${user.email}` 
            : null,
        async () => {
            if (!user?.email) return [];
            
            const results: { tournament: Tournament; status: ParticipantStatus }[] = [];
            
            for (const tournament of participatingIds) {
                const participants = await db.getParticipants(tournament.id);
                const userParticipant = participants.find(p => p.email === user.email);
                if (userParticipant && userParticipant.status !== 'Rechazado') {
                    results.push({
                        tournament,
                        status: userParticipant.status
                    });
                }
            }
            
            return results;
        },
        { revalidateOnFocus: false }
    );

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const handleProfileSave = async (updatedUser: { displayName: string; email: string; photoURL: string; location?: string }) => {
        await refreshUser();
        setIsEditingProfile(false);
    };

    const handleProfileCancel = () => {
        setIsEditingProfile(false);
    };

    const getInitials = (name?: string | null) => {
        if (!name) return "U";
        const names = name.split(" ");
        return names.length > 1
          ? `${names[0][0]}${names[names.length - 1][0]}`
          : names[0][0];
    };

    const loading = authLoading || tournamentsLoading;

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    // Calculate age from birth date
    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    // Format gender for display
    const formatGender = (gender?: string) => {
        const genderMap: Record<string, string> = {
            'masculino': 'Masculino',
            'femenino': 'Femenino',
            'otro': 'Otro',
            'prefiero_no_decir': 'No especificado'
        };
        return gender ? genderMap[gender] || gender : null;
    };

    // Parse favorite games into array
    const getFavoriteGamesArray = () => {
        if (!user.favoriteGames) return [];
        return user.favoriteGames.split(',').map(g => g.trim()).filter(Boolean);
    };

    // Parse platforms into array
    const getPlatformsArray = () => {
        if (!user.gamingPlatforms) return [];
        return user.gamingPlatforms.split(',').map(p => p.trim()).filter(Boolean);
    };

    const age = calculateAge(user.birthDate);
    const favoriteGames = getFavoriteGamesArray();
    const platforms = getPlatformsArray();
    const hasGamingInfo = favoriteGames.length > 0 || platforms.length > 0 || user.discordUsername || user.twitchUsername;
    const hasSocialInfo = user.twitterUsername || user.instagramUsername || user.youtubeChannel;
    const hasLocationInfo = user.location || user.country;

    // Check pending deletion status
    const DELETION_GRACE_PERIOD_DAYS = 7;
    const DELETION_GRACE_PERIOD_MS = DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    
    const getPendingDeletionInfo = () => {
        const deletionRequestedAt = user.deletionRequestedAt;
        if (!deletionRequestedAt || !user.pendingDeletion) return null;

        const requestDate = new Date(deletionRequestedAt);
        const deletionDate = new Date(requestDate.getTime() + DELETION_GRACE_PERIOD_MS);
        const now = new Date();
        const remainingMs = deletionDate.getTime() - now.getTime();

        if (remainingMs <= 0) {
            return { expired: true, remainingDays: 0, remainingHours: 0, deletionDate };
        }

        const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

        return { expired: false, remainingDays, remainingHours, deletionDate };
    };

    const pendingDeletionInfo = getPendingDeletionInfo();

    return (
        <div className="container mx-auto py-10 px-4">
            {/* Pending Deletion Warning Banner */}
            {pendingDeletionInfo && !pendingDeletionInfo.expired && (
                <Card className="mb-6 border-orange-500 bg-orange-500/10">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="h-14 w-14 rounded-full border-4 border-orange-500 flex items-center justify-center shrink-0">
                                    <span className="text-xl font-bold text-orange-600">
                                        {pendingDeletionInfo.remainingDays}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                        ⚠️ Tu cuenta está programada para eliminación
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Se eliminará el{' '}
                                        <strong>
                                            {pendingDeletionInfo.deletionDate.toLocaleDateString('es-MX', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long'
                                            })}
                                        </strong>
                                        {' '}({pendingDeletionInfo.remainingDays > 0 
                                            ? `${pendingDeletionInfo.remainingDays} días y ${pendingDeletionInfo.remainingHours} horas restantes`
                                            : `${pendingDeletionInfo.remainingHours} horas restantes`
                                        })
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant="default" 
                                className="bg-green-600 hover:bg-green-700 shrink-0"
                                onClick={() => setIsEditingProfile(true)}
                            >
                                Cancelar eliminación
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Profile Header Card */}
            <Card className="mb-8">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* Avatar */}
                        <Avatar className="h-28 w-28 ring-4 ring-primary/10">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
                            <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>

                        {/* Main Info */}
                        <div className="flex-grow space-y-2">
                            <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <h1 className="text-3xl font-bold font-headline">
                                    {user.nickname || user.displayName}
                                </h1>
                                {user.nickname && (
                                    <span className="text-muted-foreground text-sm">
                                        ({user.firstName} {user.lastName})
                                    </span>
                                )}
                            </div>
                            
                            <p className="text-muted-foreground">{user.email}</p>

                            {/* Quick Info Badges */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {hasLocationInfo && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {[user.location, user.country].filter(Boolean).join(', ')}
                                    </Badge>
                                )}
                                {age && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {age} años
                                    </Badge>
                                )}
                                {formatGender(user.gender) && user.gender !== 'prefiero_no_decir' && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {formatGender(user.gender)}
                                    </Badge>
                                )}
                            </div>

                            {/* Bio */}
                            {user.bio && (
                                <p className="text-sm text-muted-foreground pt-2 max-w-2xl">
                                    {user.bio}
                                </p>
                            )}
                        </div>

                        {/* Edit Button */}
                        <Button variant="outline" onClick={() => setIsEditingProfile(true)} className="shrink-0">
                            <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                        </Button>
                    </div>

                    {/* Gaming & Social Info */}
                    {(hasGamingInfo || hasSocialInfo) && (
                        <>
                            <Separator className="my-6" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Gaming Info */}
                                {hasGamingInfo && (
                                    <div className="space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2 text-sm">
                                            <Gamepad2 className="h-4 w-4" /> Gaming
                                        </h3>
                                        
                                        {favoriteGames.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground">Juegos Favoritos</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {favoriteGames.map((game, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {game}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {platforms.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground">Plataformas</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {platforms.map((platform, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs">
                                                            {platform}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {(user.discordUsername || user.twitchUsername) && (
                                            <div className="flex flex-wrap gap-3 pt-1">
                                                {user.discordUsername && (
                                                    <span className="text-sm flex items-center gap-1">
                                                        <MessageCircle className="h-4 w-4 text-indigo-500" />
                                                        {user.discordUsername}
                                                    </span>
                                                )}
                                                {user.twitchUsername && (
                                                    <a 
                                                        href={`https://twitch.tv/${user.twitchUsername}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm flex items-center gap-1 hover:text-purple-500 transition-colors"
                                                    >
                                                        <Video className="h-4 w-4 text-purple-500" />
                                                        {user.twitchUsername}
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Social Info */}
                                {hasSocialInfo && (
                                    <div className="space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2 text-sm">
                                            <Globe className="h-4 w-4" /> Redes Sociales
                                        </h3>
                                        
                                        <div className="flex flex-wrap gap-3">
                                            {user.twitterUsername && (
                                                <a 
                                                    href={`https://x.com/${user.twitterUsername}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm flex items-center gap-1 hover:text-blue-400 transition-colors"
                                                >
                                                    <Twitter className="h-4 w-4" />
                                                    @{user.twitterUsername}
                                                </a>
                                            )}
                                            {user.instagramUsername && (
                                                <a 
                                                    href={`https://instagram.com/${user.instagramUsername}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm flex items-center gap-1 hover:text-pink-500 transition-colors"
                                                >
                                                    <Instagram className="h-4 w-4" />
                                                    @{user.instagramUsername}
                                                </a>
                                            )}
                                            {user.youtubeChannel && (
                                                <a 
                                                    href={`https://youtube.com/${user.youtubeChannel}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm flex items-center gap-1 hover:text-red-500 transition-colors"
                                                >
                                                    <Youtube className="h-4 w-4" />
                                                    {user.youtubeChannel}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="created" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="created">Mis Torneos ({ownedTournaments.length})</TabsTrigger>
                    <TabsTrigger value="participating">Participando En ({participatingWithStatus.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="created" className="mt-6">
                    <div className="space-y-4">
                        {ownedTournaments.length > 0 ? (
                             ownedTournaments.map(t => <TournamentListItem key={t.id} tournament={t} />)
                        ) : (
                            <Card className="flex items-center justify-center h-40 flex-col gap-4">
                                <p className="text-muted-foreground">Aún no has creado ningún torneo.</p>
                                <Button asChild>
                                    <Link href="/tournaments/create">Crear uno ahora</Link>
                                </Button>
                            </Card>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="participating" className="mt-6">
                    <div className="space-y-4">
                         {participatingWithStatus.length > 0 ? (
                             participatingWithStatus.map(({ tournament, status }) => (
                                <TournamentListItem 
                                    key={tournament.id} 
                                    tournament={tournament} 
                                    isParticipating 
                                    participantStatus={status}
                                />
                             ))
                        ) : (
                             <Card className="flex items-center justify-center h-40 flex-col gap-4">
                                <p className="text-muted-foreground">No estás participando en ningún torneo.</p>
                                <Button asChild variant="outline">
                                    <Link href="/tournaments">Explorar torneos</Link>
                                </Button>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Edit Profile Dialog */}
            <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Perfil</DialogTitle>
                    </DialogHeader>
                    {user && (
                        <EditProfileForm
                            user={user}
                            onSave={handleProfileSave}
                            onCancel={handleProfileCancel}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
