"use client";

import { useState } from "react";
import { Plus, X, GripVertical, Type, Hash, CheckSquare, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type RegistrationField = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
  saveToProfile?: boolean;
};

interface RegistrationFieldsManagerProps {
  fields: RegistrationField[];
  onChange: (fields: RegistrationField[]) => void;
}

export function RegistrationFieldsManager({ fields, onChange }: RegistrationFieldsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newField, setNewField] = useState<Partial<RegistrationField>>({
    label: "",
    type: "text",
    required: false,
    saveToProfile: false,
    options: []
  });

  const addField = () => {
    if (!newField.label) return;
    
    const field: RegistrationField = {
      id: Math.random().toString(36).substr(2, 9),
      label: newField.label,
      type: newField.type as any,
      required: !!newField.required,
      saveToProfile: !!newField.saveToProfile,
      options: newField.options || []
    };

    onChange([...fields, field]);
    setNewField({ label: "", type: "text", required: false, saveToProfile: false, options: [] });
    setIsAdding(false);
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<RegistrationField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Campos de Registro Personalizados</Label>
        <Badge variant="outline" className="ml-2">Plus</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Solicita información adicional a tus participantes durante el registro (ej. ID de Discord, Rango, Gamertag secundario).
      </p>

      <div className="space-y-3">
        {fields.map((field) => (
          <Card key={field.id} className="relative group">
            <CardContent className="p-4 py-3">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                  <div className="col-span-1 md:col-span-2">
                    <Input 
                      value={field.label} 
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Nombre del campo (ej. Discord ID)"
                      className="h-8"
                    />
                  </div>
                  <Select 
                    value={field.type} 
                    onValueChange={(val: any) => updateField(field.id, { type: val })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="boolean">Interruptor (Si/No)</SelectItem>
                      <SelectItem value="select">Selección múltiple</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-4 justify-end">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id={`req-${field.id}`} 
                        checked={field.required} 
                        onCheckedChange={(val) => updateField(field.id, { required: val })}
                      />
                      <Label htmlFor={`req-${field.id}`} className="text-xs">Obligado</Label>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeField(field.id)}
                      className="text-destructive h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {field.type === 'select' && (
                <div className="mt-2 ml-7">
                  <Input 
                    placeholder="Opciones separadas por comas (ej. Oro, Platino, Diamante)"
                    value={field.options?.join(', ')}
                    onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div className="mt-2 ml-7 flex items-center space-x-2">
                <Switch 
                  id={`save-${field.id}`} 
                  checked={field.saveToProfile} 
                  onCheckedChange={(val) => updateField(field.id, { saveToProfile: val })}
                />
                <Label htmlFor={`save-${field.id}`} className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Sugerir guardar en el perfil del jugador
                </Label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isAdding ? (
        <Button 
          variant="outline" 
          className="w-full border-dashed" 
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Agregar Campo Personalizado
        </Button>
      ) : (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del campo</Label>
                <Input 
                  placeholder="Ej. Nivel de cuenta, Discord..." 
                  value={newField.label} 
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de dato</Label>
                <Select value={newField.type} onValueChange={(val) => setNewField({ ...newField, type: val as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="boolean">Interruptor (Si/No)</SelectItem>
                    <SelectItem value="select">Selección</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
              <Button onClick={addField}>Agregar Campo</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
