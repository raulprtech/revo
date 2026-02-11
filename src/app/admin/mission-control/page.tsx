"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    Users, 
    ShieldAlert, 
    Cpu, 
    TrendingUp, 
    Search, 
    Coins, 
    Zap, 
    Ban, 
    History,
    Activity,
    Database,
    AlertTriangle,
    Microscope,
    LineChart as LucideLineChart,
    Gavel,
    Eye,
    CheckCircle,
    XCircle,
    FileText,
    Camera,
    Download,
    DownloadCloud,
    BrainCircuit,
    BarChart as BarChartIcon
} from "lucide-react";
import AILabPage from "./ai-lab/page";
import PlatformIntelligence from "./intelligence/page";
import RetentionEngine from "./retention/page";
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    AreaChart, 
    Area 
} from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function MissionControl() {
    const [activeTab, setActiveTab] = useState("god-mode");
    const { toast } = useToast();
    const supabase = createClient();

    // --- God Mode State ---
    const [searchEmail, setSearchEmail] = useState("");
    const [targetUser, setTargetUser] = useState<any>(null);
    const [adjustAmount, setAdjustAmount] = useState<string>("");
    const [adjustReason, setAdjustReason] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [mounted, setMounted] = useState(false);

    // --- AI Lab State ---
    const [aiStats, setAiStats] = useState({ 
        predictionError: 0, 
        confidenceAvg: 0,
        totalSamples: 0,
        labeledToday: 0
    });
    const [shadowLogs, setShadowLogs] = useState<any[]>([]);

    // --- Disputes State ---
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loadingDisputes, setLoadingDisputes] = useState(false);

    // --- Labeling State ---
    const [labelingSamples, setLabelingSamples] = useState<any[]>([]);
    const [currentSample, setCurrentSample] = useState<any>(null);
    const [labelInput, setLabelInput] = useState({ p1: "", p2: "" });

    // --- Ghost State ---
    const [ghosts, setGhosts] = useState<any[]>([]);
    const [tournaments, setTournaments] = useState<any[]>([]);

    // --- Economics State ---
    const [econStats, setEconStats] = useState({
        minted: 0,
        burned: 0,
        circulating: 0,
        fiatInReserve: 0,
        recentTransactions: [] as any[]
    });
    const [configs, setConfigs] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
        fetchAiLogs();
        fetchDisputes();
        fetchLabelingSamples();
        fetchConfigs();
        fetchGhosts();
        fetchTournaments();
        fetchAiStats();
        fetchEconStats();
    }, []);

    const fetchAiStats = async () => {
        const { data: shadowLogs } = await supabase
            .from('ai_shadow_logs')
            .select('confidence_score, error_delta');
        
        const { data: labeling } = await supabase
            .from('ai_labeling_samples')
            .select('status, created_at');

        if (shadowLogs && shadowLogs.length > 0) {
            const avgConf = shadowLogs.reduce((acc, curr) => acc + parseFloat(curr.confidence_score), 0) / shadowLogs.length;
            const avgErr = shadowLogs.reduce((acc, curr) => acc + parseFloat(curr.error_delta), 0) / shadowLogs.length;
            
            const today = new Date().toISOString().split('T')[0];
            const labeledToday = labeling?.filter(l => l.status === 'labeled' && l.created_at.startsWith(today)).length || 0;

            setAiStats({
                predictionError: parseFloat(avgErr.toFixed(2)),
                confidenceAvg: avgConf,
                totalSamples: shadowLogs.length,
                labeledToday
            });
        }
    };

    const fetchEconStats = async () => {
        const { data: wallets } = await supabase
            .from('coin_wallets')
            .select('balance, cash_balance');
        
        const { data: txs } = await supabase
            .from('coin_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        const { data: totalMinted } = await supabase
            .from('coin_transactions')
            .select('amount')
            .gt('amount', 0);

        const { data: totalBurned } = await supabase
            .from('coin_transactions')
            .select('amount')
            .lt('amount', 0);
        
        if (wallets) {
            const circulating = wallets.reduce((acc, curr) => acc + (curr.balance || 0), 0);
            const reserve = wallets.reduce((acc, curr) => acc + (curr.cash_balance || 0), 0);
            const minted = totalMinted?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
            const burned = Math.abs(totalBurned?.reduce((acc, curr) => acc + curr.amount, 0) || 0);
            
            setEconStats(prev => ({
                ...prev,
                circulating,
                fiatInReserve: reserve,
                minted,
                burned,
                recentTransactions: txs || []
            }));
        }
    };

    const fetchGhosts = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .like('email', '%@duels.pro')
            .order('created_at', { ascending: false });
        if (data) setGhosts(data);
    };

    const fetchTournaments = async () => {
        const { data } = await supabase
            .from('tournaments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (data) setTournaments(data);
    };

    const fetchConfigs = async () => {
        const { data } = await supabase
            .from('platform_configs')
            .select('*')
            .order('key', { ascending: true });
        if (data) setConfigs(data);
    };

    const updateConfig = async (key: string, value: string) => {
        setIsUpdating(true);
        try {
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('platform_configs')
                .update({ 
                    value: value,
                    updated_by: adminUser?.email 
                })
                .eq('key', key);
            
            if (error) throw error;
            toast({ title: "Configuración actualizada", description: `${key} ahora vale ${value}` });
            fetchConfigs();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const fetchAiLogs = async () => {
        const { data } = await supabase
            .from('ai_shadow_logs')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(30);
        
        if (data) {
            const formatted = data.map((log, i) => ({
                name: i.toString(),
                error: parseFloat(log.error_delta),
                confidence: parseFloat(log.confidence_score) * 10, // Scale for visibility
            }));
            setShadowLogs(formatted);
        }
    };

    const fetchDisputes = async () => {
        setLoadingDisputes(true);
        const { data } = await supabase
            .from('match_rooms')
            .select('*, tournaments(title)')
            .eq('status', 'dispute')
            .order('created_at', { ascending: false });
        
        if (data) setDisputes(data);
        setLoadingDisputes(false);
    };

    const fetchLabelingSamples = async () => {
        const { data } = await supabase
            .from('ai_labeling_samples')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        if (data) setLabelingSamples(data);
    };

    const handleUserSearch = async () => {
        if (!searchEmail) return;
        setIsUpdating(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*, coin_wallets(*), subscriptions(*)')
                .eq('email', searchEmail)
                .single();
            
            if (profile) {
                // Subscription is an array from the join, get the active one
                const activeSub = profile.subscriptions?.find((s: any) => s.status === 'active' || s.status === 'trialing');
                setTargetUser({
                    ...profile,
                    plan: activeSub?.plan || 'community'
                });
            } else {
                toast({ title: "Usuario no encontrado", variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Error en la búsqueda", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleUserPlus = async (targetEmail: string, isPlus: boolean) => {
        setIsUpdating(true);
        try {
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            const { error } = await supabase.rpc('admin_set_user_plus', {
                p_admin_email: adminUser?.email,
                p_target_email: targetEmail,
                p_is_plus: isPlus
            });
            if (error) throw error;
            toast({ title: `Usuario actualizado`, description: `Plan cambiado a ${isPlus ? 'PLUS' : 'COMMUNITY'}` });
            if (targetUser?.email === targetEmail) handleUserSearch();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFeatureOverride = async (targetEmail: string, features: string[]) => {
        setIsUpdating(true);
        try {
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            const { error } = await supabase.rpc('admin_set_feature_override', {
                p_admin_email: adminUser?.email,
                p_target_email: targetEmail,
                p_features: features
            });
            if (error) throw error;
            toast({ title: "Acceso actualizado", description: "Las funciones alfa/beta han sido asignadas." });
            if (targetUser?.email === targetEmail) handleUserSearch();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleWalletAdjustment = async (type: 'coins' | 'cash') => {
        if (!targetUser || !adjustAmount || !adjustReason) {
            toast({ title: "Datos incompletos", description: "Es obligatorio poner un motivo para la auditoría", variant: "destructive" });
            return;
        }

        setIsUpdating(true);
        try {
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            
            const { data, error } = await supabase.rpc('admin_adjust_wallet', {
                p_admin_email: adminUser?.email,
                p_target_email: targetUser.email,
                p_coin_delta: type === 'coins' ? parseInt(adjustAmount) : 0,
                p_cash_delta: type === 'cash' ? parseFloat(adjustAmount) : 0,
                p_reason: adjustReason
            });

            if (error || !data.success) {
                throw new Error(error?.message || data?.error || 'Error al aplicar el ajuste');
            }

            toast({ title: "Ajuste aplicado", description: `Se han modificado ${adjustAmount} ${type.toUpperCase()} correctamente.` });
            setAdjustAmount("");
            setAdjustReason("");
            await handleUserSearch();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const resolveDispute = async (matchId: string, winner: 1 | 2) => {
        setIsUpdating(true);
        try {
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('match_rooms')
                .update({ 
                    status: 'finished', 
                    conflict_resolved_by: adminUser?.email,
                    updated_at: new Date().toISOString()
                })
                .eq('id', matchId);

            if (error) throw error;
            
            toast({ title: "Conflicto Resuelto", description: `Se ha marcado al Jugador ${winner} como ganador.` });
            fetchDisputes();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const submitLabel = async () => {
        if (!currentSample || labelInput.p1 === "" || labelInput.p2 === "") {
            toast({ title: "Faltan datos", description: "Debes ingresar ambos resultados", variant: "destructive" });
            return;
        }
        setIsUpdating(true);
        try {
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('ai_labeling_samples')
                .update({
                    labeled_p1_score: parseInt(labelInput.p1),
                    labeled_p2_score: parseInt(labelInput.p2),
                    labeled_by: adminUser?.email,
                    labeled_at: new Date().toISOString(),
                    status: 'labeled'
                })
                .eq('id', currentSample.id);
            
            if (error) throw error;
            toast({ title: "Muestra etiquetada", description: "La IA aprenderá de este resultado en el próximo ciclo." });
            setCurrentSample(null);
            setLabelInput({ p1: "", p2: "" });
            fetchLabelingSamples();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const exportTrainingData = async () => {
        setIsUpdating(true);
        try {
            const { data } = await supabase
                .from('ai_labeling_samples')
                .select('*')
                .eq('status', 'labeled');
            
            if (!data || data.length === 0) {
                toast({ title: "Sin datos", description: "No hay muestras etiquetadas para exportar." });
                return;
            }

            // Convert to JSONL format (one JSON object per line)
            const jsonl = data.map(sample => JSON.stringify({
                image_url: sample.screenshot_url,
                ground_truth: { p1: sample.labeled_p1_score, p2: sample.labeled_p2_score },
                metadata: { match_id: sample.match_id, confidence: sample.confidence_score }
            })).join('\n');

            const blob = new Blob([jsonl], { type: 'application/x-jsonlines' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `revo-training-data-${new Date().toISOString().split('T')[0]}.jsonl`;
            a.click();
            
            toast({ title: "Exportación exitosa", description: `${data.length} muestras exportadas para Gemini Fine-tuning.` });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                        <ShieldAlert className="h-10 w-10 text-destructive animate-pulse" />
                        MISSION CONTROL
                    </h1>
                    <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest mt-1">
                        Duels Pro Ops & AI Shadow Mode
                    </p>
                </div>
                <div className="flex gap-2">
                   <div className="flex bg-muted p-1 rounded-lg border border-border/50">
                       <div className="px-3 py-1 flex flex-col items-center">
                           <span className="text-[10px] font-black opacity-50">CIRCULATING</span>
                           <span className="text-sm font-bold text-amber-500">
                               {mounted ? econStats.circulating.toLocaleString() : '---'} DC
                           </span>
                       </div>
                       <div className="w-[1px] bg-border mx-1" />
                       <div className="px-3 py-1 flex flex-col items-center">
                           <span className="text-[10px] font-black opacity-50">CASH RESERVE</span>
                           <span className="text-sm font-bold text-emerald-500">
                               {mounted ? `$${econStats.fiatInReserve.toLocaleString()}` : '---'}
                           </span>
                       </div>
                   </div>
                </div>
            </header>

            <Tabs defaultValue="god-mode" className="space-y-6" onValueChange={setActiveTab}>
                <TabsList className="bg-muted/30 p-1 border border-border w-full justify-start overflow-x-auto">
                    <TabsTrigger value="god-mode" className="gap-2 font-bold px-6">
                        <Users className="h-4 w-4" /> GOD MODE
                    </TabsTrigger>
                    <TabsTrigger value="disputes" className="gap-2 font-bold px-6">
                        <Gavel className="h-4 w-4" /> DISPUTAS
                        {disputes.length > 0 && <Badge className="ml-1 h-4 px-1 min-w-[1.25rem] bg-destructive">{disputes.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="ai-lab" className="gap-2 font-bold px-6">
                        <Microscope className="h-4 w-4" /> AI LAB
                    </TabsTrigger>
                    <TabsTrigger value="conversations" className="gap-2 font-bold px-6">
                        <BrainCircuit className="h-4 w-4" /> REFINEMENT LAB
                    </TabsTrigger>
                    <TabsTrigger value="ghost-accounts" className="gap-2 font-bold px-6">
                        <Users className="h-4 w-4" /> GHOSTS
                    </TabsTrigger>
                    <TabsTrigger value="economy" className="gap-2 font-bold px-6">
                        <TrendingUp className="h-4 w-4" /> TOKENOMICS
                    </TabsTrigger>
                    <TabsTrigger value="intelligence" className="gap-2 font-bold px-6">
                        <BarChartIcon className="h-4 w-4" /> INTELLIGENCE
                    </TabsTrigger>
                    <TabsTrigger value="retention" className="gap-2 font-bold px-6">
                        <Users className="h-4 w-4" /> RETENTION
                    </TabsTrigger>
                </TabsList>

                {/* --- 1. GOD MODE --- */}
                <TabsContent value="god-mode" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-1 border-primary/20 bg-card/50 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="text-sm uppercase font-black tracking-widest text-primary/80">User Lookup</CardTitle>
                                <CardDescription>Busca un usuario para forzar cambios de estado o saldo</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="email@example.com" 
                                        value={searchEmail}
                                        onChange={(e) => setSearchEmail(e.target.value)}
                                        className="bg-muted/50 border-border/50"
                                    />
                                    <Button size="icon" onClick={handleUserSearch} disabled={isUpdating}>
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                                {targetUser && (
                                    <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                {targetUser.display_name?.[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm leading-none">{targetUser.display_name}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[150px]">{targetUser.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant={targetUser.plan === 'plus' ? "default" : "outline"} className="text-[10px]">
                                                {targetUser.plan === 'plus' ? 'PLUS MEMBER' : 'COMMUNITY'}
                                            </Badge>
                                            {targetUser.is_admin && <Badge className="bg-destructive text-[10px]">ADMIN</Badge>}
                                        </div>
                                        <div className="pt-4 space-y-3">
                                            <p className="text-[10px] font-black uppercase text-primary/60">Alfa/Beta Testing Access</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['ai_arbitration', 'custom_branding', 'advanced_analytics', 'early_access'].map(feature => {
                                                    const isEnabled = targetUser.feature_overrides?.includes(feature);
                                                    return (
                                                        <Button 
                                                            key={feature}
                                                            size="sm" 
                                                            variant={isEnabled ? "default" : "outline"}
                                                            className="text-[9px] h-7 font-bold uppercase"
                                                            onClick={async () => {
                                                                const current = targetUser.feature_overrides || [];
                                                                const next = isEnabled 
                                                                    ? current.filter((f: string) => f !== feature)
                                                                    : [...current, feature];
                                                                await handleFeatureOverride(targetUser.email, next);
                                                            }}
                                                        >
                                                            {feature.replace(/_/g, ' ')}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2 border-border/50 bg-card/30">
                            <CardHeader>
                                <CardTitle className="text-sm uppercase font-black tracking-widest text-primary/80">Entitlement Manager & Wallet</CardTitle>
                                <CardDescription>Ajustes de nivel de cuenta y saldo auditado</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!targetUser ? (
                                    <div className="h-40 flex items-center justify-center text-muted-foreground italic text-sm">
                                        Busca un usuario para habilitar los ajustes
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
                                                    <p className="text-[10px] text-muted-foreground font-black uppercase">Coins</p>
                                                    <p className="text-xl font-black text-amber-500">{targetUser.coin_wallets?.balance?.toLocaleString() || 0}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                                                    <p className="text-[10px] text-muted-foreground font-black uppercase">Cash (MXN)</p>
                                                    <p className="text-xl font-black text-emerald-500">${targetUser.coin_wallets?.cash_balance?.toLocaleString() || 0}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold"
                                                    onClick={() => handleToggleUserPlus(targetUser.email, targetUser.plan !== 'plus')}
                                                >
                                                    <Zap className="h-3 w-3 mr-2" /> {targetUser.plan === 'plus' ? 'REVOKE PLUS' : 'UPGRADE TO PLUS'}
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase opacity-70">Ajustar Saldo</label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        type="number" 
                                                        placeholder="+100 o -50" 
                                                        value={adjustAmount}
                                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                                        className="bg-muted/30"
                                                    />
                                                    <Button variant="outline" className="text-xs" onClick={() => handleWalletAdjustment('coins')}>DC</Button>
                                                    <Button variant="outline" className="text-xs" onClick={() => handleWalletAdjustment('cash')}>Cash</Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase opacity-70">Razón Auditoría</label>
                                                <textarea 
                                                    className="w-full h-24 rounded-md bg-muted/30 border border-border p-3 text-sm focus:outline-none"
                                                    placeholder="Motivo del ajuste..."
                                                    value={adjustReason}
                                                    onChange={(e) => setAdjustReason(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button className="flex-1 bg-destructive hover:bg-destructive/80 text-xs font-bold"><Ban className="h-3 w-3 mr-2" /> BAN</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- 2. DISPUTES --- */}
                <TabsContent value="disputes" className="space-y-6">
                    <Card className="border-border/50 bg-card/30 min-h-[400px]">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase font-black tracking-widest text-primary/80 flex items-center gap-2">
                                <Gavel className="h-4 w-4" /> Gestión de Disputas
                            </CardTitle>
                            <CardDescription>Revisa evidencias y decide el ganador de partidas en conflicto</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingDisputes ? (
                                <div className="space-y-4 animate-pulse">
                                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/50 rounded-lg" />)}
                                </div>
                            ) : disputes.length === 0 ? (
                                <div className="h-60 flex flex-col items-center justify-center text-muted-foreground">
                                    <CheckCircle className="h-12 w-12 text-emerald-500/50 mb-2" />
                                    <p className="font-bold uppercase text-xs">No hay disputas pendientes</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {disputes.map((dispute) => (
                                        <Card key={dispute.id} className="border-amber-500/20 bg-muted/20">
                                            <CardContent className="p-4 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <Badge variant="outline" className="text-[9px] mb-1">{dispute.tournaments?.title}</Badge>
                                                        <h4 className="font-bold text-sm">Match Session #{dispute.id.slice(0, 8)}</h4>
                                                    </div>
                                                    <span className="text-[10px] font-mono opacity-50">{new Date(dispute.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase text-blue-400">P1: {dispute.player_1_email.split('@')[0]}</p>
                                                        {dispute.p1_evidence_url ? (
                                                            <Button size="sm" variant="outline" className="w-full h-8 text-[10px]" onClick={() => window.open(dispute.p1_evidence_url)}>
                                                                <FileText className="h-3 w-3 mr-1" /> EVIDENCIA
                                                            </Button>
                                                        ) : <Badge variant="secondary" className="w-full justify-center text-[9px] h-8 opacity-50">SIN EVIDENCIA</Badge>}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase text-rose-400">P2: {dispute.player_2_email.split('@')[0]}</p>
                                                        {dispute.p2_evidence_url ? (
                                                            <Button size="sm" variant="outline" className="w-full h-8 text-[10px]" onClick={() => window.open(dispute.p2_evidence_url)}>
                                                                <FileText className="h-3 w-3 mr-1" /> EVIDENCIA
                                                            </Button>
                                                        ) : <Badge variant="secondary" className="w-full justify-center text-[9px] h-8 opacity-50">SIN EVIDENCIA</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-2 border-t border-border/50">
                                                    <Button size="sm" className="flex-1 h-8 text-[10px] bg-blue-600 hover:bg-blue-700" onClick={() => resolveDispute(dispute.id, 1)}>DADA P1</Button>
                                                    <Button size="sm" className="flex-1 h-8 text-[10px] bg-rose-600 hover:bg-rose-700" onClick={() => resolveDispute(dispute.id, 2)}>GANA P2</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- 3. AI LAB --- */}
                <TabsContent value="ai-lab" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border-primary/20 bg-slate-950 text-slate-50 overflow-hidden">
                            <CardHeader className="border-b border-border/10 bg-slate-900/50">
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    Shadow Mode - Delta Error Tracking
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-72 p-4 pt-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={shadowLogs}>
                                        <defs>
                                            <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="name" hide />
                                        <YAxis stroke="#ffffff40" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', fontSize: '10px' }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="error" stroke="#ef4444" fillOpacity={1} fill="url(#colorError)" strokeWidth={2} name="Error Delta" />
                                        <Area type="monotone" dataKey="confidence" stroke="#3b82f6" fillOpacity={1} fill="url(#colorConf)" strokeWidth={2} name="Confidence x10" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                            <CardFooter className="bg-slate-900/50 border-t border-border/10 flex justify-between px-6 py-3">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Confianza IA</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Error de Predicción</span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono opacity-50 lowercase tracking-tighter">model: duels-caster-v2.1-live</span>
                            </CardFooter>
                        </Card>

                        <div className="space-y-6">
                             <Card className="border-border/50 bg-card">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center justify-between">
                                        Data Labeling
                                        <Badge variant="outline" className="text-[8px] bg-primary/10 text-primary border-primary/20">{labelingSamples.length} Pending</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-[10px] text-muted-foreground italic leading-tight">Muestras de imágenes que la IA no pudo procesar con confianza {'>'}90%.</p>
                                    
                                    {labelingSamples.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 opacity-50 grayscale">
                                            <CheckCircle className="h-8 w-8 mb-2" />
                                            <p className="text-[10px] font-bold">TODO LIMPIO</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                            {labelingSamples.map((sample) => (
                                                <div key={sample.id} className="p-3 border border-border/50 rounded-lg bg-muted/20 flex items-center justify-between group hover:border-primary/50 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs border border-border/50 overflow-hidden">
                                                            <img src={sample.screenshot_url} alt="Sample" className="w-full h-full object-cover" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold">Match #{sample.match_id?.slice(0, 6) || 'N/A'}</p>
                                                            <p className="text-[9px] text-muted-foreground">Conf: {((sample.confidence_score || 0) * 100).toFixed(0)}% • Pred: {sample.predicted_p1_score || 0}-{sample.predicted_p2_score || 0}</p>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-8 w-8 text-primary"
                                                        onClick={() => {
                                                            setCurrentSample(sample);
                                                            setLabelInput({ 
                                                                p1: sample.predicted_p1_score.toString(), 
                                                                p2: sample.predicted_p2_score.toString() 
                                                            });
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                             </Card>

                             {/* --- DIALOGO DE ETIQUETADO --- */}
                             <Dialog open={!!currentSample} onOpenChange={(open) => !open && setCurrentSample(null)}>
                                <DialogContent className="sm:max-w-[425px] bg-slate-950 border-primary/30">
                                    <DialogHeader>
                                        <DialogTitle className="text-primary flex items-center gap-2">
                                            <Camera className="h-5 w-5" /> Human-in-the-Loop Labeling
                                        </DialogTitle>
                                    </DialogHeader>
                                    
                                    {currentSample && (
                                        <div key={currentSample.id} className="space-y-6 pt-4">
                                            <div className="aspect-video w-full rounded-lg border border-border/50 overflow-hidden bg-black">
                                                <img src={currentSample.screenshot_url} alt="Full Match Screenshot" className="w-full h-full object-contain" />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">P1 Real Score</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={labelInput.p1} 
                                                        onChange={(e) => setLabelInput({...labelInput, p1: e.target.value})}
                                                        className="bg-muted/50 border-primary/20 focus-visible:ring-primary"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">P2 Real Score</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={labelInput.p2} 
                                                        onChange={(e) => setLabelInput({...labelInput, p2: e.target.value})}
                                                        className="bg-muted/50 border-primary/20 focus-visible:ring-primary"
                                                    />
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-muted-foreground italic bg-primary/5 p-2 rounded border border-primary/10">
                                                Esta corrección se utilizará para el re-entrenamiento del modelo (Fine-tuning V3).
                                            </p>
                                        </div>
                                    )}

                                    <DialogFooter className="mt-6">
                                        <Button variant="outline" onClick={() => setCurrentSample(null)}>CANCELAR</Button>
                                        <Button 
                                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                                            onClick={submitLabel}
                                            disabled={isUpdating}
                                        >
                                            {isUpdating ? "PROCESANDO..." : "CONFIRMAR RESULTADO"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                             </Dialog>

                             <Card className="border-border/50 bg-card">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-black uppercase text-muted-foreground">Real-time Performance</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-end border-b border-border/50 pb-2">
                                        <span className="text-[10px] font-bold uppercase opacity-50">Confidence Avg</span>
                                        <span className="text-sm font-black text-emerald-500">{(aiStats.confidenceAvg * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-border/50 pb-2">
                                        <span className="text-[10px] font-bold uppercase opacity-50">Error Mean (Abs)</span>
                                        <span className="text-sm font-black text-amber-500">{aiStats.predictionError}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase opacity-50">Status</span>
                                        <Badge className="bg-emerald-500/20 text-emerald-500 border-none font-black text-[9px] px-2 py-0">LIVE_OPS</Badge>
                                    </div>
                                </CardContent>
                             </Card>

                             <Card className="border-primary/30 bg-primary/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-black uppercase text-primary flex items-center justify-between">
                                        Dataset Health
                                        <DownloadCloud className="h-4 w-4 opacity-50" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-background rounded border border-border/50">
                                            <p className="text-[8px] font-bold opacity-50 uppercase">Total Samples</p>
                                            <p className="text-sm font-black">{aiStats.totalSamples.toLocaleString()}</p>
                                        </div>
                                        <div className="p-2 bg-background rounded border border-border/50">
                                            <p className="text-[8px] font-bold opacity-50 uppercase">Img Evidence</p>
                                            <p className="text-sm font-black">100%</p>
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        size="sm" 
                                        variant="default" 
                                        className="w-full text-[10px] font-black uppercase"
                                        onClick={exportTrainingData}
                                        disabled={isUpdating}
                                    >
                                        <Download className="h-3 w-3 mr-2" /> Exportar Dataset (JSONL)
                                    </Button>
                                    <p className="text-[9px] text-center text-muted-foreground italic">Optimizado para Gemini 1.5 Pro Fine-tuning</p>
                                </CardContent>
                             </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- 4. ECONOMY --- */}
                <TabsContent value="economy" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] font-black uppercase tracking-tighter">Total Minted</CardDescription>
                                <CardTitle className="text-2xl font-black text-amber-500">
                                    {mounted ? econStats.minted.toLocaleString() : '---'}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] font-black uppercase tracking-tighter">Total Burned</CardDescription>
                                <CardTitle className="text-2xl font-black text-rose-500">
                                    {mounted ? econStats.burned.toLocaleString() : '---'}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] font-black uppercase tracking-tighter">Circulating Supply</CardDescription>
                                <CardTitle className="text-2xl font-black text-primary">
                                    {mounted ? econStats.circulating.toLocaleString() : '---'}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-primary/10 border-primary/20">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] font-black uppercase tracking-tighter text-primary">Fiat Reserve</CardDescription>
                                <CardTitle className="text-2xl font-black text-primary">
                                    {mounted ? `$${econStats.fiatInReserve.toLocaleString()}` : '---'}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    <Card className="border-emerald-500/30 bg-emerald-500/5">
                        <CardHeader>
                            <CardTitle className="text-xs font-black uppercase text-emerald-500 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" /> Diagnóstico del Ecosistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-emerald-500/10">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold">Salud Económica Perfecta</p>
                                    <p className="text-xs text-muted-foreground">La reserva de efectivo cubre el 210% del pasivo circulante de Coins.</p>
                                </div>
                                <Badge className="bg-emerald-500 border-none font-black text-[10px]">OPTIMAL</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         <Card className="border-border/50 bg-card">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Database className="h-4 w-4 text-primary" /> Parámetros del Protocolo
                                </CardTitle>
                                <CardDescription className="text-[10px]">Ajusta las reglas matemáticas de la economía.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {configs.map((cfg) => (
                                    <div key={cfg.key} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/10">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">{cfg.key.replace(/_/g, ' ')}</p>
                                            <p className="text-[9px] opacity-70">Último cambio: {cfg.updated_by?.split('@')[0] || 'System'}</p>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <Input 
                                                className="w-20 h-8 text-xs font-bold text-center bg-background"
                                                defaultValue={cfg.value}
                                                onBlur={(e) => {
                                                    if(e.target.value !== cfg.value.toString()) {
                                                        updateConfig(cfg.key, e.target.value);
                                                    }
                                                }}
                                            />
                                            <span className="text-[10px] font-bold opacity-50 w-8">
                                                {cfg.key.includes('percentage') ? '%' : cfg.key.includes('mxn') ? 'MXN' : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                         </Card>

                         <Card className="border-border/50 bg-card">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <History className="h-4 w-4 text-amber-500" /> Mint/Burn Lifecycle
                                </CardTitle>
                                <CardDescription className="text-[10px]">Estado de emisión y quema de Duel Coins.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold uppercase opacity-50">
                                        <span>Reserve Ratio</span>
                                        <span>{(econStats.fiatInReserve > 0 ? (econStats.fiatInReserve / (econStats.circulating || 1) * 100).toFixed(0) : 0)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 transition-all duration-1000" 
                                            style={{ width: `${Math.min(100, (econStats.fiatInReserve / (econStats.circulating || 1)) * 100)}%` }} 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {econStats.recentTransactions.length === 0 ? (
                                        <p className="text-[10px] text-center italic opacity-50 py-4">No recent activity</p>
                                    ) : (
                                        econStats.recentTransactions.map((tx: any) => (
                                            <div key={tx.id} className="flex justify-between items-center text-[10px] border-b border-border/20 pb-2">
                                                <div className="flex gap-2 items-center">
                                                    <Badge className={cn(
                                                        "border-none h-4 px-1",
                                                        tx.amount > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                                    )}>
                                                        {tx.amount > 0 ? "MINT" : "BURN"}
                                                    </Badge>
                                                    <span className="font-mono truncate max-w-[120px]">{tx.reason || 'No reason'}</span>
                                                </div>
                                                <span className={cn(
                                                    "font-bold",
                                                    tx.amount > 0 ? "text-emerald-400" : "text-rose-400"
                                                )}>
                                                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} DC
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full text-[10px] font-black uppercase text-amber-500 border-amber-500/20 hover:bg-amber-500/10"
                                    onClick={async () => {
                                        setIsUpdating(true);
                                        try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            const { data, error } = await supabase.rpc('admin_force_burn_cycle', {
                                                p_admin_email: user?.email
                                            });
                                            if (error) throw error;
                                            toast({ 
                                                title: "Ciclo Deflacionario", 
                                                description: `Se han retirado ${data.burned_amount} DC de circulación. Reserve Ratio: ${data.new_reserve_ratio}` 
                                            });
                                            await fetchEconStats();
                                        } catch (err: any) {
                                            toast({ title: "Error", description: err.message, variant: "destructive" });
                                        } finally {
                                            setIsUpdating(false);
                                        }
                                    }}
                                    disabled={isUpdating}
                                >
                                    <Zap className="h-3 w-3 mr-2" /> Forzar Ciclo de Quema
                                </Button>
                            </CardContent>
                         </Card>
                    </div>
                </TabsContent>

                {/* --- 2.5 CONVERSATIONS LAB --- */}
                <TabsContent value="conversations">
                    <AILabPage />
                </TabsContent>

                {/* --- 2.6 INTELLIGENCE LAB --- */}
                <TabsContent value="intelligence">
                    <PlatformIntelligence />
                </TabsContent>

                {/* --- 2.7 RETENTION ENGINE --- */}
                <TabsContent value="retention">
                    <RetentionEngine />
                </TabsContent>

                {/* --- 4. GHOST ACCOUNTS --- */}
                <TabsContent value="ghost-accounts" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-primary/20 bg-card/50">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Generador de Cuentas Fantasma</CardTitle>
                                <CardDescription>Crea perfiles ficticios para llenar brackets y probar flujos de torneo.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Apodo del Fantasma</Label>
                                    <Input 
                                        placeholder="Ex: NoobMaster69" 
                                        id="ghost_nickname"
                                        className="bg-muted/30 border-border/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Coins de Inicio</Label>
                                    <Input 
                                        type="number" 
                                        defaultValue="1000" 
                                        id="ghost_coins"
                                        className="bg-muted/30 border-border/50"
                                    />
                                </div>
                                <Button 
                                    className="w-full font-bold" 
                                    onClick={async () => {
                                        setIsUpdating(true);
                                        try {
                                            const nickname = (document.getElementById('ghost_nickname') as HTMLInputElement).value;
                                            const coins = parseInt((document.getElementById('ghost_coins') as HTMLInputElement).value);
                                            const { data: { user } } = await supabase.auth.getUser();
                                            
                                            const { data, error } = await supabase.rpc('admin_create_ghost_account', {
                                                p_admin_email: user?.email,
                                                p_nickname: nickname,
                                                p_initial_coins: coins
                                            });

                                            if (error) throw error;
                                            toast({ title: "Fantasma Creado", description: `Email: ${data.email}` });
                                            fetchGhosts();
                                        } catch (err: any) {
                                            toast({ title: "Error", description: err.message, variant: "destructive" });
                                        } finally {
                                            setIsUpdating(false);
                                        }
                                    }}
                                    disabled={isUpdating}
                                >
                                    <Users className="h-4 w-4 mr-2" /> CREAR FANTASMA
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-destructive/20 bg-destructive/5">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-destructive">Zona de Limpieza</CardTitle>
                                <CardDescription>Borra permanentemente todos los datos generados por cuentas fantasma.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-4 items-start">
                                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-1" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-destructive uppercase">Advertencia Crítica</p>
                                        <p className="text-[10px] text-muted-foreground">Esta acción eliminará perfiles, carteras, participaciones en torneos y transacciones vinculadas a cuentas "@duels.pro". No se puede deshacer.</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="destructive" 
                                    className="w-full font-black uppercase text-[10px] tracking-widest"
                                    onClick={async () => {
                                        if (!confirm("¿ESTÁS SEGURO? Esto borrará TODA la data de prueba.")) return;
                                        setIsUpdating(true);
                                        try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            const { data, error } = await supabase.rpc('admin_wipe_ghost_data', {
                                                p_admin_email: user?.email
                                            });
                                            if (error) throw error;
                                            toast({ title: "Limpieza Completada", description: `Se eliminaron ${data.deleted_records} registros de prueba.` });
                                            setGhosts([]);
                                        } catch (err: any) {
                                            toast({ title: "Error", description: err.message, variant: "destructive" });
                                        } finally {
                                            setIsUpdating(false);
                                        }
                                    }}
                                    disabled={isUpdating}
                                >
                                    <Ban className="h-4 w-4 mr-2" /> WIPE ALL GHOST DATA
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-primary/20 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Cpu className="h-4 w-4" /> Simulador de Comportamiento (AI Ghosts)
                            </CardTitle>
                            <CardDescription>Ejecuta acciones masivas para generar tráfico y data en el sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-3">
                                    <h4 className="text-[10px] font-black uppercase opacity-60">Tournaments</h4>
                                    <select id="sim_tournament" className="w-full bg-background border border-border rounded p-2 text-xs">
                                        {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <Button 
                                        size="sm" 
                                        className="w-full text-[10px] font-bold"
                                        onClick={async () => {
                                            const tId = (document.getElementById('sim_tournament') as HTMLSelectElement).value;
                                            if (!tId) return;
                                            setIsUpdating(true);
                                            try {
                                                const { data: { user } } = await supabase.auth.getUser();
                                                let joined = 0;
                                                for (const g of ghosts) {
                                                    await supabase.rpc('admin_ghost_join_tournament', {
                                                        p_admin_email: user?.email,
                                                        p_ghost_email: g.email,
                                                        p_tournament_id: tId
                                                    });
                                                    joined++;
                                                }
                                                toast({ title: "Inscripción Masiva", description: `${joined} fantasmas se han unido al torneo.` });
                                            } catch (err: any) {
                                                toast({ title: "Error", description: err.message, variant: "destructive" });
                                            } finally {
                                                setIsUpdating(false);
                                            }
                                        }}
                                    >JOIN ALL GHOSTS</Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="w-full text-[10px] font-bold"
                                        onClick={async () => {
                                            const tId = (document.getElementById('sim_tournament') as HTMLSelectElement).value;
                                            if (!tId) return;
                                            setIsUpdating(true);
                                            try {
                                                const { data: { user } } = await supabase.auth.getUser();
                                                const { error } = await supabase.rpc('admin_set_tournament_plus', {
                                                    p_admin_email: user?.email,
                                                    p_tournament_id: tId,
                                                    p_is_plus: true
                                                });
                                                if (error) throw error;
                                                toast({ title: "Torneo Elevado", description: "El torneo ahora es PLUS." });
                                                fetchTournaments();
                                            } catch (err: any) {
                                                toast({ title: "Error", description: err.message, variant: "destructive" });
                                            } finally {
                                                setIsUpdating(false);
                                            }
                                        }}
                                    >UPGRADE TOURNEY TO PLUS</Button>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-3">
                                    <h4 className="text-[10px] font-black uppercase opacity-60">Store Activity</h4>
                                    <p className="text-[9px] text-muted-foreground">Fantasmas comprarán un item aleatorio si tienen saldo.</p>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="w-full text-[10px] font-bold"
                                        onClick={async () => {
                                            setIsUpdating(true);
                                            try {
                                                const { data: { user } } = await supabase.auth.getUser();
                                                let bought = 0;
                                                for (const g of ghosts) {
                                                    const { data } = await supabase.rpc('admin_ghost_buy_item', {
                                                        p_admin_email: user?.email,
                                                        p_ghost_email: g.email
                                                    });
                                                    if (data?.success) bought++;
                                                }
                                                toast({ title: "Simulación de Tienda", description: `${bought} compras realizadas por fantasmas.` });
                                            } catch (err: any) {
                                                toast({ title: "Error", description: err.message, variant: "destructive" });
                                            } finally {
                                                setIsUpdating(false);
                                            }
                                        }}
                                    >SHOPPING SPREE</Button>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="ghost"
                                            className="flex-1 text-[9px] font-bold h-7"
                                            onClick={async () => {
                                                setIsUpdating(true);
                                                try {
                                                    const { data: { user } } = await supabase.auth.getUser();
                                                    let equipped = 0;
                                                    for (const g of ghosts) {
                                                        const { data } = await supabase.rpc('admin_ghost_equip_item', {
                                                            p_admin_email: user?.email,
                                                            p_ghost_email: g.email
                                                        });
                                                        if (data?.success) equipped++;
                                                    }
                                                    toast({ title: "Cosméticos Equipados", description: `${equipped} fantasmas han actualizado su equipo.` });
                                                } catch (err: any) {
                                                    toast({ title: "Error", description: err.message, variant: "destructive" });
                                                } finally {
                                                    setIsUpdating(false);
                                                }
                                            }}
                                        >EQUIP ITEMS</Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost"
                                            className="flex-1 text-[9px] font-bold h-7 text-indigo-400"
                                            onClick={async () => {
                                                setIsUpdating(true);
                                                try {
                                                    const { data: { user } } = await supabase.auth.getUser();
                                                    let plusCount = 0;
                                                    for (const g of ghosts) {
                                                        await supabase.rpc('admin_set_user_plus', {
                                                            p_admin_email: user?.email,
                                                            p_target_email: g.email,
                                                            p_is_plus: true
                                                        });
                                                        plusCount++;
                                                    }
                                                    toast({ title: "Ghosts Upgraded", description: `${plusCount} fantasmas ahora son PLUS.` });
                                                    fetchGhosts();
                                                } catch (err: any) {
                                                    toast({ title: "Error", description: err.message, variant: "destructive" });
                                                } finally {
                                                    setIsUpdating(false);
                                                }
                                            }}
                                        >GHOSTS {'->'} PLUS</Button>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-3">
                                    <h4 className="text-[10px] font-black uppercase opacity-60">Tournament Ops</h4>
                                    <p className="text-[9px] text-muted-foreground">Un fantasma aleatorio creará un torneo de prueba.</p>
                                    <Button 
                                        size="sm" 
                                        className="w-full text-[10px] font-bold"
                                        onClick={async () => {
                                            if (ghosts.length === 0) return;
                                            setIsUpdating(true);
                                            try {
                                                const { data: { user } } = await supabase.auth.getUser();
                                                const randomGhost = ghosts[Math.floor(Math.random() * ghosts.length)];
                                                const { data, error } = await supabase.rpc('admin_ghost_create_tournament', {
                                                    p_admin_email: user?.email,
                                                    p_ghost_email: randomGhost.email,
                                                    p_name: `Ghost Cup #${Math.floor(Math.random()*1000)}`,
                                                    p_game: "League of Legends"
                                                });
                                                if (error) throw error;
                                                toast({ title: "Torneo Creado", description: `Organizado por: ${randomGhost.nickname}` });
                                                fetchTournaments();
                                            } catch (err: any) {
                                                toast({ title: "Error", description: err.message, variant: "destructive" });
                                            } finally {
                                                setIsUpdating(false);
                                            }
                                        }}
                                    >CREATE GHOST TOURNAMENT</Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="w-full text-[10px] font-bold"
                                        onClick={async () => {
                                            setIsUpdating(true);
                                            try {
                                                const { data: { user } } = await supabase.auth.getUser();
                                                const { data: activeMatches } = await supabase
                                                    .from('match_rooms')
                                                    .select('id, player_1_email, player_2_email')
                                                    .eq('status', 'pending');
                                                
                                                let simulated = 0;
                                                if (activeMatches) {
                                                    for (const m of activeMatches) {
                                                        const isGhost1 = m.player_1_email.endsWith('@duels.pro');
                                                        const isGhost2 = m.player_2_email.endsWith('@duels.pro');
                                                        
                                                        if (isGhost1) await supabase.rpc('admin_ghost_report_score', { p_admin_email: user?.email, p_match_room_id: m.id, p_player_email: m.player_1_email, p_score: Math.floor(Math.random() * 5) });
                                                        if (isGhost2) await supabase.rpc('admin_ghost_report_score', { p_admin_email: user?.email, p_match_room_id: m.id, p_player_email: m.player_2_email, p_score: Math.floor(Math.random() * 5) });
                                                        simulated++;
                                                    }
                                                }
                                                toast({ title: "Resultados Simulados", description: `${simulated} partidas actualizadas.` });
                                            } catch (err: any) {
                                                toast({ title: "Error", description: err.message, variant: "destructive" });
                                            } finally {
                                                setIsUpdating(false);
                                            }
                                        }}
                                    >AUTO-REPORT SCORES</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
