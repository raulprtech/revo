"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { db, type Event, type UpdateEventData, type Sponsor } from "@/lib/database";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const sponsorSchema = z.object({
    name: z.string().min(1, "Nombre requerido"),
    logo: z.string().url("URL de logo inválida").or(z.literal("")),
    url: z.string().url("URL inválida").optional().or(z.literal("")),
});

const formSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100),
    description: z.string().max(1000).optional(),
    slug: z.string()
        .min(3, "El slug debe tener al menos 3 caracteres")
        .max(100)
        .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
    bannerImage: z.string().url("URL inválida").optional().or(z.literal("")),
    logoImage: z.string().url("URL inválida").optional().or(z.literal("")),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal inválido"),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal inválido"),
    startDate: z.date({ required_error: "Fecha de inicio requerida" }),
    endDate: z.date({ required_error: "Fecha de fin requerida" }),
    eventMode: z.enum(["online", "presencial"]),
    location: z.string().max(255).optional(),
    organizerName: z.string().max(255).optional(),
    organizerLogo: z.string().url("URL inválida").optional().or(z.literal("")),
    isPublic: z.boolean(),
    status: z.enum(["Próximo", "En curso", "Finalizado"]),
    sponsors: z.array(sponsorSchema).optional(),
}).refine((data) => data.endDate >= data.startDate, {
    message: "La fecha de fin debe ser igual o posterior a la fecha de inicio",
    path: ["endDate"],
}).refine((data) => {
    if (data.eventMode === "presencial" && (!data.location || data.location.trim() === "")) {
        return false;
    }
    return true;
}, {
    message: "La ubicación es obligatoria para eventos presenciales",
    path: ["location"],
});

type FormValues = z.infer<typeof formSchema>;

export default function EditEventPage() {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [event, setEvent] = useState<Event | null>(null);
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [isOwner, setIsOwner] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const slug = params.slug as string;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            slug: "",
            bannerImage: "",
            logoImage: "",
            primaryColor: "#6366f1",
            secondaryColor: "#8b5cf6",
            eventMode: "online",
            location: "",
            organizerName: "",
            organizerLogo: "",
            isPublic: true,
            status: "Próximo",
            sponsors: [],
        },
    });

    // Load event data
    useEffect(() => {
        const loadEvent = async () => {
            try {
                const eventData = await db.getEventBySlug(slug);
                
                if (!eventData) {
                    toast({
                        title: "Evento no encontrado",
                        variant: "destructive",
                    });
                    router.push('/events');
                    return;
                }

                // Check ownership
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user?.email !== eventData.owner_email) {
                    toast({
                        title: "Acceso denegado",
                        description: "No tienes permiso para editar este evento",
                        variant: "destructive",
                    });
                    router.push(`/events/${slug}`);
                    return;
                }

                setIsOwner(true);
                setEvent(eventData);
                setSponsors(eventData.sponsors || []);

                // Set form values
                form.reset({
                    name: eventData.name,
                    description: eventData.description || "",
                    slug: eventData.slug,
                    bannerImage: eventData.banner_image || "",
                    logoImage: eventData.logo_image || "",
                    primaryColor: eventData.primary_color,
                    secondaryColor: eventData.secondary_color,
                    startDate: new Date(eventData.start_date),
                    endDate: new Date(eventData.end_date),
                    eventMode: eventData.location ? "presencial" : "online",
                    location: eventData.location || "",
                    organizerName: eventData.organizer_name || "",
                    organizerLogo: eventData.organizer_logo || "",
                    isPublic: eventData.is_public,
                    status: eventData.status as "Próximo" | "En curso" | "Finalizado",
                    sponsors: eventData.sponsors || [],
                });
            } catch (error) {
                console.error('Error loading event:', error);
                toast({
                    title: "Error",
                    description: "No se pudo cargar el evento",
                    variant: "destructive",
                });
            } finally {
                setInitialLoading(false);
            }
        };

        loadEvent();
    }, [slug, router, toast, form]);

    const addSponsor = () => {
        setSponsors([...sponsors, { name: "", logo: "", url: "" }]);
    };

    const removeSponsor = (index: number) => {
        setSponsors(sponsors.filter((_, i) => i !== index));
    };

    const updateSponsor = (index: number, field: keyof Sponsor, value: string) => {
        const updated = [...sponsors];
        updated[index] = { ...updated[index], [field]: value };
        setSponsors(updated);
    };

    async function onSubmit(values: FormValues) {
        if (!event) return;
        
        setLoading(true);

        try {
            const updateData: UpdateEventData = {
                name: values.name,
                description: values.description || undefined,
                slug: values.slug,
                banner_image: values.bannerImage || undefined,
                logo_image: values.logoImage || undefined,
                primary_color: values.primaryColor,
                secondary_color: values.secondaryColor,
                start_date: values.startDate.toISOString(),
                end_date: values.endDate.toISOString(),
                location: values.eventMode === "presencial" ? values.location : undefined,
                organizer_name: values.organizerName || undefined,
                organizer_logo: values.organizerLogo || undefined,
                status: values.status,
                is_public: values.isPublic,
                sponsors: sponsors.filter(s => s.name && s.logo),
            };

            await db.updateEvent(event.id, updateData);

            toast({
                title: "¡Evento Actualizado!",
                description: `El evento "${values.name}" ha sido actualizado exitosamente.`,
            });

            // If slug changed, redirect to new URL
            if (values.slug !== slug) {
                router.push(`/events/${values.slug}`);
            } else {
                router.push(`/events/${slug}`);
            }
        } catch (error) {
            console.error("Error updating event:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "No se pudo actualizar el evento.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!event) return;
        
        setLoading(true);
        try {
            await db.deleteEvent(event.id);
            toast({
                title: "Evento eliminado",
                description: "El evento ha sido eliminado correctamente.",
            });
            router.push('/events');
        } catch (error) {
            console.error("Error deleting event:", error);
            toast({
                title: "Error",
                description: "No se pudo eliminar el evento.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    if (initialLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isOwner || !event) {
        return null;
    }

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/events/${slug}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Evento
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Editar Evento</CardTitle>
                    <CardDescription>
                        Modifica la información de tu evento
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Información Básica</h3>
                                
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre del Evento *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="ej. Jaguar Games 2025" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>URL del Evento *</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center">
                                                    <span className="text-muted-foreground text-sm mr-2">/events/</span>
                                                    <Input placeholder="jaguar-games-2025" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Este será el enlace único a tu evento
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descripción</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="Describe tu evento..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado del Evento</FormLabel>
                                            <FormControl>
                                                <div className="flex flex-wrap gap-2">
                                                    {["Próximo", "En curso", "Finalizado"].map((status) => (
                                                        <label
                                                            key={status}
                                                            className={`cursor-pointer px-4 py-2 rounded-lg border transition-colors ${
                                                                field.value === status
                                                                    ? 'border-primary bg-primary/10 text-primary'
                                                                    : 'border-border hover:border-muted-foreground'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                value={status}
                                                                checked={field.value === status}
                                                                onChange={() => field.onChange(status)}
                                                                className="sr-only"
                                                            />
                                                            {status}
                                                        </label>
                                                    ))}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Dates and Location */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Fechas y Ubicación</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Fecha de Inicio *</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "PPP", { locale: es })
                                                                ) : (
                                                                    <span>Selecciona fecha</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
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
                                        name="endDate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Fecha de Fin *</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "PPP", { locale: es })
                                                                ) : (
                                                                    <span>Selecciona fecha</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            disabled={(date) => date < (form.getValues("startDate") || new Date())}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="eventMode"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Modalidad del Evento</FormLabel>
                                            <FormControl>
                                                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
                                                    <label className={`flex items-center space-x-2 cursor-pointer p-3 rounded-lg border ${field.value === 'online' ? 'border-primary bg-primary/10' : 'border-border'}`}>
                                                        <input
                                                            type="radio"
                                                            value="online"
                                                            checked={field.value === "online"}
                                                            onChange={() => field.onChange("online")}
                                                            className="sr-only"
                                                        />
                                                        <span className="text-xl">🌐</span>
                                                        <span>Online</span>
                                                    </label>
                                                    <label className={`flex items-center space-x-2 cursor-pointer p-3 rounded-lg border ${field.value === 'presencial' ? 'border-primary bg-primary/10' : 'border-border'}`}>
                                                        <input
                                                            type="radio"
                                                            value="presencial"
                                                            checked={field.value === "presencial"}
                                                            onChange={() => field.onChange("presencial")}
                                                            className="sr-only"
                                                        />
                                                        <span className="text-xl">📍</span>
                                                        <span>Presencial</span>
                                                    </label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {form.watch("eventMode") === "presencial" && (
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Ubicación</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="ej. Centro de Convenciones, Campeche" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            {/* Branding */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Identidad Visual</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="bannerImage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Banner del Evento (URL)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} />
                                                </FormControl>
                                                <FormDescription>Imagen grande para la cabecera</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="logoImage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Logo del Evento (URL)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="primaryColor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Color Primario</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <Input type="color" className="w-12 h-10 p-1" {...field} />
                                                        <Input {...field} placeholder="#6366f1" />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="secondaryColor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Color Secundario</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <Input type="color" className="w-12 h-10 p-1" {...field} />
                                                        <Input {...field} placeholder="#8b5cf6" />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Preview */}
                                <div 
                                    className="h-24 rounded-lg flex items-center justify-center text-white font-semibold"
                                    style={{
                                        background: `linear-gradient(135deg, ${form.watch("primaryColor")}, ${form.watch("secondaryColor")})`
                                    }}
                                >
                                    Vista previa del gradiente
                                </div>
                            </div>

                            {/* Organizer */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Organizador</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="organizerName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nombre del Organizador</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="ej. Gobierno del Estado de Campeche" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="organizerLogo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Logo del Organizador (URL)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Sponsors */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Patrocinadores</h3>
                                    <Button type="button" variant="outline" size="sm" onClick={addSponsor}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Agregar Patrocinador
                                    </Button>
                                </div>

                                {sponsors.map((sponsor, index) => (
                                    <Card key={index} className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-sm font-medium">Nombre</label>
                                                <Input
                                                    placeholder="Nombre del patrocinador"
                                                    value={sponsor.name}
                                                    onChange={(e) => updateSponsor(index, "name", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">Logo (URL)</label>
                                                <Input
                                                    placeholder="https://..."
                                                    value={sponsor.logo}
                                                    onChange={(e) => updateSponsor(index, "logo", e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <label className="text-sm font-medium">Sitio Web (Opcional)</label>
                                                    <Input
                                                        placeholder="https://..."
                                                        value={sponsor.url || ""}
                                                        onChange={(e) => updateSponsor(index, "url", e.target.value)}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => removeSponsor(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Visibility */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Visibilidad</h3>

                                <FormField
                                    control={form.control}
                                    name="isPublic"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Evento Público</FormLabel>
                                                <FormDescription>
                                                    Los eventos públicos son visibles para todos los usuarios
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button type="submit" disabled={loading} className="flex-1">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Cambios
                                </Button>
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    Cancelar
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. Esto eliminará permanentemente el evento
                                                &quot;{event.name}&quot; y desvinculará todos los torneos asociados.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
