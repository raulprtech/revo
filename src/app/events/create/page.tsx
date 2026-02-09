"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload, CompactImageUpload } from "@/components/ui/image-upload";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { db, type CreateEventData, type Sponsor, type BadgeTemplate } from "@/lib/database";
import { cn } from "@/lib/utils";
import { BadgeManager } from "@/components/tournaments/badge-manager";
import { ProFeatureGate } from "@/lib/subscription";

const sponsorSchema = z.object({
    name: z.string().min(1, "Nombre requerido"),
    logo: z.string().optional().or(z.literal("")),  // Can be URL or storage path
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

export default function CreateEventPage() {
    const [loading, setLoading] = useState(false);
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [badges, setBadges] = useState<BadgeTemplate[]>([]);
    const router = useRouter();
    const { toast } = useToast();

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
            sponsors: [],
        },
    });

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        const slug = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .substring(0, 100);
        form.setValue("slug", slug);
    };

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
        setLoading(true);

        try {
            const eventData: CreateEventData = {
                name: values.name,
                description: values.description || undefined,
                slug: values.slug,
                banner_image: values.bannerImage || undefined,
                logo_image: values.logoImage || undefined,
                primary_color: values.primaryColor,
                secondary_color: values.secondaryColor,
                start_date: values.startDate.toISOString(),
                end_date: values.endDate.toISOString(),
                location: values.location || undefined,
                organizer_name: values.organizerName || undefined,
                organizer_logo: values.organizerLogo || undefined,
                owner_email: "", // Will be set by the server
                status: "Próximo",
                is_public: values.isPublic,
                sponsors: sponsors.filter(s => s.name && s.logo),
                badges: badges.length > 0 ? badges : undefined,
            };

            const newEvent = await db.createEvent(eventData);

            toast({
                title: "¡Evento Creado!",
                description: `Tu evento "${values.name}" ha sido creado exitosamente.`,
            });

            router.push(`/events/${newEvent.slug}`);
        } catch (error) {
            console.error("Error creating event:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "No se pudo crear el evento.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Crear Nuevo Evento</CardTitle>
                    <CardDescription>
                        Crea un evento que agrupe múltiples torneos bajo una misma identidad
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
                                                <Input 
                                                    placeholder="ej. Jaguar Games 2025" 
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        handleNameChange(e.target.value);
                                                    }}
                                                />
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
                                                            disabled={(date) => date < new Date()}
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="bannerImage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Banner del Evento</FormLabel>
                                                <FormControl>
                                                    <ImageUpload
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        folder="events/banners"
                                                        aspectRatio="banner"
                                                        placeholder="Subir banner (3:1)"
                                                    />
                                                </FormControl>
                                                <FormDescription>Imagen grande para la cabecera (recomendado 1200x400)</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="logoImage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Logo del Evento</FormLabel>
                                                <FormControl>
                                                    <ImageUpload
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        folder="events/logos"
                                                        aspectRatio="square"
                                                        placeholder="Subir logo (1:1)"
                                                    />
                                                </FormControl>
                                                <FormDescription>Logo cuadrado (recomendado 400x400)</FormDescription>
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
                                                <FormLabel>Logo del Organizador</FormLabel>
                                                <FormControl>
                                                    <ImageUpload
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        folder="organizers"
                                                        aspectRatio="square"
                                                        placeholder="Subir logo"
                                                        maxSizeMB={2}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Sponsors (Pro) */}
                            <ProFeatureGate showPreview>
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
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <label className="text-sm font-medium">Nombre del Patrocinador</label>
                                                    <Input
                                                        placeholder="Nombre del patrocinador"
                                                        value={sponsor.name}
                                                        onChange={(e) => updateSponsor(index, "name", e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium">Logo</label>
                                                    <CompactImageUpload
                                                        value={sponsor.logo}
                                                        onChange={(url) => updateSponsor(index, "logo", url)}
                                                        folder="sponsors"
                                                        placeholder="URL del logo o subir imagen"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium">Sitio Web (Opcional)</label>
                                                    <Input
                                                        placeholder="https://..."
                                                        value={sponsor.url || ""}
                                                        onChange={(e) => updateSponsor(index, "url", e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 mt-6"
                                                onClick={() => removeSponsor(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            </ProFeatureGate>

                            {/* Badges */}
                            <BadgeManager
                                badges={badges}
                                onChange={setBadges}
                                type="event"
                            />

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

                            {/* Submit */}
                            <div className="flex gap-4">
                                <Button type="submit" disabled={loading} className="flex-1">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Crear Evento
                                </Button>
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
