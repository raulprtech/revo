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
import { CalendarIcon, Loader2 } from "lucide-react";
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

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
  description: z.string().max(500).optional(),
  game: z.string().min(1, "El juego/deporte es obligatorio."),
  format: z.enum(["single-elimination", "double-elimination", "swiss"]),
  startDate: z.date({ required_error: "Se requiere una fecha de inicio." }),
  maxParticipants: z.coerce.number().min(2, "Se requieren al menos 2 participantes.").max(256),
  registrationType: z.enum(["public", "private"]),
  prizePool: z.string().optional(),
});

type CreateTournamentFormProps = {
    mode?: "create" | "edit";
    tournamentData?: z.infer<typeof formSchema> & { id: string };
};

export function CreateTournamentForm({ mode = "create", tournamentData }: CreateTournamentFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: tournamentData ? {
        ...tournamentData,
        startDate: new Date(tournamentData.startDate),
    } : {
      name: "",
      description: "",
      game: "",
      format: "single-elimination",
      registrationType: "public",
      maxParticipants: 16,
      prizePool: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    if (mode === 'create') {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
            toast({
                title: "Error",
                description: "Debes iniciar sesión para crear un torneo.",
                variant: "destructive"
            });
            setLoading(false);
            router.push('/login');
            return;
        }
        const user = JSON.parse(userStr);

        const newTournament = {
            id: new Date().getTime().toString(), // ID único simple
            ...values,
            ownerEmail: user.email,
            status: "Próximo",
            participants: 0,
            image: 'https://placehold.co/1200x400.png',
            dataAiHint: `${values.game} tournament`,
            avatar: `https://placehold.co/40x40.png?text=${values.game.substring(0,2)}`
        };

        const tournaments = JSON.parse(localStorage.getItem("tournaments") || "[]");
        tournaments.push(newTournament);
        localStorage.setItem("tournaments", JSON.stringify(tournaments));

        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
        toast({
            title: "¡Torneo Creado!",
            description: `Tu torneo "${values.name}" ahora está activo.`,
        });
        router.push(`/tournaments/${newTournament.id}`);
    } else if (mode === 'edit' && tournamentData) {
        const tournaments = JSON.parse(localStorage.getItem("tournaments") || "[]");
        const tournamentIndex = tournaments.findIndex(t => t.id === tournamentData.id);

        if (tournamentIndex !== -1) {
            const updatedTournament = {
                ...tournaments[tournamentIndex],
                ...values
            };
            tournaments[tournamentIndex] = updatedTournament;
            localStorage.setItem("tournaments", JSON.stringify(tournaments));
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLoading(false);
            toast({
                title: "¡Torneo Actualizado!",
                description: `Tu torneo "${values.name}" ha sido actualizado.`,
            });
            router.push(`/tournaments/${tournamentData.id}`);
            router.refresh();
        } else {
            setLoading(false);
            toast({
                title: "Error",
                description: "No se pudo encontrar el torneo para actualizar.",
                variant: "destructive"
            });
        }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
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
                name="prizePool"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Bolsa de Premios (Opcional)</FormLabel>
                    <FormControl>
                    <Input placeholder="ej., $1000, 50% de las inscripciones" {...field} />
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

        <div className="flex justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => router.back()} className="mr-2">
                Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Crear Torneo' : 'Guardar Cambios'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
