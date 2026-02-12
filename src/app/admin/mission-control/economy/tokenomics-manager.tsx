"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Coins, 
    Zap, 
    Save, 
    Plus, 
    Trash2, 
    Settings2, 
    Percent, 
    DollarSign, 
    Landmark,
    Loader2,
    RefreshCw,
    Copy,
    ChevronDown,
    PlusCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/database";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TokenomicsManager() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Platform Settings
    const [withdrawalFees, setWithdrawalFees] = useState({ fixed: 15, percentage: 3 });
    const [coinsSpreads, setCoinsSpreads] = useState({ standard_percent: 10, pro_percent: 5 });

    // Plans
    const [plans, setPlans] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const wFees = await db.getPlatformSettings<any>("withdrawal_fees");
            const cSpreads = await db.getPlatformSettings<any>("coins_spreads");
            const dbPlans = await db.getSubscriptionPlans();

            if (wFees) setWithdrawalFees(wFees);
            if (cSpreads) setCoinsSpreads(cSpreads);
            setPlans(dbPlans);
        } catch (error) {
            console.error("Error loading tokenomics data:", error);
            toast({ title: "Error", description: "No se pudieron cargar los datos de tokenomics", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await db.updatePlatformSettings("withdrawal_fees", withdrawalFees);
            await db.updatePlatformSettings("coins_spreads", coinsSpreads);
            toast({ title: "Configuración Guardada", description: "Los montos y spreads han sido actualizados." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar la configuración", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePlan = (id: string, updates: any) => {
        setPlans(plans.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const handleCopyFeatures = (targetGroupId: string, sourceFeatures: string[]) => {
        const group = getGroupedPlans().find(g => g.baseId === targetGroupId);
        if (group) {
            const newHighlights = Array.from(new Set([...group.highlights, ...sourceFeatures]));
            group.variants.forEach((v: any) => handleUpdatePlan(v.id, { highlights: newHighlights }));
            toast({ title: "Beneficios Copiados", description: `Se han añadido ${sourceFeatures.length} características.` });
        }
    };

    const handleAddPlan = async () => {
        const baseId = `p${Math.random().toString(36).substring(2, 6)}`;
        const basePrice = 199;

        const newPlans = [
            {
                id: `${baseId}_monthly`,
                name: "Nuevo Plan",
                tagline: "Gestión para organizadores",
                price: basePrice,
                currency: "MXN",
                billing_period: "monthly",
                badge: "⚡",
                highlights: ["Beneficio 1", "Beneficio 2"],
                cta_text: "Comenzar Plus",
                cta_variant: "default",
                order_index: plans.length,
                is_popular: false
            },
            {
                id: `${baseId}_yearly`,
                name: "Nuevo Plan Anual",
                tagline: "Ahorra ~20% con facturación anual",
                price: Math.round(basePrice * 12 * 0.8),
                currency: "MXN",
                billing_period: "yearly",
                badge: "⚡",
                highlights: ["Beneficio 1", "Beneficio 2"],
                cta_text: "Suscribirse Anual",
                cta_variant: "default",
                order_index: plans.length + 1,
                is_popular: false
            },
            {
                id: `${baseId}_event`,
                name: "Nuevo Plan p/ Evento",
                tagline: "Acceso Plus para un solo torneo",
                price: Math.round(basePrice * 1.5),
                currency: "MXN",
                billing_period: "one-time",
                badge: "⚡",
                highlights: ["Beneficio 1", "Beneficio 2"],
                cta_text: "Comprar p/ Evento",
                cta_variant: "outline",
                order_index: plans.length + 2,
                is_popular: false
            }
        ];
        
        setSaving(true);
        try {
            for (const p of newPlans) {
                await db.addSubscriptionPlan(p);
            }
            setPlans([...plans, ...newPlans]);
            toast({ 
                title: "Nuevo Nivel de Suscripción", 
                description: "Se han creado automáticamente las variantes Mensual, Anual y Por Evento." 
            });
        } catch (error: any) {
            console.error("Error creating plan level:", error);
            toast({ 
                title: "Error al crear", 
                description: error.message || "Error desconocido", 
                variant: "destructive" 
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este plan?")) return;
        
        setSaving(true);
        try {
            await db.deleteSubscriptionPlan(id);
            setPlans(plans.filter(p => p.id !== id));
            toast({ title: "Plan Eliminado", description: "El plan ha sido removido correctamente." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar el plan", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleSavePlans = async (id?: string) => {
        setSaving(true);
        try {
            if (id && typeof id === 'string') {
                // Save single plan
                const plan = plans.find(p => p.id === id);
                if (plan) await db.updateSubscriptionPlan(id, plan);
            } else {
                // Save all plans
                for (const plan of plans) {
                    await db.updateSubscriptionPlan(plan.id, plan);
                }
            }
            toast({ title: "Cambios Guardados", description: "Los planes han sido actualizados." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron guardar los cambios", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    // Helper to group plans by sibling IDs (e.g., plus_monthly & plus_yearly)
    const getGroupedPlans = () => {
        const groups: Record<string, any> = {};
        
        plans.forEach(plan => {
            // Grouping logic: "plus_monthly" -> "plus", "community" -> "community"
            const baseId = plan.id.includes('_') ? plan.id.split('_')[0] : plan.id;
            
            if (!groups[baseId]) {
                groups[baseId] = {
                    baseId,
                    name: plan.name.replace(' Anual', '').replace(' Mensual', ''),
                    tagline: plan.tagline,
                    badge: plan.badge,
                    highlights: plan.highlights || [],
                    is_popular: plan.is_popular,
                    variants: []
                };
            }
            groups[baseId].variants.push(plan);
        });
        
        return Object.values(groups);
    };

    if (loading) {
        return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Withdrawal Fees */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-primary" />
                            Comisiones de Retiro
                        </CardTitle>
                        <CardDescription>
                            Configura el monto fijo y el spread variable para los retiros de efectivo (Duels Cash).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Comisión Fija (MXN)</Label>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <Input 
                                    type="number" 
                                    value={withdrawalFees.fixed} 
                                    onChange={(e) => setWithdrawalFees({ ...withdrawalFees, fixed: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Spread Variable (%)</Label>
                            <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <Input 
                                    type="number" 
                                    value={withdrawalFees.percentage} 
                                    onChange={(e) => setWithdrawalFees({ ...withdrawalFees, percentage: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 pt-6">
                        <div className="text-xs text-muted-foreground italic">
                            Fórmula: Monto Neto = Monto Solicitado - ({withdrawalFees.fixed} + {withdrawalFees.percentage}%)
                        </div>
                    </CardFooter>
                </Card>

                {/* Coins Spreads */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Coins className="h-5 w-5 text-amber-500" />
                            Spreads de Duels Coins
                        </CardTitle>
                        <CardDescription>
                            Define el margen incluido en el precio de las monedas para usuarios normales y suscriptores de pago.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Spread Estándar (%)</Label>
                            <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <Input 
                                    type="number" 
                                    value={coinsSpreads.standard_percent} 
                                    onChange={(e) => setCoinsSpreads({ ...coinsSpreads, standard_percent: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Spread Pro / Suscriptor (%)</Label>
                            <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <Input 
                                    type="number" 
                                    value={coinsSpreads.pro_percent} 
                                    onChange={(e) => setCoinsSpreads({ ...coinsSpreads, pro_percent: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>
                    </CardContent>
                     <CardFooter className="bg-muted/30 pt-6">
                        <div className="text-xs text-muted-foreground italic">
                            Los suscriptores verán la diferencia como un "Descuento Especial".
                        </div>
                    </CardFooter>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar Configuración de Spreads
                </Button>
            </div>

            {/* Plans Management */}
            <div className="pt-8 border-t">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold font-headline">Planes de Suscripción</h3>
                        <p className="text-muted-foreground italic text-sm">Gestiona los precios, beneficios y destaques de cada nivel.</p>
                    </div>
                    <Button onClick={handleAddPlan} disabled={saving} variant="outline" size="sm" className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 
                        Nuevo Plan
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                    {getGroupedPlans().map((group) => (
                        <Card key={group.baseId} className={group.is_popular ? "border-primary/50 bg-primary/5 shadow-lg" : ""}>
                            <CardHeader className="flex flex-row justify-between items-start">
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] font-black">{group.badge} {group.baseId.toUpperCase()}</Badge>
                                        {group.is_popular && <Badge className="bg-primary text-[10px] font-bold">Populares</Badge>}
                                    </div>
                                    <Input 
                                        value={group.name} 
                                        onChange={(e) => {
                                            group.variants.forEach((v: any) => handleUpdatePlan(v.id, { name: e.target.value }));
                                        }}
                                        className="font-bold text-xl h-auto p-1 bg-transparent border-none focus-visible:ring-1"
                                    />
                                    <Input 
                                        value={group.tagline} 
                                        onChange={(e) => {
                                            group.variants.forEach((v: any) => handleUpdatePlan(v.id, { tagline: e.target.value }));
                                        }}
                                        className="text-xs text-muted-foreground h-auto p-1 bg-transparent border-none focus-visible:ring-1 w-full"
                                    />
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Pricing Variants */}
                                <div className="grid grid-cols-1 gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Precios y Periodos</Label>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-5 text-[8px] uppercase font-bold text-primary hover:bg-primary/10"
                                            onClick={() => {
                                                const monthly = group.variants.find((v: any) => v.billing_period === 'monthly');
                                                if (monthly) {
                                                    const mPrice = monthly.price;
                                                    group.variants.forEach((v: any) => {
                                                        if (v.billing_period === 'yearly') handleUpdatePlan(v.id, { price: Math.round(mPrice * 12 * 0.8) });
                                                        if (v.billing_period === 'one-time') handleUpdatePlan(v.id, { price: Math.round(mPrice * 1.5) });
                                                    });
                                                    toast({ title: "Precios Sincronizados", description: "Variantes actualizadas según el precio mensual (Anual -20%, Evento 1.5x)." });
                                                }
                                            }}
                                        >
                                            <RefreshCw className="h-2 w-2 mr-1" /> Sincronizar Variantes
                                        </Button>
                                    </div>
                                    {group.variants.map((variant: any) => (
                                        <div key={variant.id} className="flex items-center gap-3 bg-card p-2 rounded border border-border/50">
                                            <div className="flex-1">
                                                 <div className="flex items-center gap-1">
                                                    <span className="text-xs font-bold text-muted-foreground">$</span>
                                                    <Input 
                                                        type="number"
                                                        value={variant.price}
                                                        onChange={(e) => handleUpdatePlan(variant.id, { price: parseFloat(e.target.value) })}
                                                        className="h-7 w-24 font-bold text-sm"
                                                    />
                                                    <Badge variant="secondary" className="text-[9px] h-5 uppercase">
                                                        {variant.billing_period}
                                                    </Badge>
                                                 </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    onClick={() => handleSavePlans(variant.id)}
                                                    disabled={saving}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2 text-[10px] uppercase font-bold text-primary hover:bg-primary/10"
                                                >
                                                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
                                                </Button>
                                                <Button 
                                                    onClick={() => handleDeletePlan(variant.id)}
                                                    disabled={saving}
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive/50 hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Common Features */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Características Compartidas</Label>
                                        
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 px-2 font-bold uppercase hover:bg-primary/10 text-primary">
                                                    <Copy className="h-3 w-3" /> Heredar de...
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-50">Planes Existentes</DropdownMenuLabel>
                                                {getGroupedPlans().filter(g => g.baseId !== group.baseId).map(other => (
                                                    <DropdownMenuItem 
                                                        key={other.baseId} 
                                                        onClick={() => handleCopyFeatures(group.baseId, other.highlights)}
                                                        className="flex items-center justify-between cursor-pointer"
                                                    >
                                                        <span className="text-xs font-semibold">{other.name}</span>
                                                        <Badge variant="outline" className="text-[8px] h-4">{other.highlights.length} feats</Badge>
                                                    </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    onClick={() => handleCopyFeatures(group.baseId, ["Todo lo de Community"])}
                                                    className="text-xs font-bold text-primary cursor-pointer"
                                                >
                                                    <PlusCircle className="h-3 w-3 mr-2" /> "Todo lo de Community"
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleCopyFeatures(group.baseId, ["Todo lo de Organizer Plus"])}
                                                    className="text-xs font-bold text-primary cursor-pointer"
                                                >
                                                    <PlusCircle className="h-3 w-3 mr-2" /> "Todo lo de Organizer Plus"
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="space-y-2">
                                        {group.highlights?.map((highlight: string, idx: number) => (
                                            <div key={idx} className="flex gap-2 items-center group/item">
                                                <Zap className="h-3 w-3 text-primary shrink-0" />
                                                <Input 
                                                    value={highlight} 
                                                    onChange={(e) => {
                                                        const newHighlights = [...group.highlights];
                                                        newHighlights[idx] = e.target.value;
                                                        group.variants.forEach((v: any) => handleUpdatePlan(v.id, { highlights: newHighlights }));
                                                    }}
                                                    className="h-7 text-xs bg-transparent border-none focus-visible:ring-1 flex-1"
                                                />
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-destructive/30 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        const newHighlights = group.highlights.filter((_: any, i: number) => i !== idx);
                                                        group.variants.forEach((v: any) => handleUpdatePlan(v.id, { highlights: newHighlights }));
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-[10px] h-6 uppercase font-bold text-primary w-full border border-dashed border-primary/20 hover:bg-primary/5"
                                            onClick={() => {
                                                const newHighlights = [...(group.highlights || []), "Nuevo beneficio..."];
                                                group.variants.forEach((v: any) => handleUpdatePlan(v.id, { highlights: newHighlights }));
                                            }}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Añadir Beneficio
                                        </Button>
                                    </div>
                                </div>
                                {/* Discounts & Custom Fields (Metadata) */}
                                <div className="space-y-3 pt-2 border-t border-border/50">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                                        <Settings2 className="h-3 w-3" /> Descuentos y Configuración
                                    </Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase opacity-70">Desc. Monedas (%)</Label>
                                            <div className="flex items-center gap-2">
                                                <Percent className="h-3 w-3 text-muted-foreground" />
                                                <Input 
                                                    type="number"
                                                    value={group.variants[0]?.metadata?.coins_discount || 0}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        group.variants.forEach((v: any) => handleUpdatePlan(v.id, { 
                                                            metadata: { ...(v.metadata || {}), coins_discount: val } 
                                                        }));
                                                    }}
                                                    className="h-7 text-xs font-bold"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase opacity-70">Desc. Retiro (%)</Label>
                                            <div className="flex items-center gap-2">
                                                <Percent className="h-3 w-3 text-muted-foreground" />
                                                <Input 
                                                    type="number"
                                                    value={group.variants[0]?.metadata?.withdrawal_discount || 0}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        group.variants.forEach((v: any) => handleUpdatePlan(v.id, { 
                                                            metadata: { ...(v.metadata || {}), withdrawal_discount: val } 
                                                        }));
                                                    }}
                                                    className="h-7 text-xs font-bold"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] uppercase opacity-70">Desc. Tickets de Entradas (%)</Label>
                                        <div className="flex items-center gap-2">
                                            <Percent className="h-3 w-3 text-muted-foreground" />
                                            <Input 
                                                type="number"
                                                value={group.variants[0]?.metadata?.tickets_discount || 0}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    group.variants.forEach((v: any) => handleUpdatePlan(v.id, { 
                                                        metadata: { ...(v.metadata || {}), tickets_discount: val } 
                                                    }));
                                                }}
                                                className="h-7 text-xs font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex justify-between items-center bg-muted/20 py-3 border-t">
                                <div className="flex items-center gap-2">
                                    <Label className="text-[10px] font-bold">Resaltar como Popular</Label>
                                    <input 
                                        type="checkbox" 
                                        checked={group.is_popular} 
                                        onChange={(e) => {
                                            group.variants.forEach((v: any) => handleUpdatePlan(v.id, { is_popular: e.target.checked }));
                                        }} 
                                        className="rounded border-border"
                                    />
                                </div>
                                <Button 
                                    onClick={() => {
                                        group.variants.forEach(async (v: any) => {
                                            await db.updateSubscriptionPlan(v.id, v);
                                        });
                                        toast({ title: "Grupo Actualizado", description: "Todos los cambios del grupo se han guardado." });
                                    }} 
                                    disabled={saving} 
                                    size="sm" 
                                    className="h-8 gap-1 text-[10px] uppercase font-bold px-4"
                                >
                                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                    Actualizar Todo el Grupo
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
