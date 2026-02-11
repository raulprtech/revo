
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Upload, X, Gamepad2, Trophy, Plus } from "lucide-react";
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
import { db, type CreateTournamentData, type Event, type Prize, type GameStation, type BadgeTemplate } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";
import { PrizeManager } from "./prize-manager";
import { StationManager } from "./station-manager";
import { BadgeManager } from "./badge-manager";
import { PrizePoolCalculator } from "./prize-pool-calculator";
import { BracketBrandingEditor, type BracketBranding } from "./bracket-branding";
import { ProFeatureGate } from "@/lib/subscription";

// Game configurations with recommended formats and game modes
const GAMES_CONFIG = {
  "FIFA": {
    name: "FIFA",
    icon: "⚽",
    description: "Simulador de fútbol",
    recommendedFormat: "single-elimination" as const,
    gameModes: [
      { value: "1v1", label: "1 vs 1" },
      { value: "2v2", label: "2 vs 2 (Co-op)" },
      { value: "pro-clubs", label: "Pro Clubs (11 vs 11)" },
      { value: "fut-draft", label: "FUT Draft" },
    ],
    maxParticipantsSuggestion: 32,
  },
  "The King of Fighters": {
    name: "The King of Fighters",
    icon: "👊",
    description: "Juego de pelea clásico",
    recommendedFormat: "double-elimination" as const,
    gameModes: [
      { value: "1v1", label: "1 vs 1" },
      { value: "3v3-team", label: "3 vs 3 (Equipo)" },
      { value: "round-robin-team", label: "Round Robin por equipos" },
    ],
    maxParticipantsSuggestion: 16,
  },
  "Super Smash Bros": {
    name: "Super Smash Bros",
    icon: "🎮",
    description: "Juego de pelea multiplataforma",
    recommendedFormat: "double-elimination" as const,
    gameModes: [
      { value: "1v1-stocks", label: "1 vs 1 (3 Stocks)" },
      { value: "1v1-time", label: "1 vs 1 (Tiempo)" },
      { value: "2v2-teams", label: "2 vs 2 (Equipos)" },
      { value: "free-for-all", label: "Free For All (4 jugadores)" },
    ],
    maxParticipantsSuggestion: 32,
  },
  "Mario Kart": {
    name: "Mario Kart",
    icon: "🏎️",
    description: "Juego de carreras",
    recommendedFormat: "swiss" as const,
    gameModes: [
      { value: "grand-prix", label: "Grand Prix (4 carreras)" },
      { value: "vs-race", label: "VS Race (Individual)" },
      { value: "battle-mode", label: "Modo Batalla" },
      { value: "team-race", label: "Carreras por equipos" },
    ],
    maxParticipantsSuggestion: 12,
  },
  "Street Fighter": {
    name: "Street Fighter",
    icon: "🥊",
    description: "Juego de pelea legendario",
    recommendedFormat: "double-elimination" as const,
    gameModes: [
      { value: "1v1-ft2", label: "1 vs 1 (First to 2)" },
      { value: "1v1-ft3", label: "1 vs 1 (First to 3)" },
      { value: "1v1-ft5", label: "1 vs 1 (First to 5 - Finals)" },
    ],
    maxParticipantsSuggestion: 16,
  },
  "Clash Royale": {
    name: "Clash Royale",
    icon: "👑",
    description: "Juego de estrategia móvil",
    recommendedFormat: "single-elimination" as const,
    gameModes: [
      { value: "1v1-ladder", label: "1 vs 1 (Escalera)" },
      { value: "1v1-tournament", label: "1 vs 1 (Torneo estándar)" },
      { value: "2v2", label: "2 vs 2" },
      { value: "draft", label: "Modo Draft" },
    ],
    maxParticipantsSuggestion: 32,
  },
} as const;

type GameKey = keyof typeof GAMES_CONFIG;

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
  description: z.string().max(500).optional(),
  game: z.string().min(1, "El juego es obligatorio."),
  gameMode: z.string().min(1, "La modalidad de juego es obligatoria."),
  format: z.enum(["single-elimination", "double-elimination", "swiss"]),
  startDate: z.date({ required_error: "Se requiere una fecha de inicio." }),
  startTime: z.string().min(1, "Se requiere una hora de inicio."),
  maxParticipants: z.coerce.number().min(2, "Se requieren al menos 2 participantes.").max(512),
  registrationType: z.enum(["public", "private"]),
  tournamentMode: z.enum(["online", "presencial"]),
  prizePool: z.string().optional(),
  location: z.string().optional(),
  image: z.string().optional(),
}).refine((data) => {
  if (data.tournamentMode === "presencial" && (!data.location || data.location.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "La ubicación es obligatoria para torneos presenciales",
  path: ["location"],
});

// Helper to get next power of 2
const getNextPowerOf2 = (n: number): number => {
  let power = 1;
  while (power < n) power *= 2;
  return power;
};

// Helper to get bracket info text
const getBracketInfo = (participants: number): string => {
  const bracketSize = getNextPowerOf2(participants);
  const byes = bracketSize - participants;
  if (byes === 0) {
    return `Bracket perfecto de ${bracketSize} jugadores`;
  }
  return `Bracket de ${bracketSize} con ${byes} BYE${byes > 1 ? 's' : ''} automático${byes > 1 ? 's' : ''}`;
};

type CreateTournamentFormProps = {
    mode?: "create" | "edit";
    tournamentData?: z.infer<typeof formSchema> & { id: string; prizes?: Prize[] };
    eventId?: string; // Optional event to link tournament to
};

export function CreateTournamentForm({ mode = "create", tournamentData, eventId }: CreateTournamentFormProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(tournamentData?.image || "");
  const [linkedEvent, setLinkedEvent] = useState<Event | null>(null);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventId || null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [prizes, setPrizes] = useState<Prize[]>(tournamentData?.prizes || []);
  const [badges, setBadges] = useState<BadgeTemplate[]>((tournamentData as { badges?: BadgeTemplate[] })?.badges || []);
  const [stations, setStations] = useState<GameStation[]>([]);
  const [autoAssignStations, setAutoAssignStations] = useState(true);
  const [entryFeeData, setEntryFeeData] = useState<{amount: number, currency: string, enabled: boolean}>({
    amount: 100,
    currency: 'MXN',
    enabled: false
  });
  const [prizeDistributions, setPrizeDistributions] = useState<{position: number, percentage: number}[]>([]);
  const [branding, setBranding] = useState<BracketBranding>({
    primaryColor: '#e8590c',
    secondaryColor: '#1a1a2e',
    sponsorLogos: [],
  });
  const [selectedGame, setSelectedGame] = useState<GameKey | "">(
    tournamentData?.game && tournamentData.game in GAMES_CONFIG 
      ? tournamentData.game as GameKey 
      : ""
  );
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
        gameMode: tournamentData.gameMode ?? '',
        tournamentMode: tournamentData.location ? 'presencial' : 'online',
        prizePool: tournamentData.prizePool ?? '',
        location: tournamentData.location ?? '',
        image: tournamentData.image ?? '',
    } : {
      name: "",
      description: "",
      game: "",
      gameMode: "",
      format: "single-elimination",
      registrationType: "public",
      tournamentMode: "online",
      maxParticipants: 16,
      prizePool: "",
      location: "",
      startDate: new Date(),
      startTime: "10:00",
      image: "",
    },
  });

  // Load available events for the current user
  useEffect(() => {
    const loadEvents = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const userEvents = await db.getUserEvents(user.email);
        setAvailableEvents(userEvents);
      }
    };
    loadEvents();
  }, []);

  // Load linked event if eventId is provided
  useEffect(() => {
    if (eventId) {
      db.getEventById(eventId).then(event => {
        if (event) {
          setLinkedEvent(event);
          setSelectedEventId(eventId);
          // Pre-fill location from event if not already set
          if (!form.getValues("location") && event.location) {
            form.setValue("location", event.location);
          }
        }
      });
    }
  }, [eventId, form]);

  // Update linked event when selection changes
  useEffect(() => {
    if (selectedEventId && selectedEventId !== 'none' && selectedEventId !== 'new') {
      const event = availableEvents.find(e => e.id === selectedEventId);
      setLinkedEvent(event || null);
      if (event?.location && !form.getValues("location")) {
        form.setValue("location", event.location);
      }
    } else {
      setLinkedEvent(null);
    }
  }, [selectedEventId, availableEvents, form]);

  // Get available game modes based on selected game
  const availableGameModes = selectedGame ? GAMES_CONFIG[selectedGame].gameModes : [];

  // Handle game selection change
  const handleGameChange = (gameKey: string) => {
    const game = gameKey as GameKey;
    setSelectedGame(game);
    form.setValue("game", game);
    form.setValue("gameMode", ""); // Reset game mode when game changes
    
    // Apply recommended settings
    if (game && GAMES_CONFIG[game]) {
      const config = GAMES_CONFIG[game];
      form.setValue("format", config.recommendedFormat);
      form.setValue("maxParticipants", config.maxParticipantsSuggestion);
    }
  };

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
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log('Auth debug:', {
          user: user ? { id: user.id, email: user.email, emailConfirmed: user.email_confirmed_at } : null,
          userError,
          session: session ? { accessToken: session.access_token?.substring(0, 20) + '...', expiresAt: session.expires_at } : null,
          sessionError,
        });

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

        if (!session) {
          toast({
            title: "Error de sesión",
            description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
            variant: "destructive"
          });
          setLoading(false);
          router.push('/login');
          return;
        }

        // Determine the event_id to use
        const finalEventId = selectedEventId && selectedEventId !== 'none' && selectedEventId !== 'new' 
          ? selectedEventId 
          : undefined;

        // Generate prize_pool summary from prizes
        const prizePoolSummary = prizes.length > 0 
          ? prizes.map(p => `${p.label}: ${p.reward}`).join(', ')
          : values.prizePool;

        // Preparar estaciones solo para torneos presenciales
        const tournamentStations = values.tournamentMode === 'presencial' && stations.length > 0 
          ? stations 
          : undefined;

        const tournamentPayload: CreateTournamentData = {
          name: values.name,
          description: values.description || undefined,
          game: values.game,
          game_mode: values.gameMode || undefined,
          max_participants: values.maxParticipants,
          start_date: values.startDate.toISOString(),
          start_time: values.startTime,
          format: values.format,
          status: "Próximo",
          owner_email: user.email!,
          image: values.image || undefined,
          data_ai_hint: `${values.game} ${values.gameMode || ''} tournament`.trim(),
          registration_type: values.registrationType,
          prize_pool: prizePoolSummary || undefined,
          prizes: prizes.length > 0 ? prizes : undefined,
          badges: badges.length > 0 ? badges : undefined,
          location: values.tournamentMode === 'presencial' ? values.location : undefined,
          invited_users: values.registrationType === 'private' ? [] : undefined,
          event_id: finalEventId || undefined,
          stations: tournamentStations,
          auto_assign_stations: values.tournamentMode === 'presencial' ? autoAssignStations : undefined,
          // Pro plan fields
          bracket_primary_color: branding.primaryColor !== '#e8590c' ? branding.primaryColor : undefined,
          bracket_secondary_color: branding.secondaryColor !== '#1a1a2e' ? branding.secondaryColor : undefined,
          sponsor_logos: branding.sponsorLogos.length > 0 ? branding.sponsorLogos : undefined,
          // Financial fields
          entry_fee: entryFeeData.enabled ? entryFeeData.amount : 0,
          entry_fee_currency: entryFeeData.enabled ? entryFeeData.currency : 'MXN',
          prize_pool_percentage: prizeDistributions.length > 0 ? prizeDistributions : undefined,
        };

        console.log('Tournament payload:', tournamentPayload);
        const newTournament = await db.createTournament(tournamentPayload);

        toast({
          title: "¡Torneo Creado!",
          description: linkedEvent 
            ? `Tu torneo "${values.name}" ha sido agregado al evento "${linkedEvent.name}".`
            : `Tu torneo "${values.name}" ahora está activo.`,
        });
        
        // Redirect to event page if linked, otherwise to tournament
        if (linkedEvent) {
          router.push(`/events/${linkedEvent.slug}`);
        } else {
          router.push(`/tournaments/${newTournament.id}`);
        }
      } else if (mode === 'edit' && tournamentData) {
        // Generate prize_pool summary from prizes
        const prizePoolSummary = prizes.length > 0 
          ? prizes.map(p => `${p.label}: ${p.reward}`).join(', ')
          : values.prizePool;

        // Note: Only include fields that exist in your database schema
        const updateData: Record<string, unknown> = {
          name: values.name,
          description: values.description || null,
          game: values.game,
          max_participants: values.maxParticipants,
          start_date: values.startDate.toISOString(),
          start_time: values.startTime,
          format: values.format,
          image: values.image || tournamentData.image || null,
          data_ai_hint: `${values.game} ${values.gameMode} tournament`,
          registration_type: values.registrationType,
          prize_pool: prizePoolSummary || null,
          prizes: prizes.length > 0 ? prizes : null,
          badges: badges.length > 0 ? badges : null,
          location: values.tournamentMode === 'presencial' ? (values.location || null) : null,
          bracket_primary_color: branding.primaryColor !== '#e8590c' ? branding.primaryColor : null,
          bracket_secondary_color: branding.secondaryColor !== '#1a1a2e' ? branding.secondaryColor : null,
          sponsor_logos: branding.sponsorLogos.length > 0 ? branding.sponsorLogos : null,
          entry_fee: entryFeeData.enabled ? entryFeeData.amount : 0,
          entry_fee_currency: entryFeeData.enabled ? entryFeeData.currency : 'MXN',
          prize_pool_percentage: prizeDistributions.length > 0 ? prizeDistributions : null,
        };

        // Only add game_mode if it has a value (column may not exist in older schemas)
        if (values.gameMode) {
          updateData.game_mode = values.gameMode;
        }

        await db.updateTournament(tournamentData.id, updateData);

        toast({
          title: "Torneo Actualizado",
          description: `Tu torneo "${values.name}" ha sido actualizado correctamente.`,
        });
        router.push(`/tournaments/${tournamentData.id}`);
      }
    } catch (error) {
      console.error('Error saving tournament:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error desconocido al guardar el torneo';
      toast({
        title: "Error",
        description: errorMessage,
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
            {/* Event Selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Vincular a Evento (Opcional)</label>
              <Select 
                value={selectedEventId || 'none'} 
                onValueChange={(value) => {
                  if (value === 'new') {
                    router.push('/events/create');
                  } else {
                    setSelectedEventId(value === 'none' ? null : value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Torneo independiente">
                    {selectedEventId && selectedEventId !== 'none' && linkedEvent ? (
                      <span className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        {linkedEvent.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Torneo independiente</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4" />
                      Torneo independiente
                    </span>
                  </SelectItem>
                  {availableEvents.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Tus Eventos
                      </div>
                      {availableEvents.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          <span className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-primary" />
                            {event.name}
                            <span className="text-xs text-muted-foreground">
                              ({event.tournaments_count || 0} torneos)
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  <div className="border-t my-1" />
                  <SelectItem value="new">
                    <span className="flex items-center gap-2 text-primary">
                      <Plus className="h-4 w-4" />
                      Crear nuevo evento
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {linkedEvent && (
                <p className="text-xs text-muted-foreground">
                  Este torneo aparecerá en la página del evento "{linkedEvent.name}"
                </p>
              )}
            </div>

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
                    <FormLabel>Juego</FormLabel>
                    <Select onValueChange={handleGameChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un juego">
                                    {field.value && GAMES_CONFIG[field.value as GameKey] && (
                                        <span className="flex items-center gap-2">
                                            <span>{GAMES_CONFIG[field.value as GameKey].icon}</span>
                                            <span>{GAMES_CONFIG[field.value as GameKey].name}</span>
                                        </span>
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {Object.entries(GAMES_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{config.icon}</span>
                                        <div>
                                            <span className="font-medium">{config.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">
                                                {config.description}
                                            </span>
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="gameMode"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Modalidad de Juego</FormLabel>
                    <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedGame}
                    >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={selectedGame ? "Selecciona una modalidad" : "Primero selecciona un juego"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {availableGameModes.map((mode) => (
                                <SelectItem key={mode.value} value={mode.value}>
                                    {mode.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedGame && (
                        <FormDescription>
                            Modalidades disponibles para {GAMES_CONFIG[selectedGame].name}
                        </FormDescription>
                    )}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    {selectedGame && (
                        <FormDescription>
                            Formato recomendado para {GAMES_CONFIG[selectedGame].name}: {
                                GAMES_CONFIG[selectedGame].recommendedFormat === 'single-elimination' ? 'Eliminación Simple' :
                                GAMES_CONFIG[selectedGame].recommendedFormat === 'double-elimination' ? 'Doble Eliminación' : 'Suizo'
                            }
                        </FormDescription>
                    )}
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
                    <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona el máximo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="4">4 jugadores</SelectItem>
                            <SelectItem value="8">8 jugadores</SelectItem>
                            <SelectItem value="16">16 jugadores</SelectItem>
                            <SelectItem value="32">32 jugadores</SelectItem>
                            <SelectItem value="64">64 jugadores</SelectItem>
                            <SelectItem value="128">128 jugadores</SelectItem>
                            <SelectItem value="256">256 jugadores</SelectItem>
                            <SelectItem value="512">512 jugadores</SelectItem>
                        </SelectContent>
                    </Select>
                    </FormControl>
                    <FormDescription>
                        {getBracketInfo(field.value || 16)}. Si no se completan los espacios, se asignarán BYEs automáticamente.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="tournamentMode"
                render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>Modalidad del Torneo</FormLabel>
                    <FormControl>
                    <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                    >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                            <RadioGroupItem value="online" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                            🌐 Online
                        </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                            <RadioGroupItem value="presencial" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                            📍 Presencial
                        </FormLabel>
                        </FormItem>
                    </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            {form.watch("tournamentMode") === "presencial" && (
             <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl>
                    <Input placeholder="ej., Centro de Convenciones, Ciudad" {...field} />
                    </FormControl>
                    <FormDescription>Indica el lugar donde se realizará el torneo</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
            )}

            {/* Station Manager - Solo para torneos presenciales (Pro) */}
            {form.watch("tournamentMode") === "presencial" && (
              <ProFeatureGate showPreview>
                <StationManager
                  stations={stations}
                  onStationsChange={setStations}
                  autoAssign={autoAssignStations}
                  onAutoAssignChange={setAutoAssignStations}
                />
              </ProFeatureGate>
            )}

            {/* Prize Manager */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="prizePool"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resumen de Premios</FormLabel>
                    <FormControl>
                      <Input placeholder="ej., $10,000 MXN en total, Trofeo + Medalla, etc." {...field} />
                    </FormControl>
                    <FormDescription>
                      Una descripción general de lo que ganan los participantes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PrizeManager
                prizes={prizes}
                onChange={setPrizes}
                maxParticipants={form.watch("maxParticipants")}
              />
            </div>

            {/* Prize Pool Calculator (Pro) */}
            <PrizePoolCalculator
              maxParticipants={form.watch("maxParticipants")}
              onPrizesGenerated={(generatedPrizes) => {
                setPrizes(generatedPrizes);
                const summary = generatedPrizes.map(p => `${p.label}: ${p.reward}`).join(', ');
                form.setValue("prizePool", summary);
              }}
              onEntryFeeUpdate={setEntryFeeData}
              onDistributionUpdate={setPrizeDistributions}
            />

            {/* Badge Manager */}
            <BadgeManager
              badges={badges}
              onChange={setBadges}
              type="tournament"
            />

            {/* Bracket Branding (Pro) */}
            <BracketBrandingEditor
              branding={branding}
              onChange={setBranding}
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
