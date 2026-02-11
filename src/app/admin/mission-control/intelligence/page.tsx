"use client";

import { useState, useEffect } from "react";
import { 
    LineChart, Line, AreaChart, Area, BarChart, Bar, 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    TrendingUp, Users, Zap, Trophy, Timer, 
    UsersRound, DollarSign, Target, MousePointer2 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Calendar as CalendarIcon, 
    Filter,
    Gamepad2,
    CalendarDays,
    UserCircle,
    Building2,
    Activity,
    Trophy as TrophyIcon
} from "lucide-react";
import { getIntelligenceMetrics, triggerBurnMaster } from "./actions";
import { useToast } from "@/hooks/use-toast";

export default function PlatformIntelligence() {
    const [heartbeatData, setHeartbeatData] = useState<any[]>([]);
    const [velocityStats, setVelocityStats] = useState<any[]>([]);
    const [gameDist, setGameDist] = useState<any[]>([]);
    const [sponsorEngagement, setSponsorEngagement] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();
    const [platformStats, setPlatformStats] = useState<any>({
        sponsorValue: 0,
        platformHype: "LOADING",
        concurrentEvents: 0
    });

    const handleInvokeBurnMaster = async (intensity: "normal" | "aggressive" | "crisis" = "normal") => {
        setIsGenerating(true);
        try {
            const res = await triggerBurnMaster(intensity);
            if (res.success) {
                const name = res.strategy.type === "single_tournament" 
                    ? res.strategy.tournament_config.name 
                    : res.strategy.event_name;

                toast({ 
                    title: intensity === "normal" ? "Torneo Smart Activo" : "¡Campaña Masiva Iniciada!", 
                    description: `IA generó: ${name}. Motivo: ${res.strategy.reasoning.substring(0, 100)}...`
                });
            }
        } catch (err) {
            toast({ title: "Error", description: "No se pudo invocar el Burn Master.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };
    const [filters, setFilters] = useState({
        timeRange: "7d",
        game: "all",
        playerType: "all",
        organizer: "all",
        tournament: "all"
    });
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const metrics = await getIntelligenceMetrics(filters);
                setHeartbeatData(metrics.heartbeatData);
                setVelocityStats(metrics.velocityStats);
                setGameDist(metrics.gameDistribution);
                setSponsorEngagement(metrics.sponsorEngagement);
                setPlatformStats(metrics.platformStats);
            } catch (error) {
                console.error("Error fetching intelligence metrics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Filter Bar */}
            <Card className="bg-slate-950 border-indigo-500/10 backdrop-blur-md sticky top-0 z-10">
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-400 mr-2">
                            <Filter className="h-4 w-4" /> FILTROS AI
                        </div>
                        
                        {/* Time Range */}
                        <div className="space-y-1">
                            <Select value={filters.timeRange} onValueChange={(v) => setFilters({...filters, timeRange: v})}>
                                <SelectTrigger className="w-[140px] h-8 text-[10px] font-bold bg-white/5 border-white/10 uppercase">
                                    <CalendarDays className="h-3 w-3 mr-2 opacity-50" />
                                    <SelectValue placeholder="Periodo" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-[10px] font-bold">
                                    <SelectItem value="24h">Últimas 24h</SelectItem>
                                    <SelectItem value="7d">Últimos 7 días</SelectItem>
                                    <SelectItem value="30d">Últimos 30 días</SelectItem>
                                    <SelectItem value="all">Todo el tiempo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Game Filter */}
                        <div className="space-y-1">
                            <Select value={filters.game} onValueChange={(v) => setFilters({...filters, game: v})}>
                                <SelectTrigger className="w-[140px] h-8 text-[10px] font-bold bg-white/5 border-white/10 uppercase">
                                    <Gamepad2 className="h-3 w-3 mr-2 opacity-50" />
                                    <SelectValue placeholder="Juego" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-[10px] font-bold">
                                    <SelectItem value="all">Todos los juegos</SelectItem>
                                    <SelectItem value="fifa">FIFA / FC 25</SelectItem>
                                    <SelectItem value="kof">King of Fighters</SelectItem>
                                    <SelectItem value="sf6">Street Fighter 6</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Player Type */}
                        <div className="space-y-1">
                            <Select value={filters.playerType} onValueChange={(v) => setFilters({...filters, playerType: v})}>
                                <SelectTrigger className="w-[140px] h-8 text-[10px] font-bold bg-white/5 border-white/10 uppercase">
                                    <UserCircle className="h-3 w-3 mr-2 opacity-50" />
                                    <SelectValue placeholder="Tipo Jugador" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-[10px] font-bold">
                                    <SelectItem value="all">Todos los perfiles</SelectItem>
                                    <SelectItem value="plus">Sólo PLUS</SelectItem>
                                    <SelectItem value="community">Comunidad (Free)</SelectItem>
                                    <SelectItem value="pro">Participantes Pro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Organizer Filter */}
                        <div className="space-y-1">
                            <Select value={filters.organizer} onValueChange={(v) => setFilters({...filters, organizer: v})}>
                                <SelectTrigger className="w-[150px] h-8 text-[10px] font-bold bg-white/5 border-white/10 uppercase">
                                    <Building2 className="h-3 w-3 mr-2 opacity-50" />
                                    <SelectValue placeholder="Organizador" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-[10px] font-bold">
                                    <SelectItem value="all">Todos los Orgs</SelectItem>
                                    <SelectItem value="duels">Duels Logistics</SelectItem>
                                    <SelectItem value="brand_a">Influencer Partners</SelectItem>
                                    <SelectItem value="external">Externos (Comunidad)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tournament Filter */}
                        <div className="space-y-1">
                            <Select value={filters.tournament} onValueChange={(v) => setFilters({...filters, tournament: v})}>
                                <SelectTrigger className="w-[180px] h-8 text-[10px] font-bold bg-white/5 border-white/10 uppercase">
                                    <TrophyIcon className="h-3 w-3 mr-2 opacity-50" />
                                    <SelectValue placeholder="Torneo Específico" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-[10px] font-bold">
                                    <SelectItem value="all">Todos los Torneos</SelectItem>
                                    <SelectItem value="t1">Copa Duels Pro #12</SelectItem>
                                    <SelectItem value="t2">King of Fighters Invitational</SelectItem>
                                    <SelectItem value="t3">FIFA 25 Weekly Grind</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 animate-pulse">
                                <Activity className="h-3 w-3 animate-spin" /> PROCESANDO DATA...
                            </div>
                        ) : (
                            <>
                                <div className="h-8 w-[1px] bg-white/10 mx-2 hidden lg:block" />
                                <div className="flex items-center gap-2">
                                    <Button 
                                        size="sm" 
                                        className="h-8 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black italic gap-2"
                                        onClick={() => handleInvokeBurnMaster("normal")}
                                        disabled={isGenerating}
                                    >
                                        <Zap className="h-3 w-3 fill-current" />
                                        {isGenerating ? "ANALIZANDO..." : "INVOCAR BURN MASTER"}
                                    </Button>

                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-8 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 text-[10px] font-black italic gap-2"
                                        onClick={() => handleInvokeBurnMaster("aggressive")}
                                        disabled={isGenerating}
                                    >
                                        <TrophyIcon className="h-3 w-3" />
                                        LANZAR EVENTO MASIVO
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* KPI Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-950 border-indigo-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Players</p>
                                <h3 className="text-2xl font-black text-white italic">1,284</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                            <TrendingUp className="h-3 w-3" /> +12% vs last hour
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-emerald-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fill Velocity (Avg)</p>
                                <h3 className="text-2xl font-black text-white italic">42m</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Timer className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground font-bold">
                            OPTIMIZED BY AI ARCHITECT
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-amber-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sponsor Value</p>
                                <h3 className="text-2xl font-black text-white italic">${(platformStats.sponsorValue / 1000).toFixed(1)}k</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <DollarSign className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 text-[10px] text-amber-500 font-bold">
                            ESTIMATED CPM: $24.50
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-orange-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Master Burn ROI</p>
                                <h3 className="text-2xl font-black text-white italic">{platformStats.totalBurned?.toLocaleString() || 0}</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <RefreshCcw className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 text-[10px] text-orange-500 font-bold uppercase">
                            Coins recovered by AI
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real-time Traffic */}
                <Card className="lg:col-span-2 bg-slate-950 border-border/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                            <UsersRound className="h-4 w-4 text-indigo-400" /> Player Concurrent Traffic
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={heartbeatData}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis 
                                        dataKey="time" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}}
                                    />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px'}}
                                        itemStyle={{fontWeight: 'bold'}}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="users" 
                                        stroke="#6366f1" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorUsers)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Success Monitor: Prediction vs Reality */}
                <Card className="bg-slate-950 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-indigo-400">
                            <Target className="h-4 w-4" /> Success Monitor
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest">IA Prediction Accuracy</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={velocityStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} />
                                    <Tooltip 
                                        cursor={{fill: '#ffffff05'}}
                                        contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b', fontSize: '10px'}}
                                    />
                                    <Bar dataKey="conversions" name="Predicted" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="fillRate" name="Reality" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>                        <CardDescription className="text-[10px]">Tráfico de usuarios activos en tiempo real (últimas 24h)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={heartbeatData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorSegment" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="time" stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b' }} />
                                <Area type="monotone" dataKey="users" stroke="#6366f1" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} name="Total Platform" />
                                {heartbeatData[0]?.segment !== null && (
                                    <Area type="monotone" dataKey="segment" stroke="#10b981" fillOpacity={1} fill="url(#colorSegment)" strokeWidth={3} name="Filtered Segment" />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Game Distribution */}
                <Card className="bg-slate-950 border-border/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-400" /> Game Popularity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={gameDist}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {gameDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase opacity-40 italic">Meta</span>
                            <span className="text-lg font-black italic">FIFA</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Negotiation & Prediction Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-950 border-border/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                            <Target className="h-4 w-4 text-emerald-400" /> Tournament Fill Velocity
                        </CardTitle>
                        <CardDescription className="text-[10px]">Métrica clave para patrocinio: Tiempo de llenado vs Conversión</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={velocityStats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} width={60} />
                                <Tooltip 
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', fontSize: '10px' }} 
                                />
                                <Bar dataKey="fillRate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} name="Fill Rate %" />
                                <Bar dataKey="conversions" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Conv. Rate %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-border/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                            <MousePointer2 className="h-4 w-4 text-rose-400" /> Sponsor Engagement AI
                        </CardTitle>
                        <CardDescription className="text-[10px]">Data para negociar: Interacciones con marcas por torneo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {sponsorEngagement.map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 transition-hover hover:border-white/10">
                                    <span className="text-xs font-black italic tracking-tighter">{s.sponsor}</span>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Clicks</p>
                                            <p className="text-xs font-bold">{s.clicks?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">CTR</p>
                                            <p className={cn("text-xs font-bold", s.trend === 'up' ? 'text-emerald-500' : 'text-rose-500')}>{s.ctr}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
