"use client";

import { useState } from "react";
import { Palette, Image as ImageIcon, Plus, Trash2, ExternalLink, Zap, Eye, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useSubscription, ProUpgradePrompt } from "@/lib/subscription";
import type { Sponsor } from "@/lib/database";

// =============================================
// TYPES
// =============================================

export interface BracketBranding {
  primaryColor: string;
  secondaryColor: string;
  sponsorLogos: Sponsor[];
}

interface BracketBrandingEditorProps {
  branding: BracketBranding;
  onChange: (branding: BracketBranding) => void;
}

// =============================================
// PRESET THEMES
// =============================================

const COLOR_PRESETS = [
  { name: "Naranja Duels", primary: "#e8640a", secondary: "#1e293b" },
  { name: "Azul Esports", primary: "#3b82f6", secondary: "#1e3a5f" },
  { name: "Verde Gaming", primary: "#22c55e", secondary: "#14532d" },
  { name: "Rojo Competitivo", primary: "#ef4444", secondary: "#450a0a" },
  { name: "Morado Premium", primary: "#a855f7", secondary: "#2e1065" },
  { name: "Dorado Élite", primary: "#eab308", secondary: "#422006" },
];

// =============================================
// COMPONENT
// =============================================

export function BracketBrandingEditor({ branding, onChange }: BracketBrandingEditorProps) {
  const { isPro } = useSubscription();
  const [newSponsor, setNewSponsor] = useState<Partial<Sponsor>>({ name: "", logo: "", url: "" });

  if (!isPro) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Personalización de Marca
            <Badge variant="secondary" className="ml-auto">
              <Zap className="h-3 w-3 mr-1" /> Plus
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProUpgradePrompt />
        </CardContent>
      </Card>
    );
  }

  const handleAddSponsor = () => {
    if (!newSponsor.name || !newSponsor.logo) return;
    const sponsor: Sponsor = {
      name: newSponsor.name,
      logo: newSponsor.logo,
      url: newSponsor.url || undefined,
      showInDetails: true,
      showInSpectator: true,
    };
    onChange({
      ...branding,
      sponsorLogos: [...branding.sponsorLogos, sponsor],
    });
    setNewSponsor({ name: "", logo: "", url: "" });
  };

  const handleRemoveSponsor = (index: number) => {
    onChange({
      ...branding,
      sponsorLogos: branding.sponsorLogos.filter((_, i) => i !== index),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personalización de Marca
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" /> Plus
          </Badge>
        </CardTitle>
        <CardDescription>
          Personaliza los colores del bracket y agrega logos de patrocinadores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Presets */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Tema de color</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  onChange({
                    ...branding,
                    primaryColor: preset.primary,
                    secondaryColor: preset.secondary,
                  })
                }
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                  branding.primaryColor === preset.primary
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30"
                }`}
                title={preset.name}
              >
                <div className="flex gap-1">
                  <div
                    className="w-5 h-5 rounded-full border"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="w-5 h-5 rounded-full border"
                    style={{ backgroundColor: preset.secondary }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Color primario</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => onChange({ ...branding, primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border border-border"
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => onChange({ ...branding, primaryColor: e.target.value })}
                placeholder="#e8640a"
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Color secundario</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.secondaryColor}
                onChange={(e) => onChange({ ...branding, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border border-border"
              />
              <Input
                value={branding.secondaryColor}
                onChange={(e) => onChange({ ...branding, secondaryColor: e.target.value })}
                placeholder="#1e293b"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Vista previa del bracket</Label>
          <div
            className="rounded-lg p-4 border"
            style={{ backgroundColor: branding.secondaryColor }}
          >
            <div className="flex gap-4 items-center">
              <div
                className="flex-1 rounded p-3 text-center text-sm font-semibold"
                style={{
                  backgroundColor: branding.primaryColor,
                  color: "#fff",
                }}
              >
                Jugador 1
              </div>
              <span className="text-white font-bold">VS</span>
              <div
                className="flex-1 rounded p-3 text-center text-sm font-semibold border border-white/20 text-white"
              >
                Jugador 2
              </div>
            </div>
            {/* Sponsor bar preview */}
            {branding.sponsorLogos.length > 0 && (
              <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/10">
                {branding.sponsorLogos.map((s, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.logo}
                      alt={s.name}
                      className="h-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="text-xs text-white/60">{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sponsor Logos */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Logos de Patrocinadores</Label>

          {branding.sponsorLogos.length > 0 && (
            <div className="space-y-2">
              {branding.sponsorLogos.map((sponsor, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sponsor.logo}
                    alt={sponsor.name}
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sponsor.name}</p>
                    {sponsor.url && (
                      <a
                        href={sponsor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {sponsor.url}
                      </a>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Checkbox 
                          id={`show-details-${idx}`}
                          checked={sponsor.showInDetails !== false}
                          onCheckedChange={(checked) => {
                            const newSponsors = [...branding.sponsorLogos];
                            newSponsors[idx] = { ...sponsor, showInDetails: !!checked };
                            onChange({ ...branding, sponsorLogos: newSponsors });
                          }}
                        />
                        <Label htmlFor={`show-details-${idx}`} className="text-[10px] cursor-pointer flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Detalles
                        </Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Checkbox 
                          id={`show-spectator-${idx}`}
                          checked={sponsor.showInSpectator !== false}
                          onCheckedChange={(checked) => {
                            const newSponsors = [...branding.sponsorLogos];
                            newSponsors[idx] = { ...sponsor, showInSpectator: !!checked };
                            onChange({ ...branding, sponsorLogos: newSponsors });
                          }}
                        />
                        <Label htmlFor={`show-spectator-${idx}`} className="text-[10px] cursor-pointer flex items-center gap-1">
                          <Monitor className="h-3 w-3" /> Espectador
                        </Label>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleRemoveSponsor(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 p-4 rounded-lg border border-dashed sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input
                value={newSponsor.name}
                onChange={(e) => setNewSponsor({ ...newSponsor, name: e.target.value })}
                placeholder="Red Bull"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">URL del Logo</Label>
              <Input
                value={newSponsor.logo}
                onChange={(e) => setNewSponsor({ ...newSponsor, logo: e.target.value })}
                placeholder="https://..."
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sitio web (opcional)</Label>
              <Input
                value={newSponsor.url}
                onChange={(e) => setNewSponsor({ ...newSponsor, url: e.target.value })}
                placeholder="https://..."
                className="h-8"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                size="sm"
                onClick={handleAddSponsor}
                disabled={!newSponsor.name || !newSponsor.logo}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
