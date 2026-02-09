"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCoins } from "@/hooks/use-coins";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Circle, Gift, Coins, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Quest {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  reward_amount: number;
  category: string;
  completed: boolean;
  reward_claimed: boolean;
}

interface QuestSummary {
  totalQuests: number;
  completedQuests: number;
  claimableQuests: number;
  totalRewards: number;
  earnedRewards: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Primeros Pasos",
  social: "Social",
  competitive: "Competitivo",
  organizing: "Organización",
  discovery: "Descubrimiento",
};

const CATEGORY_COLORS: Record<string, string> = {
  onboarding: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  social: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  competitive: "bg-red-500/20 text-red-300 border-red-500/30",
  organizing: "bg-green-500/20 text-green-300 border-green-500/30",
  discovery: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export function ExplorationQuests() {
  const { user } = useAuth();
  const { refresh: refreshWallet } = useCoins();
  const { toast } = useToast();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [summary, setSummary] = useState<QuestSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchQuests = async () => {
    if (!user?.email) return;
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/coins/quests', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuests(data.quests || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching quests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleClaim = async (questId: string) => {
    if (!user?.email) return;
    setClaimingId(questId);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/coins/quests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'claim', questId }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "¡Recompensa reclamada!",
          description: `Has recibido ${data.reward} Duels Coins`,
        });
        await Promise.all([fetchQuests(), refreshWallet()]);
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo reclamar la recompensa",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setClaimingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const completionPercent = summary
    ? Math.round((summary.completedQuests / summary.totalQuests) * 100)
    : 0;

  // Group quests by category
  const grouped = quests.reduce<Record<string, Quest[]>>((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            Misiones de Exploración
          </CardTitle>
          <CardDescription>
            Explora la plataforma y gana Duels Coins completando misiones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">{summary?.completedQuests || 0}/{summary?.totalQuests || 0}</span>
              </div>
              <Progress value={completionPercent} className="h-2" />
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Ganado</div>
              <div className="flex items-center gap-1 font-bold text-amber-400">
                <Coins className="h-4 w-4" />
                {summary?.earnedRewards || 0} / {summary?.totalRewards || 0}
              </div>
            </div>
          </div>

          {(summary?.claimableQuests || 0) > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 text-sm text-green-400 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              ¡Tienes {summary!.claimableQuests} recompensa{summary!.claimableQuests > 1 ? 's' : ''} por reclamar!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quest Categories */}
      {Object.entries(grouped).map(([category, categoryQuests]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Badge variant="outline" className={CATEGORY_COLORS[category]}>
              {CATEGORY_LABELS[category] || category}
            </Badge>
          </h3>

          <div className="grid gap-3">
            {categoryQuests.map((quest) => (
              <Card 
                key={quest.id} 
                className={`transition-all ${
                  quest.reward_claimed 
                    ? 'opacity-60 bg-muted/30' 
                    : quest.completed 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : 'hover:border-primary/40'
                }`}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Icon */}
                  <div className="text-2xl flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {quest.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{quest.title}</h4>
                      {quest.reward_claimed && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{quest.description}</p>
                  </div>

                  {/* Reward */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-400">
                      <Coins className="h-3.5 w-3.5" />
                      +{quest.reward_amount}
                    </span>

                    {quest.completed && !quest.reward_claimed ? (
                      <Button
                        size="sm"
                        onClick={() => handleClaim(quest.id)}
                        disabled={claimingId === quest.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {claimingId === quest.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Gift className="h-4 w-4 mr-1" />
                            Reclamar
                          </>
                        )}
                      </Button>
                    ) : quest.reward_claimed ? (
                      <Badge variant="outline" className="text-green-400 border-green-500/30 text-xs">
                        Completada
                      </Badge>
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
