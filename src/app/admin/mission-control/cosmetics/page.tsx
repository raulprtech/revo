"use client";

import { useState, useEffect } from "react";
import { getCosmetics, upsertCosmetic, deleteCosmetic, getPilotMode, updatePilotMode } from "./actions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Package, 
    Plus, 
    Trash2, 
    Edit2, 
    Save, 
    X, 
    ShoppingBag, 
    Sparkles, 
    ShieldCheck, 
    BrainCircuit,
    Settings2,
    ToggleLeft,
    ToggleRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function CosmeticsManager() {
    const [items, setItems] = useState<any[]>([]);
    const [pilotMode, setPilotMode] = useState({ enabled: false, threshold: 0.30 });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [cosmetics, settings] = await Promise.all([getCosmetics(), getPilotMode()]);
        setItems(cosmetics);
        setPilotMode(settings);
        setIsLoading(false);
    };

    const handleSave = async (item: any) => {
        const res = await upsertCosmetic(item);
        if (res.success) {
            toast({ title: "Éxito", description: "Artículo guardado correctamente." });
            setEditingId(null);
            setNewItem(null);
            loadData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar este artículo?")) return;
        const res = await deleteCosmetic(id);
        if (res.success) {
            toast({ title: "Eliminado", description: "El artículo ha sido removido." });
            loadData();
        }
    };

    const handlePilotToggle = async () => {
        const newSettings = { ...pilotMode, enabled: !pilotMode.enabled };
        const res = await updatePilotMode(newSettings);
        if (res.success) {
            setPilotMode(newSettings);
            toast({ 
                title: newSettings.enabled ? "Modo Piloto Activado" : "Modo Piloto Desactivado", 
                description: newSettings.enabled ? "El Burn Master actuará autónomamente." : "Control manual restaurado."
            });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* AI Control Center */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-950 border-indigo-500/20">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4 text-indigo-400" /> Burn Master Pilot Mode
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={handlePilotToggle}>
                                {pilotMode.enabled ? (
                                    <ToggleRight className="h-6 w-6 text-emerald-500" />
                                ) : (
                                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                            Automatización económica basada en Reserve Ratio
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold">Umbral de Intervención (Reserve Ratio &lt; X)</p>
                                <Input 
                                    type="number" 
                                    step="0.05"
                                    value={pilotMode.threshold}
                                    onChange={(e) => setPilotMode({...pilotMode, threshold: parseFloat(e.target.value)})}
                                    className="bg-white/5 border-white/10 h-8 text-xs font-bold"
                                />
                            </div>
                            <Button size="sm" onClick={() => updatePilotMode(pilotMode)} className="h-8 bg-indigo-600 text-[10px] font-black uppercase">
                                <Settings2 className="h-3 w-3 mr-1" /> Guardar Umbral
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-emerald-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-emerald-400">
                            <ShieldCheck className="h-4 w-4" /> Estatus del Inventario
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <ShoppingBag className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-xl font-black italic">{items.length}</h4>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Productos Activos en Tienda</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Store Management Table */}
            <Card className="bg-slate-950 border-white/5">
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                    <div>
                        <CardTitle className="text-sm font-black uppercase">Inventario de Cosméticos</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Gestión de premios y artículos de la tienda</CardDescription>
                    </div>
                    <Button 
                        size="sm" 
                        onClick={() => setNewItem({ name: '', slug: '', price_coins: 100, rarity: 'common', stock: -1 })}
                        className="bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase"
                    >
                        <Plus className="h-3 w-3 mr-1" /> Nuevo Artículo
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-white/5 text-[9px] uppercase font-black tracking-widest text-muted-foreground border-b border-white/5">
                                <tr>
                                    <th className="px-4 py-3">Nombre / Slug</th>
                                    <th className="px-4 py-3">Precio (Coins)</th>
                                    <th className="px-4 py-3">Rareza</th>
                                    <th className="px-4 py-3">Stock</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {newItem && (
                                    <tr className="bg-indigo-500/5">
                                        <td className="px-4 py-3">
                                            <Input className="h-7 text-[10px] bg-black" placeholder="Nombre" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                                            <Input className="h-7 text-[10px] bg-black mt-1" placeholder="Slug" value={newItem.slug} onChange={e => setNewItem({...newItem, slug: e.target.value})} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Input type="number" className="h-7 text-[10px] bg-black" value={newItem.price_coins} onChange={e => setNewItem({...newItem, price_coins: parseInt(e.target.value)})} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select className="bg-black border border-white/10 rounded h-7 w-full p-1" value={newItem.rarity} onChange={e => setNewItem({...newItem, rarity: e.target.value})}>
                                                <option value="common">Common</option>
                                                <option value="rare">Rare</option>
                                                <option value="epic">Epic</option>
                                                <option value="legendary">Legendary</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Input type="number" className="h-7 text-[10px] bg-black" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value)})} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500" onClick={() => handleSave(newItem)}><Save className="h-3 w-3" /></Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => setNewItem(null)}><X className="h-3 w-3" /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-white">{item.name}</div>
                                            <div className="text-[9px] opacity-40 font-mono italic">{item.slug}</div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-indigo-400 font-bold">
                                            {item.price_coins} 
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={cn(
                                                "text-[8px] h-4 uppercase font-black",
                                                item.rarity === 'legendary' ? "text-amber-500 border-amber-500/20" : 
                                                item.rarity === 'epic' ? "text-purple-500 border-purple-500/20" :
                                                item.rarity === 'rare' ? "text-indigo-400 border-indigo-400/20" : ""
                                            )}>
                                                {item.rarity}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 italic">
                                            {item.stock === -1 ? 'Unlimited' : item.stock}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-white"><Edit2 className="h-3.5 w-3.5" /></Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500/50 hover:text-rose-500" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
