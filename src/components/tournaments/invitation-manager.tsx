"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Mail, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TournamentRecord = {
  id?: string;
  invitedUsers?: string[];
  invited_users?: string[];
  [key: string]: unknown;
};

interface InvitationManagerProps {
  tournamentId: string;
  invitedUsers: string[];
  onInvitationUpdate: (updatedInvitations: string[]) => void;
}

export function InvitationManager({ tournamentId, invitedUsers, onInvitationUpdate }: InvitationManagerProps) {
  const [newEmail, setNewEmail] = useState("");
  const { toast } = useToast();

  const handleAddInvitation = () => {
    if (!newEmail.trim()) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido.",
        variant: "destructive"
      });
      return;
    }

    // Check if email is already invited
    if (invitedUsers.includes(newEmail)) {
      toast({
        title: "Usuario ya invitado",
        description: "Este email ya está en la lista de invitados.",
        variant: "destructive"
      });
      return;
    }

    const updatedInvitations = [...invitedUsers, newEmail];
    updateTournamentInvitations(updatedInvitations);
    setNewEmail("");
    toast({
      title: "Invitación enviada",
      description: `Se ha invitado a ${newEmail} al torneo.`
    });
  };

  const handleRemoveInvitation = (emailToRemove: string) => {
    const updatedInvitations = invitedUsers.filter(email => email !== emailToRemove);
    updateTournamentInvitations(updatedInvitations);
    toast({
      title: "Invitación eliminada",
      description: `Se ha eliminado la invitación para ${emailToRemove}.`
    });
  };

  const updateTournamentInvitations = (newInvitations: string[]) => {
    // Update localStorage
    const allTournaments = JSON.parse(localStorage.getItem("tournaments") || "[]") as TournamentRecord[];
    const tournamentIndex = allTournaments.findIndex((tournament) => tournament?.id === tournamentId);

    if (tournamentIndex !== -1) {
      const tournament = { ...(allTournaments[tournamentIndex] ?? {}) } as TournamentRecord;
      tournament.invitedUsers = newInvitations;
      tournament.invited_users = newInvitations;
      allTournaments[tournamentIndex] = tournament;
      localStorage.setItem("tournaments", JSON.stringify(allTournaments));
      onInvitationUpdate(newInvitations);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Gestionar Invitaciones
        </CardTitle>
        <CardDescription>
          Invita usuarios específicos a tu torneo privado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Label htmlFor="email">Email del usuario</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddInvitation()}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddInvitation}>
              <Plus className="mr-2 h-4 w-4" />
              Invitar
            </Button>
          </div>
        </div>

        {invitedUsers.length > 0 && (
          <div className="space-y-2">
            <Label>Usuarios invitados ({invitedUsers.length})</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {invitedUsers.map((email) => (
                <div key={email} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveInvitation(email)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {invitedUsers.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Mail className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No has invitado a ningún usuario aún</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
