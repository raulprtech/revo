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
import { useState } from "react";
import { Loader2 } from "lucide-react";

const reportScoreSchema = z.object({
  topScore: z.coerce.number().min(0, "El puntaje debe ser no negativo."),
  bottomScore: z.coerce.number().min(0, "El puntaje debe ser no negativo."),
}).refine(data => data.topScore !== data.bottomScore, {
  message: "Los puntajes no pueden ser iguales (no se permiten empates).",
  path: ["topScore"],
});

type ReportScoreDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: number;
    top: { name: string };
    bottom: { name: string };
  };
  onScoreReported: (scores: { top: number; bottom: number }) => void;
};

export function ReportScoreDialog({ isOpen, onOpenChange, match, onScoreReported }: ReportScoreDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reportScoreSchema>>({
    resolver: zodResolver(reportScoreSchema),
    defaultValues: {
      topScore: 0,
      bottomScore: 0,
    },
  });

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
          <DialogTitle>Reportar Resultado de Partida</DialogTitle>
          <DialogDescription>
            Ingresa el resultado final para la partida entre {match.top.name} y {match.bottom.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="topScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{match.top.name}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <FormLabel>{match.bottom.name}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
