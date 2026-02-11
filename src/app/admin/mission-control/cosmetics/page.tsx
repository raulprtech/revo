"use client";

import { useState, useEffect } from "react";
import { getCosmetics, upsertCosmetic, deleteCosmetic } from "./actions";
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
    ShieldCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function CosmeticsManager() {
    const [items, setItems] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const cosmetics = await getCosmetics();
        setItems(cosmetics);
        setIsLoading(false);
    };

    const handleSave = async (item: any) => {
        try {
            const res = await upsertCosmetic(item);
            if (res.success) {
                toast({ title: "Éxito", description: "Artículo guardado correctamente." });
                setEditingId(null);
                setNewItem(null);
                loadData();
            } else {
                toast({ title: "Error", description: res.error || "No se pudo guardar el artículo.", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error de red", description: "No se pudo conectar con el servidor.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar este artículo?")) return;
        try {
            const res = await deleteCosmetic(id);
            if (res.success) {
                toast({ title: "Eliminado", description: "El artículo ha sido removido." });
                loadData();
            } else {
                toast({ title: "Error", description: res.error || "No se pudo eliminar.", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error de red", description: "No se pudo conectar con el servidor.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Inventory Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-950 border-emerald-500/20 col-span-1">
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
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Productos Activos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-950 border-indigo-500/20 col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-indigo-400">
                            <Sparkles className="h-4 w-4" /> Economía de Cosméticos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-8">
                        <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Total Burn Potential</p>
                            <p className="text-lg font-black italic text-indigo-300">
                                {items.reduce((acc, item) => acc + ((item.price || 0) * (item.stock === -1 ? 0 : item.stock)), 0).toLocaleString()} 
                                <span className="text-[10px] ml-1">DC</span>
                            </p>
                        </div>
                        <div className="h-10 w-px bg-white/5" />
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Distribución de Rareza</p>
                            <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                                {['common', 'rare', 'epic', 'legendary'].map(r => {
                                    const count = items.filter(i => i.rarity === r).length;
                                    const pct = items.length > 0 ? (count / items.length) * 100 : 0;
                                    return (
                                        <div 
                                            key={r}
                                            className={cn(
                                                "h-full transition-all",
                                                r === 'common' ? "bg-slate-500" :
                                                r === 'rare' ? "bg-indigo-500" :
                                                r === 'epic' ? "bg-purple-500" : "bg-amber-500"
                                            )}
                                            style={{ width: `${pct}%` }}
                                        />
                                    );
                                })}
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
                        onClick={() => setNewItem({ name: '', slug: '', price: 100, rarity: 'common', stock: -1 })}
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
                                            <Input type="number" className="h-7 text-[10px] bg-black" value={newItem.price} onChange={e => setNewItem({...newItem, price: parseInt(e.target.value) || 0})} />
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
                                            {item.price} 
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
