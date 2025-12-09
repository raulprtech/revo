"use client";

import { useState } from "react";
import { Plus, Trash2, Trophy, Medal, Award, Gift, DollarSign, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Prize } from "@/lib/database";

// Predefined position options
const POSITION_OPTIONS = [
  { value: "1", label: "1er Lugar", icon: Trophy },
  { value: "2", label: "2do Lugar", icon: Medal },
  { value: "3", label: "3er Lugar", icon: Award },
  { value: "4", label: "4to Lugar", icon: Star },
  { value: "top4", label: "Top 4", icon: Star },
  { value: "top8", label: "Top 8", icon: Star },
  { value: "top16", label: "Top 16", icon: Star },
  { value: "top32", label: "Top 32", icon: Star },
  { value: "participation", label: "Participación", icon: Gift },
];

const PRIZE_TYPE_OPTIONS = [
  { value: "cash", label: "Efectivo", icon: DollarSign },
  { value: "item", label: "Premio Físico", icon: Gift },
  { value: "other", label: "Otro", icon: Award },
];

// Get icon for position
const getPositionIcon = (position: string) => {
  switch (position) {
    case "1":
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    case "2":
      return <Medal className="h-4 w-4 text-gray-400" />;
    case "3":
      return <Award className="h-4 w-4 text-amber-600" />;
    default:
      return <Star className="h-4 w-4 text-primary" />;
  }
};

// Get badge color for position
const getPositionBadgeVariant = (position: string): "default" | "secondary" | "outline" => {
  switch (position) {
    case "1":
      return "default";
    case "2":
    case "3":
      return "secondary";
    default:
      return "outline";
  }
};

interface PrizeManagerProps {
  prizes: Prize[];
  onChange: (prizes: Prize[]) => void;
  maxParticipants?: number;
}

export function PrizeManager({ prizes, onChange, maxParticipants = 16 }: PrizeManagerProps) {
  const [newPrize, setNewPrize] = useState<Partial<Prize>>({
    position: "",
    label: "",
    reward: "",
    type: "cash",
  });

  // Filter available positions based on max participants
  const getAvailablePositions = () => {
    const usedPositions = prizes.map((p) => p.position);
    return POSITION_OPTIONS.filter((opt) => {
      if (usedPositions.includes(opt.value)) return false;
      // Filter out positions that don't make sense for the tournament size
      if (opt.value === "top32" && maxParticipants < 32) return false;
      if (opt.value === "top16" && maxParticipants < 16) return false;
      if (opt.value === "top8" && maxParticipants < 8) return false;
      if (opt.value === "top4" && maxParticipants < 4) return false;
      const numPosition = parseInt(opt.value);
      if (!isNaN(numPosition) && numPosition > maxParticipants) return false;
      return true;
    });
  };

  const handleAddPrize = () => {
    if (!newPrize.position || !newPrize.reward) return;

    const positionOption = POSITION_OPTIONS.find((p) => p.value === newPrize.position);
    const prize: Prize = {
      position: newPrize.position,
      label: positionOption?.label || newPrize.position,
      reward: newPrize.reward,
      type: newPrize.type as Prize["type"],
    };

    // Sort prizes by position importance
    const positionOrder = POSITION_OPTIONS.map((p) => p.value);
    const updatedPrizes = [...prizes, prize].sort(
      (a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
    );

    onChange(updatedPrizes);
    setNewPrize({ position: "", label: "", reward: "", type: "cash" });
  };

  const handleRemovePrize = (index: number) => {
    const updatedPrizes = prizes.filter((_, i) => i !== index);
    onChange(updatedPrizes);
  };

  const handleUpdatePrize = (index: number, field: keyof Prize, value: string) => {
    const updatedPrizes = [...prizes];
    updatedPrizes[index] = { ...updatedPrizes[index], [field]: value };
    onChange(updatedPrizes);
  };

  const availablePositions = getAvailablePositions();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Bolsa de Premios
        </CardTitle>
        <CardDescription>
          Define los premios para cada posición del torneo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Prizes */}
        {prizes.length > 0 && (
          <div className="space-y-2">
            {prizes.map((prize, index) => (
              <div
                key={`${prize.position}-${index}`}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-[120px]">
                  {getPositionIcon(prize.position)}
                  <Badge variant={getPositionBadgeVariant(prize.position)}>
                    {prize.label}
                  </Badge>
                </div>
                <div className="flex-1">
                  <Input
                    value={prize.reward}
                    onChange={(e) => handleUpdatePrize(index, "reward", e.target.value)}
                    placeholder="Premio..."
                    className="h-8"
                  />
                </div>
                <Select
                  value={prize.type || "cash"}
                  onValueChange={(value) => handleUpdatePrize(index, "type", value)}
                >
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIZE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className="h-3 w-3" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemovePrize(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Prize */}
        {availablePositions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-lg border border-dashed">
            <div className="flex-1 space-y-2">
              <Label className="text-xs text-muted-foreground">Posición</Label>
              <Select
                value={newPrize.position}
                onValueChange={(value) => setNewPrize({ ...newPrize, position: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar posición" />
                </SelectTrigger>
                <SelectContent>
                  {availablePositions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-[2] space-y-2">
              <Label className="text-xs text-muted-foreground">Premio</Label>
              <Input
                value={newPrize.reward}
                onChange={(e) => setNewPrize({ ...newPrize, reward: e.target.value })}
                placeholder="ej., $500, Medalla de Oro, Pase VIP..."
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select
                value={newPrize.type}
                onValueChange={(value) => setNewPrize({ ...newPrize, type: value as Prize["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIZE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleAddPrize}
                disabled={!newPrize.position || !newPrize.reward}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {prizes.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay premios definidos</p>
            <p className="text-xs">Agrega premios para las diferentes posiciones</p>
          </div>
        )}

        {/* Quick Templates */}
        {prizes.length === 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Plantillas rápidas</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange([
                    { position: "1", label: "1er Lugar", reward: "$500", type: "cash" },
                    { position: "2", label: "2do Lugar", reward: "$250", type: "cash" },
                    { position: "3", label: "3er Lugar", reward: "$100", type: "cash" },
                  ]);
                }}
              >
                Top 3 (Efectivo)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange([
                    { position: "1", label: "1er Lugar", reward: "Trofeo + $300", type: "cash" },
                    { position: "2", label: "2do Lugar", reward: "Medalla de Plata", type: "item" },
                    { position: "3", label: "3er Lugar", reward: "Medalla de Bronce", type: "item" },
                  ]);
                }}
              >
                Top 3 (Mixto)
              </Button>
              {maxParticipants >= 8 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange([
                      { position: "1", label: "1er Lugar", reward: "$1000", type: "cash" },
                      { position: "2", label: "2do Lugar", reward: "$500", type: "cash" },
                      { position: "3", label: "3er Lugar", reward: "$250", type: "cash" },
                      { position: "4", label: "4to Lugar", reward: "$100", type: "cash" },
                      { position: "top8", label: "Top 8", reward: "$50 c/u", type: "cash" },
                    ]);
                  }}
                >
                  Top 8 (Competitivo)
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange([
                    { position: "1", label: "1er Lugar", reward: "Campeonato + Premio Mayor", type: "item" },
                    { position: "participation", label: "Participación", reward: "Certificado de Participación", type: "other" },
                  ]);
                }}
              >
                Casual
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Display component for showing prizes (read-only)
interface PrizeDisplayProps {
  prizes: Prize[];
  className?: string;
}

export function PrizeDisplay({ prizes, className }: PrizeDisplayProps) {
  if (!prizes || prizes.length === 0) {
    return (
      <div className={`text-muted-foreground ${className}`}>
        Por anunciar
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {prizes.map((prize, index) => (
        <div
          key={`${prize.position}-${index}`}
          className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
        >
          {getPositionIcon(prize.position)}
          <div className="flex-1">
            <span className="font-medium text-sm">{prize.label}</span>
            <span className="text-muted-foreground mx-2">→</span>
            <span className="text-sm">{prize.reward}</span>
          </div>
          {prize.type === "cash" && (
            <DollarSign className="h-3 w-3 text-green-500" />
          )}
        </div>
      ))}
    </div>
  );
}
