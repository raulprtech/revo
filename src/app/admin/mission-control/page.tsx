"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    LineChart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { coinsService } from "@/lib/coins";

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

    // --- AI Lab State ---
    const [aiStats, setAiStats] = useState({ predictionError: 4.2, confidenceAvg: 0.92 });
    const [shadowLogs, setShadowLogs] = useState<any[]>([]);

    // --- Economics State ---
    const [econStats, setEconStats] = useState({
        minted: 1250000,
        burned: 845000,
        circulating: 405000,
        fiatInReserve: 85000
    });

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

            toast({ 
                title: "Ajuste aplicado", 
                description: `Se han modificado ${adjustAmount} ${type.toUpperCase()} correctamente.` 
            });
            
            setAdjustAmount("");
            setAdjustReason("");
            await handleUserSearch(); // Refresh user data
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
                   <div className="flex bg-muted p-1 rounded-lg border border-border">
                       <div className="px-3 py-1 flex flex-col items-center">
                           <span className="text-[10px] font-black opacity-50">SUPPLY</span>
                           <span className="text-sm font-bold text-amber-500">{econStats.circulating.toLocaleString()} DC</span>
                       </div>
                       <div className="w-[1px] bg-border mx-1" />
                       <div className="px-3 py-1 flex flex-col items-center">
                           <span className="text-[10px] font-black opacity-50">RESERVE</span>
                           <span className="text-sm font-bold text-emerald-500">${econStats.fiatInReserve.toLocaleString()}</span>
                       </div>
                   </div>
                </div>
            </header>

            <Tabs defaultValue="god-mode" className="space-y-6" onValueChange={setActiveTab}>
                <TabsList className="bg-muted/50 p-1 border border-border w-full justify-start overflow-x-auto">
                    <TabsTrigger value="god-mode" className="gap-2 font-bold px-6">
                        <Users className="h-4 w-4" /> GOD MODE
                    </TabsTrigger>
                    <TabsTrigger value="ai-lab" className="gap-2 font-bold px-6">
                        <Microscope className="h-4 w-4" /> AI LAB
                    </TabsTrigger>
                    <TabsTrigger value="economy" className="gap-2 font-bold px-6">
                        <TrendingUp className="h-4 w-4" /> TOKENOMICS
                    </TabsTrigger>
                </TabsList>

                {/* --- 1. GOD MODE: USER MGMT --- */}
                <TabsContent value="god-mode" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Search & Audit Card */}
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

                        {/* Adjustments Panel */}
                        <Card className="lg:col-span-2 border-border/50 bg-card/30">
                            <CardHeader>
                                <CardTitle className="text-sm uppercase font-black tracking-widest text-primary/80">Wallet Doctor</CardTitle>
                                <CardDescription>Ajustes manuales de saldo retirable y virtual con auditoría forzada</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!targetUser ? (
                                    <div className="h-40 flex items-center justify-center text-muted-foreground italic text-sm">
                                        Busca un usuario para habilitar los ajustes de saldo
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
                                            
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase opacity-70">Ajustar Saldo</label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        type="number" 
                                                        placeholder="Cifra: +500 o -200" 
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
                                                <label className="text-xs font-bold uppercase opacity-70">Razón del Ajuste (Para Auditoría)</label>
                                                <textarea 
                                                    className="w-full h-24 rounded-md bg-muted/30 border border-border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                                    placeholder="Ejem: Error en transacción Stripe #xyz o Bono Influencer..."
                                                    value={adjustReason}
                                                    onChange={(e) => setAdjustReason(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button className="flex-1 bg-destructive hover:bg-destructive/80 text-xs font-bold">
                                                    <Ban className="h-3 w-3 mr-2" /> BAN USER
                                                </Button>
                                                <Button className="flex-1 bg-primary text-xs font-bold">
                                                    <Zap className="h-3 w-3 mr-2" /> FORZAR PRO
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- 2. AI LAB: SHADOW MODE --- */}
                <TabsContent value="ai-lab" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border-primary/20 bg-slate-950 text-slate-50 overflow-hidden">
                            <CardHeader className="border-b border-border/10 bg-slate-900/50">
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    Shadow Mode - Accuracy Tracking
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-64 flex items-center justify-center relative p-0">
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                                {/* Placeholder for Chart */}
                                <div className="z-10 text-center space-y-4">
                                    <LineChart className="h-10 w-10 mx-auto text-primary opacity-50" />
                                    <p className="text-xs font-mono text-muted-foreground uppercase">[ Simulando Error Delta: <span className="text-primary">+0.24ms</span> ]</p>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-4 bg-primary" />
                                            <span className="text-[10px]">Realidad</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-4 bg-primary/30 border-t border-dashed border-primary" />
                                            <span className="text-[10px]">Predicción</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-900/50 border-t border-border/10 flex justify-between">
                                <span className="text-[10px] font-mono opacity-50">Model: Duels-Caster-v2.1</span>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase font-black hover:bg-primary/20">
                                    Ejecutar Predicción Ahora
                                </Button>
                            </CardFooter>
                        </Card>

                        <div className="space-y-6">
                             <Card className="border-border/50 bg-card">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center justify-between">
                                        Data Labeling
                                        <Badge variant="outline" className="text-[8px]">48 Pending</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-[10px] text-muted-foreground italic leading-tight">
                                        Resuelve disputas dudosas para que la IA aprenda de ellas.
                                    </p>
                                    <div className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs">📸</div>
                                            <span className="text-xs font-bold">Screen #3492</span>
                                        </div>
                                        <Button size="sm" className="h-7 text-[10px]">REVISAR</Button>
                                    </div>
                                </CardContent>
                             </Card>

                             <Card className="border-border/50 bg-card">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-black uppercase text-muted-foreground">Shadow Metrics</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                        <span className="text-xs font-medium">Confianza Promedio</span>
                                        <span className="text-sm font-black text-emerald-500">92.4%</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                        <span className="text-xs font-medium">Error Delta (24h)</span>
                                        <span className="text-sm font-black text-amber-500">0.02</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">Uso de CPU Inf.</span>
                                        <Badge variant="outline" className="text-xs font-bold">LOW</Badge>
                                    </div>
                                </CardContent>
                             </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- 3. ECONOMY: TOKENOMICS --- */}
                <TabsContent value="economy" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] font-black uppercase tracking-tighter">Total Minted</CardDescription>
                                <CardTitle className="text-2xl font-black text-amber-500">{econStats.minted.toLocaleString()}</CardTitle>
                                <p className="text-[10px] text-muted-foreground">+12% vs last month</p>
                            </CardHeader>
                        </Card>
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] font-black uppercase tracking-tighter">Total Burned</CardDescription>
                                <CardTitle className="text-2xl font-black text-rose-500">{econStats.burned.toLocaleString()}</CardTitle>
                                <p className="text-[10px] text-muted-foreground">Marketplace influence</p>
                            </CardHeader>
                        </Card>
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] font-black uppercase tracking-tighter">Circulating Supply</CardDescription>
                                <CardTitle className="text-2xl font-black text-primary">{econStats.circulating.toLocaleString()}</CardTitle>
                                <p className="text-[10px] text-muted-foreground">Virtual DC in wallets</p>
                            </CardHeader>
                        </Card>
                        <Card className="bg-primary border-none text-primary-foreground">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-[10px] font-black uppercase tracking-tighter text-primary-foreground/70">Fiat Reserve</CardDescription>
                                <CardTitle className="text-2xl font-black">${econStats.fiatInReserve.toLocaleString()}</CardTitle>
                                <p className="text-[10px] text-primary-foreground/70">Duels Cash liability</p>
                            </CardHeader>
                        </Card>
                    </div>

                    <Card className="border-destructive/30 bg-destructive/5">
                        <CardHeader>
                            <CardTitle className="text-xs font-black uppercase text-destructive flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" /> Alertas de Inflación y Fraude
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-destructive/20 scale-in-95 animate-in fade-in">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold">No se detectan anomalías de supply.</p>
                                    <p className="text-xs text-muted-foreground">La correlación entre registros nuevos y coins minteadas es del 0.98.</p>
                                </div>
                                <Badge className="bg-emerald-500 border-none">NOMINAL</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

