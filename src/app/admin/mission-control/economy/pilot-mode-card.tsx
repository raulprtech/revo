"use client";

import { useState, useEffect } from "react";
import { getPilotMode, updatePilotMode } from "./actions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    BrainCircuit,
    Settings2,
    ToggleLeft,
    ToggleRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BurnMasterPilotCard() {
    const [pilotMode, setPilotMode] = useState({ enabled: false, threshold: 0.30 });
    const { toast } = useToast();

    useEffect(() => {
        getPilotMode().then(setPilotMode);
    }, []);

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

    const handleSaveThreshold = async () => {
        const res = await updatePilotMode(pilotMode);
        if (res.success) {
            toast({ title: "Configuración Guardada", description: "El umbral de intervención ha sido actualizado." });
        }
    };

    return (
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
                        <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold text-xs uppercase">Umbral de Intervención (Reserve Ratio &lt; X)</p>
                        <Input 
                            type="number" 
                            step="0.05"
                            value={pilotMode.threshold}
                            onChange={(e) => setPilotMode({...pilotMode, threshold: parseFloat(e.target.value)})}
                            className="bg-white/5 border-white/10 h-8 text-xs font-bold"
                        />
                    </div>
                    <Button size="sm" onClick={handleSaveThreshold} className="h-8 bg-indigo-600 text-[10px] font-black uppercase">
                        <Settings2 className="h-3 w-3 mr-1" /> Guardar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
