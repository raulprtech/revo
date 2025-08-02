"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const stepOneSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
  description: z.string().max(500).optional(),
  game: z.string().min(1, "El juego/deporte es obligatorio."),
});

const stepTwoSchema = z.object({
  format: z.enum(["single-elimination", "double-elimination", "swiss"]),
  startDate: z.date({ required_error: "Se requiere una fecha de inicio." }),
  maxParticipants: z.coerce.number().min(2, "Se requieren al menos 2 participantes.").max(256),
  registrationType: z.enum(["public", "private"]),
});

const formSchema = stepOneSchema.merge(stepTwoSchema);

export function CreateTournamentForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(step === 1 ? stepOneSchema : formSchema),
    defaultValues: {
      name: "",
      description: "",
      game: "",
      format: "single-elimination",
      registrationType: "public",
      maxParticipants: 16,
    },
  });

  const handleNext = async () => {
    const isValid = await form.trigger(["name", "game"]);
    if (isValid) {
      setStep(2);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    console.log("Creando torneo:", values);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    toast({
        title: "¡Torneo Creado!",
        description: `Tu torneo "${values.name}" ahora está activo.`,
    });
    router.push(`/tournaments/1`); // Redirigir a una página de torneo de ejemplo
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="relative overflow-hidden">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in-0 zoom-in-95">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Torneo</FormLabel>
                      <FormControl>
                        <Input placeholder="ej., Summer Showdown 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Una breve descripción de tu torneo." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="game"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Juego / Deporte</FormLabel>
                      <FormControl>
                        <Input placeholder="ej., Street Fighter 6, Ajedrez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in-0 zoom-in-95">
                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Formato del Torneo</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <SelectTrigger>
                             <SelectValue placeholder="Selecciona un formato" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="single-elimination">Eliminación Simple</SelectItem>
                             <SelectItem value="double-elimination">Doble Eliminación</SelectItem>
                             <SelectItem value="swiss">Suizo</SelectItem>
                           </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Inicio</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Elige una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            locale={es}
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0,0,0,0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Participantes</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="registrationType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Inscripción</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="public" />
                            </FormControl>
                            <FormLabel className="font-normal">Pública</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="private" />
                            </FormControl>
                            <FormLabel className="font-normal">Privada</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
        </div>

        <div className="flex justify-between pt-4">
          {step === 1 ? (
             <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancelar
             </Button>
          ) : (
             <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Atrás
             </Button>
          )}

          {step === 1 ? (
            <Button type="button" onClick={handleNext}>
              Siguiente
            </Button>
          ) : (
            <Button type="submit" disabled={loading}>
               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Torneo
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
