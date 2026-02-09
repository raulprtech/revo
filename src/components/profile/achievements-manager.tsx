"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock, Trophy, Sparkles, Gamepad2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, type AwardedBadge, type AchievementDefinition } from "@/lib/database";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/supabase/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Helpers ───────────────────────────────────

function getRarityLabel(rarity: string) {
    switch (rarity) {
        case 'common': return 'Común';
        case 'rare': return 'Raro';
        case 'epic': return 'Épico';
        case 'legendary': return 'Legendario';
        default: return rarity;
    }
}

function getSourceLabel(source: string) {
    switch (source) {
        case 'achievement': return 'Logro';
        case 'tournament_prize': return 'Torneo';
        case 'event_prize': return 'Evento';
        case 'admin_grant': return 'Admin';
        default: return 'Recompensa';
    }
}

const RARITY_CARD_STYLES: Record<string, string> = {
    common: "border-border",
    rare: "border-blue-500/30 bg-blue-500/5",
    epic: "border-purple-500/30 bg-purple-500/5",
    legendary: "border-yellow-500/30 bg-yellow-500/5",
};

const RARITY_TEXT_STYLES: Record<string, string> = {
    common: "",
    rare: "text-blue-500",
    epic: "text-purple-500",
    legendary: "text-yellow-500",
};

// ─── Main Component ────────────────────────────

export function AchievementsManager({ onUpdate }: { onUpdate?: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [userBadges, setUserBadges] = useState<AwardedBadge[]>([]);
    const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
    const [equippedBadge, setEquippedBadge] = useState<AwardedBadge | null>(null);
    const [loading, setLoading] = useState(true);
    const [equippingId, setEquippingId] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.email) return;
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user?.email) return;
        try {
            setLoading(true);
            const [badges, achDefs, currentEquipped] = await Promise.all([
                db.getUserBadges(user.email),
                db.getAchievementDefinitions(),
                db.getEquippedBadge(user.email),
            ]);
            setUserBadges(badges);
            setAchievements(achDefs);
            setEquippedBadge(currentEquipped);
        } catch (error) {
            console.error("Error loading achievements:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los logros.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEquip = async (badge: AwardedBadge) => {
        if (!user?.email) return;
        try {
            setEquippingId(badge.id);
            const { success, error } = await db.equipBadge(user.email, badge.id);
            if (!success) throw new Error(error);

            setEquippedBadge(badge);
            toast({
                title: "Logro equipado",
                description: `Ahora muestras: ${badge.badge.name}`,
            });
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo equipar el logro.",
            });
        } finally {
            setEquippingId(null);
        }
    };

    const handleUnequip = async () => {
        if (!user?.email) return;
        try {
            setEquippingId("unequip");
            const { success, error } = await db.unequipBadge(user.email);
            if (!success) throw new Error(error);

            setEquippedBadge(null);
            toast({
                title: "Logro removido",
                description: "Ya no muestras ningún logro en tu perfil.",
            });
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo remover el logro.",
            });
        } finally {
            setEquippingId(null);
        }
    };

    // Locked achievements: definitions the user doesn't have yet
    const lockedAchievements = achievements.filter(
        (ach) => !userBadges.some((b) => b.badge.name === ach.title.name && b.source_type === 'achievement')
    );

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-40 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <Tabs defaultValue="collection" className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                <TabsList>
                    <TabsTrigger value="collection">
                        Colección ({userBadges.length})
                    </TabsTrigger>
                    <TabsTrigger value="achievements">
                        Por desbloquear ({lockedAchievements.length})
                    </TabsTrigger>
                </TabsList>

                {equippedBadge && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border">
                        <span>Equipado:</span>
                        <span className="font-bold">
                            {equippedBadge.badge.icon} {equippedBadge.badge.name}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Collection Tab ── */}
            <TabsContent value="collection" className="space-y-4">
                {userBadges.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userBadges.map((ab) => {
                            const isEquipped = equippedBadge?.id === ab.id;
                            return (
                                <BadgeCard
                                    key={ab.id}
                                    badge={ab}
                                    isEquipped={isEquipped}
                                    onEquip={() => handleEquip(ab)}
                                    loading={equippingId === ab.id}
                                />
                            );
                        })}
                    </div>
                )}

                {equippedBadge && (
                    <div className="flex justify-center mt-6">
                        <Button
                            variant="outline"
                            onClick={handleUnequip}
                            disabled={!!equippingId}
                        >
                            {equippingId === "unequip" && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Quitar logro del perfil
                        </Button>
                    </div>
                )}
            </TabsContent>

            {/* ── Locked Achievements Tab ── */}
            <TabsContent value="achievements">
                <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-medium">Logros por desbloquear</h3>
                    <p className="text-sm text-muted-foreground">
                        Completa estos desafíos para ganar nuevos logros.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lockedAchievements.map((ach) => (
                        <LockedAchievementCard key={ach.id} achievement={ach} />
                    ))}
                    {lockedAchievements.length === 0 && userBadges.length > 0 && (
                        <div className="col-span-full text-center py-12">
                            <Sparkles className="mx-auto h-12 w-12 text-yellow-500 mb-3" />
                            <h3 className="text-lg font-medium">¡Todo desbloqueado!</h3>
                            <p className="text-muted-foreground">
                                Has conseguido todos los logros disponibles actualmente.
                            </p>
                        </div>
                    )}
                </div>
            </TabsContent>
        </Tabs>
    );
}

// ─── Sub-components ────────────────────────────

function EmptyState() {
    return (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium text-foreground">Sin logros aún</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
                Participa en torneos y completa desafíos para ganar logros que
                podrás exhibir en tu perfil.
            </p>
        </div>
    );
}

function BadgeCard({
    badge,
    isEquipped,
    onEquip,
    loading,
}: {
    badge: AwardedBadge;
    isEquipped: boolean;
    onEquip: () => void;
    loading: boolean;
}) {
    const cardStyle = RARITY_CARD_STYLES[badge.rarity] || RARITY_CARD_STYLES.common;
    const textStyle = RARITY_TEXT_STYLES[badge.rarity] || "";

    return (
        <Card
            className={cn(
                "relative overflow-hidden transition-all",
                cardStyle,
                isEquipped && "ring-2 ring-primary ring-offset-2"
            )}
        >
            {isEquipped && (
                <div className="absolute top-2 right-2 z-10">
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        Equipado
                    </Badge>
                </div>
            )}

            <CardHeader className="pb-2">
                <div className="text-3xl mb-2">{badge.badge.icon}</div>
                <CardTitle className="flex items-center gap-2">
                    <span className={cn("font-bold", textStyle)}>
                        {badge.badge.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {getRarityLabel(badge.rarity)}
                    </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 flex-wrap">
                    <span>{new Date(badge.awarded_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{getSourceLabel(badge.source_type)}</span>
                    {badge.tournament_name && (
                        <>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{badge.tournament_name}</span>
                        </>
                    )}
                    {badge.game && (
                        <>
                            <span>•</span>
                            <Gamepad2 className="h-3 w-3 inline" />
                            <span>{badge.game}</span>
                        </>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4 min-h-[32px]">
                    {badge.badge.description || "Un logro para tu colección."}
                </p>

                {badge.position && (
                    <div className="mb-3">
                        <Badge variant="secondary">
                            Posición: #{badge.position}
                        </Badge>
                    </div>
                )}

                <Button
                    className="w-full"
                    variant={isEquipped ? "outline" : "default"}
                    disabled={isEquipped || loading}
                    onClick={onEquip}
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isEquipped ? "Seleccionado" : "Equipar como título"}
                </Button>
            </CardContent>
        </Card>
    );
}

function LockedAchievementCard({ achievement }: { achievement: AchievementDefinition }) {
    const rarity = achievement.title.rarity || 'common';
    return (
        <Card className="opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all border-dashed">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="text-3xl mb-2 text-muted-foreground">
                        {achievement.title.icon}
                    </div>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle>{achievement.title.name}</CardTitle>
                <CardDescription>
                    {getRarityLabel(rarity)}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    {achievement.title.description || "Completa el logro para desbloquear."}
                </p>
                <div className="mt-4 pt-2 border-t border-border/50">
                    <p className="text-xs font-mono text-primary truncate">
                        {achievement.achievement_type.replace(/_/g, " ")}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
