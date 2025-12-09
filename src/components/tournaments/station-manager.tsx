"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trash2, 
  Monitor, 
  Gamepad2, 
  Laptop, 
  Table2, 
  HelpCircle,
  Shuffle,
  GripVertical
} from "lucide-react";
import type { GameStation } from "@/lib/database";

const STATION_TYPES = [
  { value: 'console', label: 'Consola', icon: Gamepad2, examples: 'PS5, Xbox, Switch' },
  { value: 'pc', label: 'PC', icon: Monitor, examples: 'PC Gaming, Laptop' },
  { value: 'arcade', label: 'Arcade', icon: Laptop, examples: 'Gabinete Arcade, Fightstick' },
  { value: 'table', label: 'Mesa', icon: Table2, examples: 'Mesa de juego, Área' },
  { value: 'other', label: 'Otro', icon: HelpCircle, examples: 'Personalizado' },
] as const;

const STATION_PRESETS = [
  { 
    name: 'Consolas (4 estaciones)', 
    stations: [
      { name: 'Consola 1', type: 'console' as const },
      { name: 'Consola 2', type: 'console' as const },
      { name: 'Consola 3', type: 'console' as const },
      { name: 'Consola 4', type: 'console' as const },
    ]
  },
  { 
    name: 'PCs (8 estaciones)', 
    stations: [
      { name: 'PC 1', type: 'pc' as const },
      { name: 'PC 2', type: 'pc' as const },
      { name: 'PC 3', type: 'pc' as const },
      { name: 'PC 4', type: 'pc' as const },
      { name: 'PC 5', type: 'pc' as const },
      { name: 'PC 6', type: 'pc' as const },
      { name: 'PC 7', type: 'pc' as const },
      { name: 'PC 8', type: 'pc' as const },
    ]
  },
  { 
    name: 'Torneo de Pelea (2 setups)', 
    stations: [
      { name: 'Setup Principal', type: 'console' as const, description: 'Para stream/final' },
      { name: 'Setup Secundario', type: 'console' as const },
    ]
  },
  { 
    name: 'LAN Party (6 mesas)', 
    stations: [
      { name: 'Mesa A1', type: 'table' as const, location: 'Zona A' },
      { name: 'Mesa A2', type: 'table' as const, location: 'Zona A' },
      { name: 'Mesa A3', type: 'table' as const, location: 'Zona A' },
      { name: 'Mesa B1', type: 'table' as const, location: 'Zona B' },
      { name: 'Mesa B2', type: 'table' as const, location: 'Zona B' },
      { name: 'Mesa B3', type: 'table' as const, location: 'Zona B' },
    ]
  },
];

interface StationManagerProps {
  stations: GameStation[];
  onStationsChange: (stations: GameStation[]) => void;
  autoAssign: boolean;
  onAutoAssignChange: (autoAssign: boolean) => void;
  disabled?: boolean;
}

export function StationManager({
  stations,
  onStationsChange,
  autoAssign,
  onAutoAssignChange,
  disabled = false,
}: StationManagerProps) {
  const [newStation, setNewStation] = useState<Partial<GameStation>>({
    name: '',
    type: 'console',
    description: '',
    location: '',
  });

  const generateId = () => `station-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addStation = () => {
    if (!newStation.name?.trim()) return;
    
    const station: GameStation = {
      id: generateId(),
      name: newStation.name.trim(),
      type: newStation.type || 'console',
      description: newStation.description?.trim() || undefined,
      location: newStation.location?.trim() || undefined,
      isAvailable: true,
      currentMatchId: null,
    };
    
    onStationsChange([...stations, station]);
    setNewStation({ name: '', type: 'console', description: '', location: '' });
  };

  const removeStation = (id: string) => {
    onStationsChange(stations.filter(s => s.id !== id));
  };

  const applyPreset = (preset: typeof STATION_PRESETS[0]) => {
    const newStations: GameStation[] = preset.stations.map((s, index) => ({
      id: generateId() + index,
      name: s.name,
      type: s.type,
      description: 'description' in s ? (s as { description?: string }).description : undefined,
      location: 'location' in s ? (s as { location?: string }).location : undefined,
      isAvailable: true,
      currentMatchId: null,
    }));
    onStationsChange([...stations, ...newStations]);
  };

  const getStationIcon = (type: GameStation['type']) => {
    const config = STATION_TYPES.find(t => t.value === type);
    return config?.icon || HelpCircle;
  };

  const getStationTypeLabel = (type: GameStation['type']) => {
    const config = STATION_TYPES.find(t => t.value === type);
    return config?.label || 'Otro';
  };

  return (
    <Card className={disabled ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Estaciones de Juego
            </CardTitle>
            <CardDescription>
              Configura las consolas, PCs o mesas donde se jugarán las partidas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-assign" className="text-sm text-muted-foreground">
              Auto-asignar
            </Label>
            <Switch
              id="auto-assign"
              checked={autoAssign}
              onCheckedChange={onAutoAssignChange}
              disabled={disabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Plantillas rápidas</Label>
          <div className="flex flex-wrap gap-2">
            {STATION_PRESETS.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                disabled={disabled}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Add new station form */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="md:col-span-1">
            <Label htmlFor="station-name" className="text-xs">Nombre *</Label>
            <Input
              id="station-name"
              placeholder="Consola 1"
              value={newStation.name}
              onChange={(e) => setNewStation(prev => ({ ...prev, name: e.target.value }))}
              disabled={disabled}
              className="mt-1"
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="station-type" className="text-xs">Tipo</Label>
            <Select
              value={newStation.type}
              onValueChange={(value) => setNewStation(prev => ({ ...prev, type: value as GameStation['type'] }))}
              disabled={disabled}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="station-desc" className="text-xs">Descripción</Label>
            <Input
              id="station-desc"
              placeholder="PS5 con monitor"
              value={newStation.description}
              onChange={(e) => setNewStation(prev => ({ ...prev, description: e.target.value }))}
              disabled={disabled}
              className="mt-1"
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="station-location" className="text-xs">Ubicación</Label>
            <Input
              id="station-location"
              placeholder="Zona A"
              value={newStation.location}
              onChange={(e) => setNewStation(prev => ({ ...prev, location: e.target.value }))}
              disabled={disabled}
              className="mt-1"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button 
              onClick={addStation} 
              disabled={disabled || !newStation.name?.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>
        </div>

        {/* Stations list */}
        {stations.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {stations.length} estación{stations.length !== 1 ? 'es' : ''} configurada{stations.length !== 1 ? 's' : ''}
              </Label>
              {stations.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStationsChange([])}
                  disabled={disabled}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpiar todas
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stations.map((station) => {
                const StationIcon = getStationIcon(station.type);
                return (
                  <div
                    key={station.id}
                    className="flex items-center gap-2 p-3 bg-background border rounded-lg group"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                    <div className="p-2 bg-primary/10 rounded">
                      <StationIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{station.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getStationTypeLabel(station.type)}</span>
                        {station.location && (
                          <>
                            <span>•</span>
                            <span>{station.location}</span>
                          </>
                        )}
                      </div>
                      {station.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {station.description}
                        </div>
                      )}
                    </div>
                    <Badge 
                      variant={station.isAvailable ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {station.isAvailable ? 'Libre' : 'En uso'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStation(station.id)}
                      disabled={disabled}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Gamepad2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay estaciones configuradas</p>
            <p className="text-xs">Agrega estaciones para asignar partidas a consolas específicas</p>
          </div>
        )}

        {/* Auto-assign info */}
        {autoAssign && stations.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <Shuffle className="h-5 w-5 text-primary" />
            <div className="text-sm">
              <span className="font-medium">Auto-asignación activa:</span>{' '}
              <span className="text-muted-foreground">
                Las partidas se asignarán automáticamente a estaciones disponibles cuando avance el bracket.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export helper function for auto-assigning stations
export function autoAssignStationsToMatches(
  matches: { id: number; winner: string | null }[],
  stations: GameStation[]
): Map<number, GameStation> {
  const assignments = new Map<number, GameStation>();
  const availableStations = stations.filter(s => s.isAvailable);
  
  // Get matches that need stations (no winner yet, both players ready)
  const pendingMatches = matches.filter(m => !m.winner);
  
  // Assign stations round-robin style
  pendingMatches.forEach((match, index) => {
    if (index < availableStations.length) {
      assignments.set(match.id, availableStations[index]);
    }
  });
  
  return assignments;
}

// Export component for displaying station assignment in bracket
export function StationBadge({ 
  station, 
  size = 'sm' 
}: { 
  station: { name: string; location?: string } | null | undefined;
  size?: 'sm' | 'md';
}) {
  if (!station) return null;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-primary/10 text-primary border-primary/30",
        size === 'sm' ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5"
      )}
    >
      <Gamepad2 className={size === 'sm' ? "h-3 w-3 mr-1" : "h-4 w-4 mr-1"} />
      {station.name}
      {station.location && <span className="opacity-70 ml-1">({station.location})</span>}
    </Badge>
  );
}

// Need to import cn
import { cn } from "@/lib/utils";
