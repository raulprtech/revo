"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegistrationField } from "./registration-fields-manager";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { db } from "@/lib/database";
import { useAuth } from "@/lib/supabase/auth-context";

interface RegistrationCustomFieldsProps {
  isOpen: boolean;
  onClose: () => void;
  fields: RegistrationField[];
  onComplete: (responses: Record<string, any>) => void;
  tournamentName: string;
}

export function RegistrationCustomFields({ 
  isOpen, 
  onClose, 
  fields, 
  onComplete, 
  tournamentName 
}: RegistrationCustomFieldsProps) {
  const { user } = useAuth();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [saveFlags, setSaveFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.email && isOpen) {
      db.getProfileByEmail(user.email).then(profile => {
        if (profile?.saved_custom_fields) {
          setProfileData(profile.saved_custom_fields);
          
          // Pre-fill responses with saved data if available
          const initialResponses: Record<string, any> = {};
          fields.forEach(f => {
            if (profile.saved_custom_fields[f.label] !== undefined) {
              initialResponses[f.label] = profile.saved_custom_fields[f.label];
            } else if (f.type === 'boolean') {
              initialResponses[f.label] = false;
            }
          });
          setResponses(initialResponses);
        }
      });
    }
  }, [user?.email, isOpen, fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Process "save to profile" flags
    const fieldsToSave: Record<string, any> = {};
    Object.entries(saveFlags).forEach(([label, shouldSave]) => {
      if (shouldSave && responses[label] !== undefined) {
        fieldsToSave[label] = responses[label];
      }
    });

    if (Object.keys(fieldsToSave).length > 0 && user?.email) {
      try {
        await db.updateProfile(user.email, {
          saved_custom_fields: { ...profileData, ...fieldsToSave }
        });
      } catch (err) {
        console.error("Error saving fields to profile:", err);
      }
    }

    onComplete(responses);
  };

  const handleResponseChange = (label: string, value: any) => {
    setResponses(prev => ({ ...prev, [label]: value }));
  };

  const handleSaveFlagChange = (label: string, value: boolean) => {
    setSaveFlags(prev => ({ ...prev, [label]: value }));
  };

  // Check if all required fields are filled
  const isFormValid = fields.every(f => !f.required || (responses[f.label] !== undefined && responses[f.label] !== ""));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-探索-md">
        <DialogHeader>
          <DialogTitle>Información Adicional</DialogTitle>
          <DialogDescription>
            El organizador de {tournamentName} requiere los siguientes datos para tu participación.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </Label>
                {field.saveToProfile && (
                  <div className="flex items-center gap-2">
                    <Switch 
                      id={`save-${field.id}`}
                      checked={saveFlags[field.label] || false}
                      onCheckedChange={(val) => handleSaveFlagChange(field.label, val)}
                    />
                    <Label htmlFor={`save-${field.id}`} className="text-[10px] text-muted-foreground uppercase">
                      Guardar en perfil
                    </Label>
                  </div>
                )}
              </div>

              {field.type === 'text' && (
                <Input 
                  required={field.required}
                  value={responses[field.label] || ""}
                  onChange={(e) => handleResponseChange(field.label, e.target.value)}
                  placeholder={`Ingresa tu ${field.label.toLowerCase()}`}
                />
              )}

              {field.type === 'number' && (
                <Input 
                  type="number"
                  required={field.required}
                  value={responses[field.label] || ""}
                  onChange={(e) => handleResponseChange(field.label, e.target.value)}
                />
              )}

              {field.type === 'boolean' && (
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={responses[field.label] || false}
                    onCheckedChange={(val) => handleResponseChange(field.label, val)}
                  />
                  <span className="text-sm text-muted-foreground">{responses[field.label] ? 'Sí' : 'No'}</span>
                </div>
              )}

              {field.type === 'select' && (
                <Select 
                  value={responses[field.label] || ""} 
                  onValueChange={(val) => handleResponseChange(field.label, val)}
                  required={field.required}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!isFormValid}>Confirmar Registro</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
