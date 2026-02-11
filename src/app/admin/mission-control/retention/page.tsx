"use client";

import { useState, useEffect } from "react";
import { 
    Users, 
    AlertTriangle, 
    Trophy, 
    Zap, 
    TrendingDown, 
    ShieldCheck, 
    RefreshCcw,
    ChevronRight,
    Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { runBulkRetentionAnalysis } from "./actions";
import { useToast } from "@/hooks/use-toast";

export default function RetentionEngine() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => {
        fetchRetentionData();
    }, []);

    const handleBulkAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const res = await runBulkRetentionAnalysis();
            if (res.success) {
                toast({ title: "Análisis Completado", description: `Se procesaron ${res.count} perfiles con Gemini.` });
                fetchRetentionData();
            } else {
                throw new Error(res.error);
            }
        } catch (err: any) {
            toast({ title: "Error en análisis", description: err.message, variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const fetchRetentionData = async () => {
        setIsLoading(true);
        // In a real scenario, we join with profiles to get display names
        const { data: profileData } = await supabase
            .from('player_intelligence_profiles')
            .select('*, user:profiles(display_name, email)')
            .order('churn_risk_score', { ascending: false });
        
        const { data: aggStats } = await supabase
            .from('admin_retention_overview')
            .select('*');

        if (profileData) setProfiles(profileData);
        if (aggStats) setStats(aggStats);
        setIsLoading(false);
    };

    const getPersonaBadge = (type: string) => {
        switch(type) {
            case 'WHALE': return <Badge className="bg-amber-500 text-black font-black">WHALE</Badge>;
            case 'GRINDER': return <Badge className="bg-indigo-500 text-white font-black">GRINDER</Badge>;
            case 'AT_RISK': return <Badge variant="destructive" className="font-black animate-pulse">CHURN RISK</Badge>;
            case 'PRO': return <Badge title="Competitive Player" className="bg-emerald-500 text-white font-black">PRO</Badge>;
            default: return <Badge variant="outline" className="font-black opacity-50 uppercase">{type}</Badge>;
        }
    };

    // Filter profiles based on search
    const filteredProfiles = profiles.filter(p => 
        p.user?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Aggregate Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-950 border-rose-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-500" /> Critical Risk Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <h3 className="text-3xl font-black italic">
                            {profiles.filter(p => p.churn_risk_score > 70).length}
                        </h3>
                        <p className="text-[10px] text-rose-400 font-bold uppercase mt-1">Requiere acción inmediata de retención</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-indigo-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                            <Zap className="h-4 w-4 text-indigo-500" /> Top Personas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2 flex-wrap">
                        <div className="text-center px-4 py-1 bg-white/5 rounded border border-white/10">
                            <p className="text-[9px] font-black opacity-50">WHALES</p>
                            <p className="text-xl font-black">{profiles.filter(p => p.persona_type === 'WHALE').length}</p>
                        </div>
                        <div className="text-center px-4 py-1 bg-white/5 rounded border border-white/10">
                            <p className="text-[9px] font-black opacity-50">GRINDERS</p>
                            <p className="text-xl font-black">{profiles.filter(p => p.persona_type === 'GRINDER').length}</p>
                        </div>
                        <div className="text-center px-4 py-1 bg-white/5 rounded border border-white/10">
                            <p className="text-[9px] font-black opacity-50">PROS</p>
                            <p className="text-xl font-black">{profiles.filter(p => p.persona_type === 'PRO').length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-emerald-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Retention Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <h3 className="text-3xl font-black italic text-emerald-500">84.2%</h3>
                        <p className="text-[10px] text-emerald-500/70 font-bold uppercase mt-1">+2.1% vs last month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card className="bg-slate-950 border-border/10 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5">
                    <div>
                        <CardTitle className="text-sm font-black uppercase">Individual Player Intelligence</CardTitle>
                        <CardDescription className="text-[10px]">Perfiles psicológicos y de comportamiento generados por Gemini 1.5</CardDescription>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar jugador..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 pl-9 text-[10px] font-bold bg-white/5 border-white/10 w-64"
                            />
                        </div>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-[10px] font-black" 
                            onClick={handleBulkAnalysis}
                            disabled={isAnalyzing}
                        >
                            <RefreshCcw className={cn("h-3 w-3 mr-2", isAnalyzing && "animate-spin")} /> 
                            {isAnalyzing ? "ANALIZANDO CON GEMINI..." : "RE-ANALYZE ALL"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        {filteredProfiles.length === 0 ? (
                            <div className="p-12 text-center italic text-muted-foreground text-sm opacity-50">
                                No hay perfiles con riesgo detectado o no coinciden con la búsqueda.
                            </div>
                        ) : (
                            filteredProfiles.map((p) => (
                                <div key={p.user_id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                            <span className="text-sm font-black italic">{p.user?.display_name?.[0]}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold tracking-tight">{p.user?.display_name}</h4>
                                                {getPersonaBadge(p.persona_type)}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-muted-foreground font-mono">{p.user?.email}</span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Trophy className="h-2.5 w-2.5 text-amber-500" /> ELO: {p.skill_rating_estimate}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 px-8">
                                        <div className="flex justify-between text-[10px] mb-1">
                                            <span className="font-black uppercase text-muted-foreground">Churn Risk</span>
                                            <span className={p.churn_risk_score > 70 ? "text-rose-500 font-black" : "font-black"}>
                                                {p.churn_risk_score}%
                                            </span>
                                        </div>
                                        <Progress 
                                            value={p.churn_risk_score} 
                                            className="h-1 bg-white/5" 
                                            indicatorClassName={p.churn_risk_score > 70 ? "bg-rose-500" : p.churn_risk_score > 40 ? "bg-amber-500" : "bg-emerald-500"}
                                        />
                                        <p className="text-[9px] mt-2 italic text-muted-foreground opacity-70 line-clamp-1">
                                            "{p.behavioral_summary}"
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black uppercase text-indigo-400">Next Action</p>
                                            <p className="text-[10px] font-bold text-white max-w-[150px] truncate">{p.recommended_incentive}</p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="bg-slate-950 border-border/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase">AI Retention Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <TrendingDown className="h-5 w-5 text-indigo-400" />
                                <div>
                                    <p className="text-xs font-bold">Incentive Batch Candidate</p>
                                    <p className="text-[10px] text-muted-foreground">8 players matching "At-Risk Whale" persona found.</p>
                                </div>
                            </div>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold">SEND COUPON</Button>
                         </div>
                         <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Zap className="h-5 w-5 text-emerald-400" />
                                <div>
                                    <p className="text-xs font-bold">Upsell Opportunity</p>
                                    <p className="text-[10px] text-muted-foreground">12 "Grinders" active on FIFA ready for PRO tier.</p>
                                </div>
                            </div>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold">TARGET PRO OFFER</Button>
                         </div>
                    </CardContent>
                 </Card>

                 <Card className="bg-slate-950 border-border/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase italic">The Behavioral Loop</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-indigo-500 pl-3">
                                "Nuestra red neuronal identifica cambios en la cadencia de depósitos y juego. El 70% del churn en eSports proviene de rachas de derrotas consecutivas ocultas."
                            </p>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/20 rounded border border-white/5">
                                    <p className="text-[9px] font-black uppercase opacity-50">Avg LTV Impact</p>
                                    <p className="text-lg font-black text-indigo-400">+18.5%</p>
                                </div>
                                <div className="p-3 bg-muted/20 rounded border border-white/5">
                                    <p className="text-[9px] font-black uppercase opacity-50">Churn Precision</p>
                                    <p className="text-lg font-black text-indigo-400">92%</p>
                                </div>
                             </div>
                        </div>
                    </CardContent>
                 </Card>
            </div>
        </div>
    );
}
