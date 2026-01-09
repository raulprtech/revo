"use client";

import { useState, useRef, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
import { Camera, Loader2, X, User, Gamepad2, Globe, Shield, AlertTriangle, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Predefined avatar options using DiceBear styles
const AVATAR_STYLES = [
  { id: 'avataaars', name: 'Avataaars' },
  { id: 'bottts', name: 'Robots' },
  { id: 'pixel-art', name: 'Pixel Art' },
  { id: 'lorelei', name: 'Lorelei' },
  { id: 'adventurer', name: 'Adventurer' },
  { id: 'big-ears', name: 'Big Ears' },
  { id: 'thumbs', name: 'Thumbs' },
  { id: 'fun-emoji', name: 'Emoji' },
];

// Seed variations for each style
const AVATAR_SEEDS = [
  'gamer1', 'player2', 'champion3', 'legend4', 'pro5', 
  'ninja6', 'dragon7', 'phoenix8', 'warrior9', 'hero10',
  'star11', 'fire12', 'ice13', 'thunder14', 'shadow15',
  'wolf16', 'tiger17', 'eagle18', 'shark19', 'panther20'
];

// Generate avatar URL
const getAvatarUrl = (style: string, seed: string) => 
  `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;

const profileSchema = z.object({
  // Información básica
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(50),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres").max(50),
  nickname: z.string().max(30, "El nickname no puede exceder 30 caracteres").optional(),
  bio: z.string().max(500, "La biografía no puede exceder 500 caracteres").optional(),
  
  // Datos personales
  birthDate: z.string().optional(),
  gender: z.enum(["masculino", "femenino", "otro", "prefiero_no_decir"]).optional(),
  location: z.string().max(100).optional(),
  country: z.string().max(50).optional(),
  
  // Gaming
  favoriteGames: z.string().max(200, "Máximo 200 caracteres").optional(),
  gamingPlatforms: z.string().max(100).optional(),
  discordUsername: z.string().max(50).optional(),
  twitchUsername: z.string().max(50).optional(),
  
  // Social
  twitterUsername: z.string().max(50).optional(),
  instagramUsername: z.string().max(50).optional(),
  youtubeChannel: z.string().max(100).optional(),
  
  // Avatar
  photoURL: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface User {
  displayName: string;
  email: string;
  photoURL: string;
  location?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  bio?: string;
  birthDate?: string;
  gender?: string;
  country?: string;
  favoriteGames?: string;
  gamingPlatforms?: string;
  discordUsername?: string;
  twitchUsername?: string;
  twitterUsername?: string;
  instagramUsername?: string;
  youtubeChannel?: string;
  // Deletion status
  pendingDeletion?: boolean;
  deletionRequestedAt?: string;
}

interface EditProfileFormProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onCancel: () => void;
}

export function EditProfileForm({ user, onSave, onCancel }: EditProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(user.photoURL || "");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState('avataaars');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();

  // Parse displayName to get firstName and lastName if not available
  const parseDisplayName = (displayName: string) => {
    const parts = displayName.trim().split(" ");
    if (parts.length >= 2) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(" ")
      };
    }
    return { firstName: displayName, lastName: "" };
  };

  const defaultNames = parseDisplayName(user.displayName || "");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName || defaultNames.firstName || "",
      lastName: user.lastName || defaultNames.lastName || "",
      nickname: user.nickname || "",
      bio: user.bio || "",
      birthDate: user.birthDate || "",
      gender: (user.gender as ProfileFormValues["gender"]) || undefined,
      location: user.location || "",
      country: user.country || "",
      favoriteGames: user.favoriteGames || "",
      gamingPlatforms: user.gamingPlatforms || "",
      discordUsername: user.discordUsername || "",
      twitchUsername: user.twitchUsername || "",
      twitterUsername: user.twitterUsername || "",
      instagramUsername: user.instagramUsername || "",
      youtubeChannel: user.youtubeChannel || "",
      photoURL: user.photoURL || "",
    },
  });

  // Update form when user prop changes
  useEffect(() => {
    const names = parseDisplayName(user.displayName || "");
    form.reset({
      firstName: user.firstName || names.firstName || "",
      lastName: user.lastName || names.lastName || "",
      nickname: user.nickname || "",
      bio: user.bio || "",
      birthDate: user.birthDate || "",
      gender: (user.gender as ProfileFormValues["gender"]) || undefined,
      location: user.location || "",
      country: user.country || "",
      favoriteGames: user.favoriteGames || "",
      gamingPlatforms: user.gamingPlatforms || "",
      discordUsername: user.discordUsername || "",
      twitchUsername: user.twitchUsername || "",
      twitterUsername: user.twitterUsername || "",
      instagramUsername: user.instagramUsername || "",
      youtubeChannel: user.youtubeChannel || "",
      photoURL: user.photoURL || "",
    });
    setImagePreview(user.photoURL || "");
    setPendingImageFile(null);
  }, [user, form]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Limit to 1MB for profile images
      if (file.size > 1 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "La imagen debe ser menor a 1MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Tipo de archivo inválido",
          description: "Solo se permiten imágenes",
          variant: "destructive",
        });
        return;
      }

      // Store file for later upload and show preview
      setPendingImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // If bucket doesn't exist, fall back to dicebear
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
          console.warn('Avatars bucket not configured, using default avatar');
          return null;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const removeImage = () => {
    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
    setImagePreview(defaultAvatar);
    form.setValue("photoURL", defaultAvatar);
    setPendingImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const names = name.split(" ");
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`
      : names[0][0];
  };

  // Grace period for account deletion (7 days in milliseconds)
  const DELETION_GRACE_PERIOD_DAYS = 7;
  const DELETION_GRACE_PERIOD_MS = DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  // Check if account is pending deletion and calculate remaining time
  const getPendingDeletionInfo = () => {
    const deletionRequestedAt = user.deletionRequestedAt;
    if (!deletionRequestedAt) return null;

    const requestDate = new Date(deletionRequestedAt);
    const deletionDate = new Date(requestDate.getTime() + DELETION_GRACE_PERIOD_MS);
    const now = new Date();
    const remainingMs = deletionDate.getTime() - now.getTime();

    if (remainingMs <= 0) {
      return { expired: true, remainingDays: 0, remainingHours: 0, deletionDate };
    }

    const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return { expired: false, remainingDays, remainingHours, deletionDate };
  };

  const pendingDeletionInfo = getPendingDeletionInfo();
  const isPendingDeletion = user.pendingDeletion && pendingDeletionInfo && !pendingDeletionInfo.expired;

  // Cancel deletion request
  const handleCancelDeletion = async () => {
    setDeletingAccount(true);

    try {
      await supabase.auth.updateUser({
        data: {
          pending_deletion: false,
          deletion_requested_at: null,
          deletion_cancelled_at: new Date().toISOString(),
        },
      });

      // Update localStorage
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = {
        ...currentUser,
        pendingDeletion: false,
        deletionRequestedAt: null,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("storage"));

      toast({
        title: "¡Eliminación cancelada!",
        description: "Tu cuenta ya no está programada para eliminación. Nos alegra que te quedes.",
      });

      // Force refresh to update UI
      window.location.reload();

    } catch (error) {
      console.error("Error cancelling deletion:", error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la eliminación. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  // Delete account function - now schedules deletion instead of immediate
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "ELIMINAR") {
      toast({
        title: "Confirmación requerida",
        description: "Debes escribir ELIMINAR para confirmar.",
        variant: "destructive",
      });
      return;
    }

    setDeletingAccount(true);

    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (!supabaseUser) {
        throw new Error("No se encontró el usuario");
      }

      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + DELETION_GRACE_PERIOD_DAYS);

      // Mark user for scheduled deletion
      await supabase.auth.updateUser({
        data: {
          pending_deletion: true,
          deletion_requested_at: new Date().toISOString(),
          scheduled_deletion_date: deletionDate.toISOString(),
        },
      });

      // Update localStorage to reflect pending deletion
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = {
        ...currentUser,
        pendingDeletion: true,
        deletionRequestedAt: new Date().toISOString(),
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("storage"));

      toast({
        title: "Cuenta programada para eliminación",
        description: `Tu cuenta será eliminada permanentemente el ${deletionDate.toLocaleDateString('es-MX', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}. Puedes cancelar esta acción en cualquier momento antes de esa fecha.`,
        duration: 15000,
      });

      setShowDeleteDialog(false);
      setDeleteConfirmText("");
      
      // Force refresh to show the cancellation option
      window.location.reload();
      
    } catch (error) {
      console.error("Error scheduling account deletion:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al procesar tu solicitud. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  async function onSubmit(values: ProfileFormValues) {
    setLoading(true);

    try {
      // Use imagePreview as the source of truth for the avatar
      // This handles both uploaded files preview and selected gallery avatars
      let finalPhotoURL = imagePreview || values.photoURL || user.photoURL;

      // If there's a pending image file, upload it to storage
      if (pendingImageFile) {
        setUploadingImage(true);
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        
        if (supabaseUser) {
          const uploadedUrl = await uploadImageToStorage(pendingImageFile, supabaseUser.id);
          if (uploadedUrl) {
            finalPhotoURL = uploadedUrl;
          } else {
            // Fallback to dicebear if upload fails
            finalPhotoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
            toast({
              title: "Aviso",
              description: "No se pudo subir la imagen. Se usará un avatar generado.",
            });
          }
        }
        setUploadingImage(false);
      }

      // Make sure we're not saving base64 data
      if (finalPhotoURL && finalPhotoURL.startsWith('data:')) {
        finalPhotoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
      }

      const fullName = `${values.firstName} ${values.lastName}`.trim();

      const updatedUser: User = {
        ...user,
        displayName: values.nickname || fullName,
        firstName: values.firstName,
        lastName: values.lastName,
        nickname: values.nickname || "",
        bio: values.bio || "",
        birthDate: values.birthDate || "",
        gender: values.gender || "",
        location: values.location || "",
        country: values.country || "",
        favoriteGames: values.favoriteGames || "",
        gamingPlatforms: values.gamingPlatforms || "",
        discordUsername: values.discordUsername || "",
        twitchUsername: values.twitchUsername || "",
        twitterUsername: values.twitterUsername || "",
        instagramUsername: values.instagramUsername || "",
        youtubeChannel: values.youtubeChannel || "",
        photoURL: finalPhotoURL,
      };

      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Try to update Supabase user metadata if connected
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (supabaseUser) {
          await supabase.auth.updateUser({
            data: {
              full_name: fullName,
              first_name: values.firstName,
              last_name: values.lastName,
              nickname: values.nickname,
              bio: values.bio,
              birth_date: values.birthDate,
              gender: values.gender,
              location: values.location,
              country: values.country,
              favorite_games: values.favoriteGames,
              gaming_platforms: values.gamingPlatforms,
              discord_username: values.discordUsername,
              twitch_username: values.twitchUsername,
              twitter_username: values.twitterUsername,
              instagram_username: values.instagramUsername,
              youtube_channel: values.youtubeChannel,
              avatar_url: finalPhotoURL,
            },
          });
        }
      } catch (error) {
        console.log("Supabase update failed, but localStorage updated:", error);
      }

      // Trigger storage event for header to update
      window.dispatchEvent(new Event("storage"));

      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido guardada exitosamente.",
      });

      setPendingImageFile(null);
      onSave(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error al actualizar",
        description: "Hubo un problema al guardar los cambios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="h-28 w-28">
              <AvatarImage src={imagePreview} alt="Profile" />
              <AvatarFallback className="text-2xl">
                {getInitials(`${form.watch("firstName")} ${form.watch("lastName")}` || user.displayName)}
              </AvatarFallback>
            </Avatar>

            {imagePreview && imagePreview !== `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}` && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            >
              <User className="h-4 w-4 mr-2" />
              Elegir Avatar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              Subir Foto
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Avatar Picker */}
          {showAvatarPicker && (
            <div className="w-full border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estilo de Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_STYLES.map((style) => (
                    <Button
                      key={style.id}
                      type="button"
                      variant={selectedAvatarStyle === style.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAvatarStyle(style.id)}
                    >
                      {style.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Elige tu avatar</label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {AVATAR_SEEDS.map((seed) => {
                    const avatarUrl = getAvatarUrl(selectedAvatarStyle, seed);
                    const isSelected = imagePreview === avatarUrl;
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => {
                          setImagePreview(avatarUrl);
                          setPendingImageFile(null);
                          toast({
                            title: "Avatar seleccionado",
                            description: "Guarda los cambios para aplicar tu nuevo avatar.",
                          });
                        }}
                        className={`relative rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                          isSelected 
                            ? 'border-primary ring-2 ring-primary ring-offset-2' 
                            : 'border-transparent hover:border-muted-foreground'
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={avatarUrl} alt={seed} />
                        </Avatar>
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAvatarPicker(false)}
                >
                  Cerrar galería
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Tabbed Form Sections */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="personal" className="text-xs sm:text-sm py-2">
              <User className="h-4 w-4 mr-1 hidden sm:inline" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="gaming" className="text-xs sm:text-sm py-2">
              <Gamepad2 className="h-4 w-4 mr-1 hidden sm:inline" />
              Gaming
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs sm:text-sm py-2">
              <Globe className="h-4 w-4 mr-1 hidden sm:inline" />
              Social
            </TabsTrigger>
            <TabsTrigger value="account" className="text-xs sm:text-sm py-2">
              <Shield className="h-4 w-4 mr-1 hidden sm:inline" />
              Cuenta
            </TabsTrigger>
          </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido *</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu apellido" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname / Gamertag</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre de jugador" {...field} />
                  </FormControl>
                  <FormDescription>
                    Este nombre se mostrará públicamente en torneos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografía</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cuéntanos sobre ti como gamer..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {(field.value?.length || 0)}/500 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Nacimiento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Género</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                        <SelectItem value="prefiero_no_decir">Prefiero no decir</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input placeholder="ej. Ciudad de México" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Input placeholder="ej. México" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Gaming Tab */}
          <TabsContent value="gaming" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="favoriteGames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Juegos Favoritos</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="ej. League of Legends, Valorant, FIFA 24..."
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Separa los juegos con comas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gamingPlatforms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plataformas de Juego</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. PC, PlayStation 5, Xbox, Nintendo Switch" {...field} />
                  </FormControl>
                  <FormDescription>
                    ¿En qué plataformas juegas?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Cuentas de Gaming</h4>

              <FormField
                control={form.control}
                name="discordUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discord</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                          @
                        </span>
                        <Input 
                          placeholder="usuario#1234 o usuario" 
                          className="rounded-l-none"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="twitchUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitch</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                          twitch.tv/
                        </span>
                        <Input 
                          placeholder="tu_canal" 
                          className="rounded-l-none"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="twitterUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>X (Twitter)</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        x.com/
                      </span>
                      <Input 
                        placeholder="usuario" 
                        className="rounded-l-none"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagramUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        instagram.com/
                      </span>
                      <Input 
                        placeholder="usuario" 
                        className="rounded-l-none"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="youtubeChannel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canal de YouTube</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        youtube.com/
                      </span>
                      <Input 
                        placeholder="@canal o c/canal" 
                        className="rounded-l-none"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4 mt-4">
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <div>
                <FormLabel className="text-sm font-medium">Correo Electrónico</FormLabel>
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  El correo electrónico no se puede cambiar
                </p>
              </div>
              
              <Separator />
              
              <div>
                <FormLabel className="text-sm font-medium">Nombre Público</FormLabel>
                <p className="text-sm mt-1">
                  {form.watch("nickname") || `${form.watch("firstName")} ${form.watch("lastName")}`.trim() || "Sin definir"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Se usa tu nickname si está definido, sino tu nombre completo
                </p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-3 flex-1">
                  <div>
                    <h4 className="text-sm font-medium text-red-700 dark:text-red-400">Zona de Peligro</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estas acciones son permanentes y no se pueden deshacer
                    </p>
                  </div>

                  {/* Show pending deletion status with countdown */}
                  {isPendingDeletion && pendingDeletionInfo && (
                    <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full border-4 border-orange-500 flex items-center justify-center">
                            <span className="text-lg font-bold text-orange-600">
                              {pendingDeletionInfo.remainingDays}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-orange-700 dark:text-orange-400">
                            Cuenta programada para eliminación
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pendingDeletionInfo.remainingDays > 0 
                              ? `${pendingDeletionInfo.remainingDays} día${pendingDeletionInfo.remainingDays !== 1 ? 's' : ''} y ${pendingDeletionInfo.remainingHours} hora${pendingDeletionInfo.remainingHours !== 1 ? 's' : ''} restantes`
                              : `${pendingDeletionInfo.remainingHours} hora${pendingDeletionInfo.remainingHours !== 1 ? 's' : ''} restantes`
                            }
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Tu cuenta será eliminada permanentemente el{' '}
                        <strong>
                          {pendingDeletionInfo.deletionDate.toLocaleDateString('es-MX', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </strong>
                      </p>

                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleCancelDeletion}
                        disabled={deletingAccount}
                      >
                        {deletingAccount ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelando...
                          </>
                        ) : (
                          <>
                            ✓ Cancelar eliminación y conservar mi cuenta
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Show delete button only if not pending deletion */}
                  {!isPendingDeletion && (
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar mi cuenta
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            ¿Programar eliminación de cuenta?
                          </AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-4">
                              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <p className="text-sm">
                                  <strong>Período de gracia de 7 días:</strong> Tu cuenta será eliminada después de 7 días. 
                                  Durante este tiempo puedes cancelar la eliminación en cualquier momento.
                                </p>
                              </div>
                              
                              <p>
                                Después del período de gracia, se eliminarán permanentemente:
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>Toda tu información personal</li>
                                <li>Acceso a torneos que creaste</li>
                                <li>Tus participaciones en torneos</li>
                                <li>Tu historial de partidas</li>
                                <li>Todos los datos asociados a tu cuenta</li>
                              </ul>
                              
                              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-4">
                                <p className="text-sm font-medium mb-2">
                                  Para confirmar, escribe <strong className="text-red-600">ELIMINAR</strong> a continuación:
                                </p>
                                <Input
                                  value={deleteConfirmText}
                                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                                  placeholder="Escribe ELIMINAR"
                                  className="border-red-300 focus:border-red-500"
                                />
                              </div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel 
                            onClick={() => setDeleteConfirmText("")}
                            disabled={deletingAccount}
                          >
                            Cancelar
                          </AlertDialogCancel>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== "ELIMINAR" || deletingAccount}
                          >
                            {deletingAccount ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Programar eliminación
                              </>
                            )}
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}