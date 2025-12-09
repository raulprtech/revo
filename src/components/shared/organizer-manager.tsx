"use client";

import { useState } from "react";
import { Plus, Trash2, UserPlus, Crown, Users, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
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

interface OrganizerManagerProps {
  ownerEmail: string;
  organizers: string[];
  onOrganizersChange: (organizers: string[]) => Promise<void>;
  entityType: 'evento' | 'torneo';
}

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get initials from email
const getInitials = (email: string): string => {
  const name = email.split('@')[0];
  return name.slice(0, 2).toUpperCase();
};

// Get display name from email
const getDisplayName = (email: string): string => {
  return email.split('@')[0];
};

export function OrganizerManager({ 
  ownerEmail, 
  organizers, 
  onOrganizersChange,
  entityType 
}: OrganizerManagerProps) {
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAddOrganizer = async () => {
    const email = newEmail.trim().toLowerCase();

    // Validations
    if (!email) {
      toast({
        title: "Email requerido",
        description: "Por favor ingresa un correo electrónico.",
        variant: "destructive"
      });
      return;
    }

    if (!isValidEmail(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un correo electrónico válido.",
        variant: "destructive"
      });
      return;
    }

    if (email === ownerEmail.toLowerCase()) {
      toast({
        title: "Email del propietario",
        description: "No puedes agregarte a ti mismo como co-organizador.",
        variant: "destructive"
      });
      return;
    }

    if (organizers.map(o => o.toLowerCase()).includes(email)) {
      toast({
        title: "Ya es organizador",
        description: "Este correo ya está agregado como organizador.",
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);
    try {
      await onOrganizersChange([...organizers, email]);
      setNewEmail("");
      toast({
        title: "Organizador agregado",
        description: `${getDisplayName(email)} ahora puede gestionar este ${entityType}.`,
      });
    } catch (error) {
      console.error('Error adding organizer:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el organizador. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveOrganizer = async (emailToRemove: string) => {
    setRemovingEmail(emailToRemove);
    try {
      const updatedOrganizers = organizers.filter(
        email => email.toLowerCase() !== emailToRemove.toLowerCase()
      );
      await onOrganizersChange(updatedOrganizers);
      toast({
        title: "Organizador eliminado",
        description: `${getDisplayName(emailToRemove)} ya no puede gestionar este ${entityType}.`,
      });
    } catch (error) {
      console.error('Error removing organizer:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el organizador. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setRemovingEmail(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOrganizer();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Organizadores
        </CardTitle>
        <CardDescription>
          Agrega co-organizadores que puedan gestionar este {entityType}. 
          Tendrán los mismos permisos que tú excepto eliminarlo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Owner */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Propietario</label>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(ownerEmail)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{getDisplayName(ownerEmail)}</p>
              <p className="text-sm text-muted-foreground truncate">{ownerEmail}</p>
            </div>
            <Badge variant="default" className="shrink-0">
              <Crown className="mr-1 h-3 w-3" />
              Propietario
            </Badge>
          </div>
        </div>

        {/* Co-organizers list */}
        {organizers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Co-organizadores ({organizers.length})
            </label>
            <div className="space-y-2">
              {organizers.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getDisplayName(email)}</p>
                    <p className="text-sm text-muted-foreground truncate">{email}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    <UserPlus className="mr-1 h-3 w-3" />
                    Organizador
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={removingEmail === email}
                      >
                        {removingEmail === email ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar organizador?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{getDisplayName(email)}</strong> ya no podrá gestionar este {entityType}. 
                          Esta acción se puede deshacer agregándolo nuevamente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveOrganizer(email)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new organizer */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Agregar co-organizador
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9"
                disabled={isAdding}
              />
            </div>
            <Button 
              onClick={handleAddOrganizer} 
              disabled={isAdding || !newEmail.trim()}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            El usuario recibirá acceso inmediato para gestionar este {entityType}.
          </p>
        </div>

        {/* Empty state */}
        {organizers.length === 0 && (
          <div className="text-center py-4 text-muted-foreground border-t">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay co-organizadores</p>
            <p className="text-xs">Agrega personas de confianza para ayudarte a gestionar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
