"use client";

import { useState, useEffect } from "react";
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
  Youtube,
  Zap,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { CompetitiveProfile } from "@/components/profile/competitive-profile";
import { MatchHistory, type TournamentHistoryEntry } from "@/components/profile/match-history";
import { AchievementsManager } from "@/components/profile/achievements-manager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/supabase/auth-context";
import { useSubscription } from "@/lib/subscription";
import { useUserTournaments } from "@/hooks/use-tournaments";
import { db, type Tournament, type Participant, type AwardedBadge } from "@/lib/database";
import useSWR from "swr";
import { getDefaultTournamentImage, cn } from "@/lib/utils";
import { coinsService } from "@/lib/coins";
import type { CosmeticItem, CosmeticCategory } from "@/types/coins";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/types/coins";

interface ParticipatingTournament extends Tournament {
    participantStatus: ParticipantStatus;
}

type ParticipantStatus = 'Aceptado' | 'Pendiente' | 'Rechazado';

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
    const { isPro } = useSubscription();
    const { ownedTournaments, participatingTournaments: participatingIds, isLoading: tournamentsLoading } = useUserTournaments();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [equippedBadge, setEquippedBadge] = useState<AwardedBadge | null>(null);
    const [equippedCosmetics, setEquippedCosmetics] = useState<Record<string, CosmeticItem | null>>({});

    const refreshEquipped = async () => {
        if (!user?.email) return;
        const badge = await db.getEquippedBadge(user.email);
        setEquippedBadge(badge);
    };

    useEffect(() => {
        refreshEquipped();
        // Fetch equipped cosmetics
        if (user?.email) {
            coinsService.getEquippedCosmetics(user.email).then(setEquippedCosmetics);
        }
    }, [user]);

    // Fetch user's earned badges
    const { data: userBadges = [] } = useSWR<AwardedBadge[]>(
        user?.email ? `user-badges:${user.email}` : null,
        async () => {
            if (!user?.email) return [];
            return await db.getUserBadges(user.email);
        },
        { revalidateOnFocus: false }
    );

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

    // Note: Route protection is handled by middleware.
    // The useAuth() hook is used here only for user data display.

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

    // Build match history entries: merge participating tournaments with their badges
    const matchHistoryEntries: TournamentHistoryEntry[] = [
        ...participatingWithStatus.map(({ tournament, status }) => {
            const badge = userBadges.find(b => b.tournament_id === tournament.id);
            return { tournament, status, badge } as TournamentHistoryEntry;
        }),
        // Also include owned tournaments that aren't already in participating
        ...ownedTournaments
            .filter(t => !participatingWithStatus.some(p => p.tournament.id === t.id))
            .map(t => {
                const badge = userBadges.find(b => b.tournament_id === t.id);
                return { tournament: t, status: 'Aceptado' as const, badge } as TournamentHistoryEntry;
            }),
    ];

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
            <Card className="mb-8 overflow-hidden">
                {/* Profile Banner */}
                {equippedCosmetics.profile_banner && (() => {
                    const bannerMeta = equippedCosmetics.profile_banner!.metadata || {};
                    const gradient = (bannerMeta.gradient as string[]) || ['#6366f1', '#8b5cf6'];
                    const pattern = bannerMeta.pattern;
                    const isAnimated = bannerMeta.animated;
                    return (
                        <div
                            className="h-24 md:h-32 relative"
                            style={{ background: `linear-gradient(135deg, ${gradient.join(', ')})` }}
                        >
                            {pattern === 'stars' && (
                                <div className="absolute inset-0 opacity-50">
                                    {[...Array(20)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`absolute w-1 h-1 bg-white rounded-full ${isAnimated ? 'animate-pulse' : ''}`}
                                            style={{
                                                left: `${(i * 17 + 5) % 100}%`,
                                                top: `${(i * 23 + 10) % 100}%`,
                                                animationDelay: `${(i * 0.3) % 2}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}
                <CardContent className={`p-6 ${equippedCosmetics.profile_banner ? '-mt-14' : ''}`}>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* Avatar with optional frame */}
                        {(() => {
                            const frameMeta = equippedCosmetics.bracket_frame?.metadata;
                            const avatarMeta = equippedCosmetics.avatar_collection?.metadata;
                            const dicebearStyle = avatarMeta?.dicebear_style;
                            // Use first seed from collection, or user's name as seed
                            const avatarSeed = avatarMeta?.seeds?.[0] || user.displayName || 'user';
                            const avatarSrc = dicebearStyle
                                ? `https://api.dicebear.com/9.x/${dicebearStyle}/svg?seed=${encodeURIComponent(avatarSeed)}`
                                : user.photoURL || undefined;

                            const frameStyle: React.CSSProperties = frameMeta
                                ? frameMeta.gradient
                                    ? {
                                        border: '4px solid transparent',
                                        backgroundImage: `linear-gradient(var(--card), var(--card)), linear-gradient(135deg, ${(frameMeta.gradient as string[]).join(', ')})`,
                                        backgroundOrigin: 'border-box',
                                        backgroundClip: 'padding-box, border-box',
                                        ...(frameMeta.glow ? { boxShadow: `0 0 16px ${frameMeta.glow_color || '#FFD700'}40` } : {}),
                                    }
                                    : {
                                        border: `4px solid ${frameMeta.border_color || '#FFD700'}`,
                                        ...(frameMeta.glow ? { boxShadow: `0 0 16px ${frameMeta.glow_color || frameMeta.border_color || '#FFD700'}40` } : {}),
                                    }
                                : {};

                            return (
                                <Avatar
                                    className={`h-28 w-28 ${!frameMeta ? 'ring-4 ring-primary/10' : ''} ${frameMeta?.border_style === 'animated' ? 'animate-pulse' : ''}`}
                                    style={frameStyle}
                                >
                                    <AvatarImage src={avatarSrc} alt={user.displayName || ''} />
                                    <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
                                </Avatar>
                            );
                        })()}

                        {/* Main Info */}
                        <div className="flex-grow space-y-2">
                            <div className="flex flex-col md:flex-row md:items-center gap-2">
                                {(() => {
                                    const nickMeta = equippedCosmetics.nickname_color?.metadata;
                                    const nickStyle: React.CSSProperties = nickMeta
                                        ? nickMeta.gradient
                                            ? {
                                                backgroundImage: `linear-gradient(90deg, ${(nickMeta.colors as string[] || ['#FFD700']).join(', ')})`,
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                            }
                                            : { color: nickMeta.color || '#FFD700' }
                                        : {};
                                    return (
                                        <h1
                                            className={`text-3xl font-bold font-headline ${nickMeta?.animated ? 'animate-pulse' : ''}`}
                                            style={nickStyle}
                                        >
                                            {user.nickname || user.displayName}
                                        </h1>
                                    );
                                })()}
                                {isPro && (
                                    <Badge className="bg-primary text-primary-foreground text-xs">
                                        <Zap className="h-3 w-3 mr-1" /> PLUS
                                    </Badge>
                                )}
                                {user.nickname && (
                                    <span className="text-muted-foreground text-sm">
                                        ({user.firstName} {user.lastName})
                                    </span>
                                )}
                            </div>

                            {equippedBadge && (
                                <div className="mt-1">
                                    <span className="font-bold text-sm inline-flex items-center gap-1">
                                        {equippedBadge.badge.icon} {equippedBadge.badge.name}
                                    </span>
                                </div>
                            )}
                            
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

            {/* Logros y Colección */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-xl">🏆</span>
                            Logros y Medallas
                        </CardTitle>
                        <CardDescription>
                            Tus medallas ganadas en torneos. Equípala para mostrarla en tu perfil.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AchievementsManager onUpdate={refreshEquipped} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                <Sparkles className="h-5 w-5 text-amber-400" />
                                Mi Inventario
                            </CardTitle>
                            <CardDescription>
                                Estética y personalización premium
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10">
                            <Link href="/coins">
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                Tienda
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {(['avatar_collection', 'bracket_frame', 'profile_banner', 'nickname_color'] as CosmeticCategory[]).map((cat) => (
                                    <div 
                                        key={cat}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:bg-muted/50 group cursor-pointer",
                                            equippedCosmetics[cat] ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                                        )}
                                        onClick={() => window.location.href = '/coins?inventory=true'}
                                    >
                                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                                            {CATEGORY_ICONS[cat]}
                                        </span>
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground group-hover:text-foreground">
                                            {CATEGORY_LABELS[cat]}
                                        </span>
                                        {equippedCosmetics[cat] ? (
                                            <Badge variant="secondary" className="mt-2 h-4 px-1.5 text-[8px] bg-emerald-500/10 text-emerald-400 border-none">ACTIVO</Badge>
                                        ) : (
                                            <span className="mt-2 text-[8px] text-muted-foreground italic font-medium">No equipado</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="w-full text-xs h-9" asChild>
                                <Link href="/coins?inventory=true">
                                    Ver Inventario Completo
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Competitive Profile & Match History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <CompetitiveProfile
                    ownedTournaments={ownedTournaments}
                    participatingTournaments={participatingWithStatus.map(p => p.tournament)}
                    badges={userBadges}
                />
                <MatchHistory entries={matchHistoryEntries} />
            </div>

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
