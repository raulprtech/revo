"use client";

import { useState, useRef, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

const profileSchema = z.object({
  displayName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(50),
  location: z.string().max(100).optional(),
  photoURL: z.string().optional(),
});

interface User {
  displayName: string;
  email: string;
  photoURL: string;
  location?: string;
}

interface EditProfileFormProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onCancel: () => void;
}

export function EditProfileForm({ user, onSave, onCancel }: EditProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(user.photoURL || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user.displayName || "",
      location: user.location || "",
      photoURL: user.photoURL || "",
    },
  });

  // Update form when user prop changes
  useEffect(() => {
    form.reset({
      displayName: user.displayName || "",
      location: user.location || "",
      photoURL: user.photoURL || "",
    });
    setImagePreview(user.photoURL || "");
  }, [user, form]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for profile images
        toast({
          title: "Archivo muy grande",
          description: "La imagen debe ser menor a 2MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        form.setValue("photoURL", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
    setImagePreview(defaultAvatar);
    form.setValue("photoURL", defaultAvatar);
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

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    setLoading(true);

    try {
      const updatedUser: User = {
        ...user,
        displayName: values.displayName,
        location: values.location || "",
        photoURL: values.photoURL || user.photoURL,
      };

      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Try to update Supabase user metadata if connected
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (supabaseUser) {
          await supabase.auth.updateUser({
            data: {
              full_name: values.displayName,
              location: values.location,
              avatar_url: values.photoURL,
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
            <Avatar className="h-32 w-32">
              <AvatarImage src={imagePreview} alt="Profile" />
              <AvatarFallback className="text-2xl">
                {getInitials(form.watch("displayName") || user.displayName)}
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

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              Cambiar Foto
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Tu nombre completo" {...field} />
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
                  <Input placeholder="ej. Madrid, España" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="bg-muted/30 p-3 rounded-lg">
            <FormLabel className="text-sm font-medium">Correo Electrónico</FormLabel>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              El correo electrónico no se puede cambiar
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6">
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