"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckCircle, XCircle, FileText, Eye, Hammer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DisputeManagerProps {
    tournamentId: string;
}

export function DisputeManager({ tournamentId }: DisputeManagerProps) {
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isResolving, setIsResolving] = useState(false);
    const supabase = createClient();
    const { toast } = useToast();

    useEffect(() => {
        fetchDisputes();
        // Subscribe to actual match_rooms updates
        const channel = supabase
            .channel(`tournament-disputes-${tournamentId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'match_rooms',
                filter: `tournament_id=eq.${tournamentId}` 
            }, () => {
                fetchDisputes();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tournamentId]);

    const fetchDisputes = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('match_rooms')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('status', 'dispute')
            .order('created_at', { ascending: false });
        
        if (data) setDisputes(data);
        setLoading(false);
    };

    const resolveDispute = async (matchRoomId: string, winnerSlot: 1 | 2) => {
        setIsResolving(true);
        try {
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            
            // 1. Update the match room
            const { error: matchError } = await supabase
                .from('match_rooms')
                .update({ 
                    status: 'finished',
                    conflict_resolved_by: adminUser?.email,
                    updated_at: new Date().toISOString()
                })
                .eq('id', matchRoomId);

            if (matchError) throw matchError;

            // 3. Feed to AI Training Dataset (Ground Truth)
            const dispute = disputes.find(d => d.id === matchRoomId);
            if (dispute) {
                await supabase.from('ai_labeling_samples').insert({
                    match_id: dispute.match_id,
                    screenshot_url: winnerSlot === 1 ? dispute.p1_evidence_url : dispute.p2_evidence_url,
                    predicted_p1_score: dispute.p1_score || 0,
                    predicted_p2_score: dispute.p2_score || 0,
                    labeled_p1_score: winnerSlot === 1 ? (dispute.p1_score || 0) : (dispute.p1_score || 0), // Simplifying for the demo
                    labeled_p2_score: winnerSlot === 2 ? (dispute.p2_score || 0) : (dispute.p2_score || 0),
                    status: 'labeled',
                    labeled_by: adminUser?.email,
                    labeled_at: new Date().toISOString()
                });
            }

            // 2. Logic to update the bracket data would go here (usually calling an RPC to advance the winner)
            // For now we toast and refresh
            toast({ 
                title: "Conflicto Resuelto", 
                description: `Se ha marcado al Jugador ${winnerSlot} como ganador.` 
            });
            
            fetchDisputes();
        } catch (err: any) {
            toast({ title: "Error al resolver", description: err.message, variant: "destructive" });
        } finally {
            setIsResolving(false);
        }
    };

    if (loading && disputes.length === 0) return null;
    if (disputes.length === 0) return null;

    return (
        <Card className="border-amber-500/50 bg-amber-500/5 backdrop-blur-sm animate-pulse-slow">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase text-amber-500 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" /> Centro de Arbitraje Local
                </CardTitle>
                <CardDescription className="text-xs text-amber-700/70">
                    Hay partidas con reportes contradictorios que requieren tu intervención manual.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {disputes.map((dispute) => (
                    <div key={dispute.id} className="p-4 border border-amber-500/20 bg-background/50 rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono opacity-50">MATCH #{dispute.match_id}</span>
                            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600">PENDIENTE DE JUEZ</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Player 1 */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-blue-500">P1: {dispute.player_1_email.split('@')[0]}</p>
                                <div className="aspect-video bg-muted rounded border border-border/50 overflow-hidden relative group">
                                    {dispute.p1_evidence_url ? (
                                        <>
                                            <img src={dispute.p1_evidence_url} className="w-full h-full object-cover" />
                                            <Button 
                                                size="icon" 
                                                variant="secondary" 
                                                className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => window.open(dispute.p1_evidence_url)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-[9px] text-muted-foreground uppercase">Sin Evidencia</div>
                                    )}
                                </div>
                                <Button 
                                    size="sm" 
                                    className="w-full h-7 text-[9px] bg-blue-600 hover:bg-blue-700"
                                    disabled={isResolving}
                                    onClick={() => resolveDispute(dispute.id, 1)}
                                >
                                    DAR VICTORIA A P1
                                </Button>
                            </div>

                            {/* Player 2 */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-rose-500">P2: {dispute.player_2_email.split('@')[0]}</p>
                                <div className="aspect-video bg-muted rounded border border-border/50 overflow-hidden relative group">
                                    {dispute.p2_evidence_url ? (
                                        <>
                                            <img src={dispute.p2_evidence_url} className="w-full h-full object-cover" />
                                            <Button 
                                                size="icon" 
                                                variant="secondary" 
                                                className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => window.open(dispute.p2_evidence_url)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-[9px] text-muted-foreground uppercase">Sin Evidencia</div>
                                    )}
                                </div>
                                <Button 
                                    size="sm" 
                                    className="w-full h-7 text-[9px] bg-rose-600 hover:bg-rose-700"
                                    disabled={isResolving}
                                    onClick={() => resolveDispute(dispute.id, 2)}
                                >
                                    DAR VICTORIA A P2
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
