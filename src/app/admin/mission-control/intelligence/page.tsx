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

export default function PlatformIntelligence() {
    const [heartbeatData, setHeartbeatData] = useState<any[]>([]);
    const [velocityStats, setVelocityStats] = useState<any[]>([]);
    const [gameDist, setGameDist] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        // Mocking real data structure for visualization pre-migration execution
        const mockHeartbeat = Array.from({ length: 24 }, (_, i) => ({
            time: `${i}:00`,
            users: Math.floor(Math.random() * 500) + 200,
            matches: Math.floor(Math.random() * 50) + 10,
        }));
        setHeartbeatData(mockHeartbeat);

        const mockVelocity = [
            { name: 'FIFA', fillTime: 120, conversions: 85, fillRate: 98 },
            { name: 'KOF', fillTime: 450, conversions: 40, fillRate: 65 },
            { name: 'Smash', fillTime: 180, conversions: 75, fillRate: 92 },
            { name: 'M. Kart', fillTime: 300, conversions: 55, fillRate: 78 },
        ];
        setVelocityStats(mockVelocity);

        const mockGames = [
            { name: 'FIFA', value: 400, color: '#0ea5e9' },
            { name: 'Street Fighter', value: 300, color: '#f43f5e' },
            { name: 'KOF', value: 200, color: '#8b5cf6' },
            { name: 'Otros', value: 100, color: '#64748b' },
        ];
        setGameDist(mockGames);
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                                <h3 className="text-2xl font-black text-white italic">$8.4k</h3>
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

                <Card className="bg-slate-950 border-rose-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Platform Hype</p>
                                <h3 className="text-2xl font-black text-white italic">HIGH</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                <Zap className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 text-[10px] text-rose-400 font-bold uppercase">
                            9 Concurrent Events
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
                        <CardDescription className="text-[10px]">Tráfico de usuarios activos en tiempo real (últimas 24h)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={heartbeatData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="time" stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b' }} />
                                <Area type="monotone" dataKey="users" stroke="#6366f1" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} />
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
                            {[
                                { sponsor: 'Red Bull', clicks: 4202, ctr: '8.4%', trend: 'up' },
                                { sponsor: 'Logitech G', clicks: 2840, ctr: '6.2%', trend: 'up' },
                                { sponsor: 'Monster', clicks: 1205, ctr: '3.1%', trend: 'down' }
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 transition-hover hover:border-white/10">
                                    <span className="text-xs font-black italic tracking-tighter">{s.sponsor}</span>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Clicks</p>
                                            <p className="text-xs font-bold">{s.clicks.toLocaleString()}</p>
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
