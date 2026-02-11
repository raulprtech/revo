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
    DownloadCloud
} from "lucide-react";
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
        predictionError: 0.12, 
        confidenceAvg: 0.94,
        totalSamples: 1240,
        labeledToday: 42
    });
    const [shadowLogs, setShadowLogs] = useState<any[]>([]);

    // --- Disputes State ---
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loadingDisputes, setLoadingDisputes] = useState(false);

    // --- Labeling State ---
    const [labelingSamples, setLabelingSamples] = useState<any[]>([]);
    const [currentSample, setCurrentSample] = useState<any>(null);
    const [labelInput, setLabelInput] = useState({ p1: "", p2: "" });

    // --- Economics State ---
    const [econStats, setEconStats] = useState({
        minted: 1250000,
        burned: 845000,
        circulating: 405000,
        fiatInReserve: 85000
    });
    const [configs, setConfigs] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
        fetchAiLogs();
        fetchDisputes();
        fetchLabelingSamples();
        fetchConfigs();
    }, []);

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
                .select('*, coin_wallets(*)')
                .eq('email', searchEmail)
                .single();
            
            if (profile) {
                setTargetUser(profile);
            } else {
                toast({ title: "Usuario no encontrado", variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Error en la búsqueda", variant: "destructive" });
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
                    <TabsTrigger value="economy" className="gap-2 font-bold px-6">
                        <TrendingUp className="h-4 w-4" /> TOKENOMICS
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
                                            <Badge variant={targetUser.is_pro ? "default" : "outline"} className="text-[10px]">
                                                {targetUser.is_pro ? 'PRO MEMBER' : 'COMMUNITY'}
                                            </Badge>
                                            {targetUser.is_admin && <Badge className="bg-destructive text-[10px]">ADMIN</Badge>}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2 border-border/50 bg-card/30">
                            <CardHeader>
                                <CardTitle className="text-sm uppercase font-black tracking-widest text-primary/80">Wallet Doctor</CardTitle>
                                <CardDescription>Ajustes manuales de saldo con auditoría forzada</CardDescription>
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
                                                    <p className="text-xl font-black text-emerald-500">\${targetUser.coin_wallets?.cash_balance?.toLocaleString() || 0}</p>
                                                </div>
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
                                                <Button className="flex-1 bg-primary text-xs font-bold"><Zap className="h-3 w-3 mr-2" /> FORZAR PRO</Button>
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
                                        <div key={sample.id} className="space-y-6 pt-4">
                                            <div className="aspect-video w-full rounded-lg border border-border/50 overflow-hidden bg-black">
                                                <img src={sample.screenshot_url} alt="Full Match Screenshot" className="w-full h-full object-contain" />
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
                                        <span>Total Velocity</span>
                                        <span>+12.4% / mo</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[65%]" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] border-b border-border/20 pb-2">
                                        <div className="flex gap-2 items-center">
                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none h-4 px-1">MINT</Badge>
                                            <span className="font-mono">Stripe_Purchase_X29</span>
                                        </div>
                                        <span className="font-bold text-emerald-400">+500 DC</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] border-b border-border/20 pb-2">
                                        <div className="flex gap-2 items-center">
                                            <Badge className="bg-rose-500/10 text-rose-500 border-none h-4 px-1">BURN</Badge>
                                            <span className="font-mono">Duel_Rake_A44</span>
                                        </div>
                                        <span className="font-bold text-rose-400">-50 DC</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <div className="flex gap-2 items-center">
                                            <Badge className="bg-rose-500/10 text-rose-500 border-none h-4 px-1">BURN</Badge>
                                            <span className="font-mono">Banner_Purchase_S01</span>
                                        </div>
                                        <span className="font-bold text-rose-400">-250 DC</span>
                                    </div>
                                </div>

                                <Button size="sm" variant="outline" className="w-full text-[10px] font-black uppercase text-amber-500 border-amber-500/20 hover:bg-amber-500/10">
                                    <Zap className="h-3 w-3 mr-2" /> Forzar Ciclo de Quema
                                </Button>
                            </CardContent>
                         </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
