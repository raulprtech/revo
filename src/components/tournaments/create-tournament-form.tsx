
"use client";

import { useState, useRef } from "react";
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
import { CalendarIcon, Loader2, Upload, X } from "lucide-react";
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
import { db, type CreateTournamentData } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
  description: z.string().max(500).optional(),
  game: z.string().min(1, "El juego/deporte es obligatorio."),
  format: z.enum(["single-elimination", "double-elimination", "swiss"]),
  startDate: z.date({ required_error: "Se requiere una fecha de inicio." }),
  startTime: z.string().min(1, "Se requiere una hora de inicio."),
  maxParticipants: z.coerce.number().min(2, "Se requieren al menos 2 participantes.").max(256),
  registrationType: z.enum(["public", "private"]),
  prizePool: z.string().optional(),
  location: z.string().min(1, "La ubicación es obligatoria.").optional(),
  image: z.string().optional(),
});

type CreateTournamentFormProps = {
    mode?: "create" | "edit";
    tournamentData?: z.infer<typeof formSchema> & { id: string };
};

export function CreateTournamentForm({ mode = "create", tournamentData }: CreateTournamentFormProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(tournamentData?.image || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: tournamentData ? {
        ...tournamentData,
        startDate: new Date(tournamentData.startDate),
        startTime: tournamentData.startTime ?? '10:00',
        description: tournamentData.description ?? '',
        prizePool: tournamentData.prizePool ?? '',
        location: tournamentData.location ?? '',
        image: tournamentData.image ?? '',
    } : {
      name: "",
      description: "",
      game: "",
      format: "single-elimination",
      registrationType: "public",
      maxParticipants: 16,
      prizePool: "",
      location: "",
      startDate: new Date(),
      startTime: "10:00",
      image: "",
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Archivo muy grande",
          description: "La imagen debe ser menor a 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        form.setValue("image", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    form.setValue("image", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      if (mode === 'create') {
        // Get current user from Supabase
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          toast({
            title: "Error",
            description: "Debes iniciar sesión para crear un torneo.",
            variant: "destructive"
          });
          setLoading(false);
          router.push('/login');
          return;
        }

        const tournamentData: CreateTournamentData = {
          name: values.name,
          description: values.description,
          game: values.game,
          max_participants: values.maxParticipants,
          start_date: values.startDate.toISOString(),
          start_time: values.startTime,
          format: values.format,
          status: "Próximo",
          owner_email: user.email!,
          image: values.image || '',
          data_ai_hint: `${values.game} tournament`,
          registration_type: values.registrationType,
          prize_pool: values.prizePool,
          location: values.location,
          invited_users: values.registrationType === 'private' ? [] : undefined
        };

        const newTournament = await db.createTournament(tournamentData);

        toast({
          title: "¡Torneo Creado!",
          description: `Tu torneo "${values.name}" ahora está activo.`,
        });
        router.push(`/tournaments/${newTournament.id}`);
      } else if (mode === 'edit' && tournamentData) {
        const updateData = {
          name: values.name,
          description: values.description,
          game: values.game,
          max_participants: values.maxParticipants,
          start_date: values.startDate.toISOString(),
          start_time: values.startTime,
          format: values.format,
          image: values.image || tournamentData.image,
          data_ai_hint: `${values.game} tournament`,
          registration_type: values.registrationType,
          prize_pool: values.prizePool,
          location: values.location,
        };

        await db.updateTournament(tournamentData.id, updateData);

        toast({
          title: "Torneo Actualizado",
          description: `Tu torneo "${values.name}" ha sido actualizado correctamente.`,
        });
        router.push(`/tournaments/${tournamentData.id}`);
      }
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al guardar el torneo. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
                name="startTime"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Hora de Inicio</FormLabel>
                    <FormControl>
                    <Input type="time" {...field} />
                    </FormControl>
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
                name="location"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Ubicación (Opcional)</FormLabel>
                    <FormControl>
                    <Input placeholder="ej., Online, Madrid, España" {...field} />
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

            <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Imagen de Portada (Opcional)</FormLabel>
                    <FormControl>
                        <div className="space-y-4">
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-48 object-cover rounded-lg border"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-2 right-2"
                                        onClick={removeImage}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Haz clic para subir una imagen de portada
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        PNG, JPG hasta 5MB
                                    </p>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
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
