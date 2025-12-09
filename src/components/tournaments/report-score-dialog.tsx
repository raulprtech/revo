"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Loader2, Trophy, Target, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Configuration for different game modes
const GAME_MODE_SCORING: Record<string, {
  label: string;
  description: string;
  scoreType: 'points' | 'games' | 'rounds' | 'sets' | 'position';
  bestOf?: number;
  maxScore?: number;
  icon: 'trophy' | 'target' | 'gamepad';
}> = {
  // FIFA modes
  '1v1': { 
    label: 'Goles', 
    description: 'Ingresa los goles de cada jugador',
    scoreType: 'points',
    maxScore: 20,
    icon: 'target'
  },
  '2v2': { 
    label: 'Goles', 
    description: 'Ingresa los goles de cada equipo',
    scoreType: 'points',
    maxScore: 20,
    icon: 'target'
  },
  'pro-clubs': { 
    label: 'Goles', 
    description: 'Ingresa los goles del partido',
    scoreType: 'points',
    maxScore: 15,
    icon: 'target'
  },
  'fut-draft': { 
    label: 'Goles', 
    description: 'Ingresa los goles del partido',
    scoreType: 'points',
    maxScore: 20,
    icon: 'target'
  },
  // Fighting games - FT formats
  '1v1-ft2': { 
    label: 'Victorias', 
    description: 'First to 2 - Ingresa las rondas ganadas (máx 3)',
    scoreType: 'rounds',
    bestOf: 3,
    maxScore: 2,
    icon: 'trophy'
  },
  '1v1-ft3': { 
    label: 'Victorias', 
    description: 'First to 3 - Ingresa las rondas ganadas (máx 5)',
    scoreType: 'rounds',
    bestOf: 5,
    maxScore: 3,
    icon: 'trophy'
  },
  '1v1-ft5': { 
    label: 'Victorias', 
    description: 'First to 5 - Ingresa las rondas ganadas (máx 9)',
    scoreType: 'rounds',
    bestOf: 9,
    maxScore: 5,
    icon: 'trophy'
  },
  '3v3-team': { 
    label: 'Victorias', 
    description: 'Ingresa las victorias del equipo',
    scoreType: 'games',
    maxScore: 3,
    icon: 'trophy'
  },
  'round-robin-team': { 
    label: 'Victorias', 
    description: 'Ingresa las victorias en el round robin',
    scoreType: 'games',
    maxScore: 5,
    icon: 'trophy'
  },
  // Smash Bros
  '1v1-stocks': { 
    label: 'Juegos', 
    description: 'Ingresa los juegos ganados (Bo3/Bo5)',
    scoreType: 'games',
    bestOf: 3,
    maxScore: 3,
    icon: 'gamepad'
  },
  '1v1-time': { 
    label: 'KOs', 
    description: 'Ingresa el conteo de KOs',
    scoreType: 'points',
    maxScore: 99,
    icon: 'target'
  },
  '2v2-teams': { 
    label: 'Juegos', 
    description: 'Ingresa los juegos ganados por equipo',
    scoreType: 'games',
    maxScore: 3,
    icon: 'gamepad'
  },
  'free-for-all': { 
    label: 'Posición', 
    description: 'Ingresa la posición final (1-8)',
    scoreType: 'position',
    maxScore: 8,
    icon: 'trophy'
  },
  // Mario Kart
  'grand-prix': { 
    label: 'Puntos', 
    description: 'Ingresa los puntos totales del Grand Prix',
    scoreType: 'points',
    maxScore: 60,
    icon: 'target'
  },
  'vs-race': { 
    label: 'Puntos', 
    description: 'Ingresa los puntos de la carrera',
    scoreType: 'points',
    maxScore: 15,
    icon: 'target'
  },
  'battle-mode': { 
    label: 'Puntos', 
    description: 'Ingresa los puntos de batalla',
    scoreType: 'points',
    maxScore: 100,
    icon: 'target'
  },
  'team-race': { 
    label: 'Puntos', 
    description: 'Ingresa los puntos del equipo',
    scoreType: 'points',
    maxScore: 60,
    icon: 'target'
  },
  // Clash Royale
  '1v1-ladder': { 
    label: 'Coronas', 
    description: 'Ingresa las coronas destruidas (0-3)',
    scoreType: 'points',
    maxScore: 3,
    icon: 'trophy'
  },
  '1v1-tournament': { 
    label: 'Victorias', 
    description: 'Ingresa las victorias en el set (Bo3)',
    scoreType: 'games',
    bestOf: 3,
    maxScore: 2,
    icon: 'trophy'
  },
  'draft': { 
    label: 'Victorias', 
    description: 'Ingresa las victorias en el draft',
    scoreType: 'games',
    maxScore: 3,
    icon: 'trophy'
  },
};

const getScoreSchema = (gameMode?: string) => {
  const config = gameMode ? GAME_MODE_SCORING[gameMode] : undefined;
  const maxScore = config?.maxScore || 100;
  
  return z.object({
    topScore: z.coerce.number()
      .min(0, "El puntaje debe ser no negativo.")
      .max(maxScore, `Máximo ${maxScore} puntos.`),
    bottomScore: z.coerce.number()
      .min(0, "El puntaje debe ser no negativo.")
      .max(maxScore, `Máximo ${maxScore} puntos.`),
  }).refine(data => data.topScore !== data.bottomScore, {
    message: "Los puntajes no pueden ser iguales (no se permiten empates).",
    path: ["topScore"],
  });
};

type ReportScoreDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: number;
    top: { name: string };
    bottom: { name: string };
  };
  onScoreReported: (scores: { top: number; bottom: number }) => void;
  gameMode?: string;
};

export function ReportScoreDialog({ isOpen, onOpenChange, match, onScoreReported, gameMode }: ReportScoreDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const modeConfig = gameMode ? GAME_MODE_SCORING[gameMode] : undefined;
  const scoreLabel = modeConfig?.label || 'Puntos';
  const scoreDescription = modeConfig?.description || 'Ingresa el puntaje de cada jugador';
  const bestOf = modeConfig?.bestOf;

  const reportScoreSchema = useMemo(() => getScoreSchema(gameMode), [gameMode]);

  const form = useForm<z.infer<typeof reportScoreSchema>>({
    resolver: zodResolver(reportScoreSchema),
    defaultValues: {
      topScore: 0,
      bottomScore: 0,
    },
  });

  const getIcon = () => {
    switch (modeConfig?.icon) {
      case 'trophy': return <Trophy className="h-4 w-4" />;
      case 'target': return <Target className="h-4 w-4" />;
      case 'gamepad': return <Gamepad2 className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  async function onSubmit(values: z.infer<typeof reportScoreSchema>) {
    setLoading(true);
    // Simulación de una llamada a la API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onScoreReported({ top: values.topScore, bottom: values.bottomScore });
    
    setLoading(false);
    onOpenChange(false);
    toast({
        title: "Resultado Reportado",
        description: `El resultado para ${match.top.name} vs ${match.bottom.name} ha sido enviado.`,
    });
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!loading) {
        onOpenChange(open);
        if (!open) form.reset();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            Reportar Resultado de Partida
            {gameMode && (
              <Badge variant="secondary" className="text-xs ml-auto">
                {gameMode} {bestOf && `(Bo${bestOf})`}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Ingresa el resultado final para la partida entre {match.top.name} y {match.bottom.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <p className="text-sm text-muted-foreground">{scoreDescription}</p>
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="topScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span className="truncate">{match.top.name}</span>
                        <span className="text-xs text-muted-foreground">{scoreLabel}</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          min={0}
                          max={modeConfig?.maxScore || 100}
                          className="text-center text-lg font-bold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="bottomScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span className="truncate">{match.bottom.name}</span>
                        <span className="text-xs text-muted-foreground">{scoreLabel}</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          min={0}
                          max={modeConfig?.maxScore || 100}
                          className="text-center text-lg font-bold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Resultado
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
