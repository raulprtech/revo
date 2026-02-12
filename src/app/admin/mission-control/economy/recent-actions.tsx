"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    BrainCircuit, 
    Calendar, 
    Coins, 
    ArrowRight,
    TrendingDown,
    Activity
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function RecentBurnActions() {
    const [actions, setActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchActions();
    }, []);

    const fetchActions = async () => {
        const { data, error } = await supabase
            .from('ai_conversations')
            .select('*')
            .eq('feature_name', 'burn_master')
            .order('created_at', { ascending: false })
            .limit(5);

        if (!error) setActions(data || []);
        setLoading(false);
    };

    return (
        <Card className="bg-slate-950 border-indigo-500/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-400" /> Registro de Estrategias AI
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                    Últimas intervenciones del Burn Master
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
                    </div>
                ) : actions.length === 0 ? (
                    <p className="text-[10px] text-center italic text-muted-foreground py-4 uppercase">
                        Sin intervenciones recientes
                    </p>
                ) : (
                    actions.map((action) => {
                        const strategy = action.response;
                        const isMulti = strategy.type === "multi_day_event";
                        
                        return (
                            <div key={action.id} className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase border-indigo-500/50 text-indigo-400">
                                        {isMulti ? "Multi-Day Event" : "Single Tournament"}
                                    </Badge>
                                    <span className="text-[9px] text-muted-foreground font-mono">
                                        {format(new Date(action.created_at), 'HH:mm - dd MMM', { locale: es })}
                                    </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-200">
                                    {isMulti ? strategy.event_name : strategy.tournament_config.name}
                                </p>
                                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                    <TrendingDown className="h-3 w-3 text-rose-400" />
                                    <span>Planificado: </span>
                                    <span className="font-bold text-rose-400">
                                        {isMulti ? `~${strategy.target_burn_goal}` : `~${strategy.estimated_burn}`} DC
                                    </span>
                                </div>
                                <div className="text-[9px] italic opacity-70 border-t border-white/5 pt-2 mt-1">
                                    "{strategy.reasoning.substring(0, 100)}..."
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
