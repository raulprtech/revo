"use client";

import { useState, useMemo } from "react";
import { DollarSign, Calculator, Users, Percent, Zap, CreditCard, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { Prize } from "@/lib/database";
import { useSubscription, ProUpgradePrompt } from "@/lib/subscription";

// =============================================
// PRIZE POOL DISTRIBUTION PRESETS
// =============================================

interface DistributionPreset {
  name: string;
  description: string;
  distribution: { position: string; label: string; percentage: number }[];
}

const DISTRIBUTION_PRESETS: DistributionPreset[] = [
  {
    name: "Winner Takes All",
    description: "100% para el campeón",
    distribution: [
      { position: "1", label: "1er Lugar", percentage: 100 },
    ],
  },
  {
    name: "Top 3 Estándar",
    description: "50/30/20 split",
    distribution: [
      { position: "1", label: "1er Lugar", percentage: 50 },
      { position: "2", label: "2do Lugar", percentage: 30 },
      { position: "3", label: "3er Lugar", percentage: 20 },
    ],
  },
  {
    name: "Top 4 Competitivo",
    description: "40/25/20/15 split",
    distribution: [
      { position: "1", label: "1er Lugar", percentage: 40 },
      { position: "2", label: "2do Lugar", percentage: 25 },
      { position: "3", label: "3er Lugar", percentage: 20 },
      { position: "4", label: "4to Lugar", percentage: 15 },
    ],
  },
  {
    name: "Top 8 Pro",
    description: "Distribución amplia para +32 jugadores",
    distribution: [
      { position: "1", label: "1er Lugar", percentage: 30 },
      { position: "2", label: "2do Lugar", percentage: 20 },
      { position: "3", label: "3er Lugar", percentage: 15 },
      { position: "4", label: "4to Lugar", percentage: 10 },
      { position: "top8", label: "5to-8vo", percentage: 25 },
    ],
  },
];

// =============================================
// TYPES
// =============================================

export interface EntryFeeConfig {
  enabled: boolean;
  amount: number;
  currency: string;
}

export interface PrizePoolConfig {
  source: 'manual' | 'entry-fees';
  manualAmount: number;
  distribution: { position: string; label: string; percentage: number }[];
  platformFeePercent: number; // % kept by platform
}

interface PrizePoolCalculatorProps {
  entryFee: EntryFeeConfig;
  onEntryFeeChange: (config: EntryFeeConfig) => void;
  prizePoolConfig: PrizePoolConfig;
  onPrizePoolConfigChange: (config: PrizePoolConfig) => void;
  currentParticipants: number;
  maxParticipants: number;
  /** Emit calculated prizes for the parent form */
  onPrizesCalculated: (prizes: Prize[]) => void;
}

// =============================================
// COMPONENT
// =============================================

export function PrizePoolCalculator({
  entryFee,
  onEntryFeeChange,
  prizePoolConfig,
  onPrizePoolConfigChange,
  currentParticipants,
  maxParticipants,
  onPrizesCalculated,
}: PrizePoolCalculatorProps) {
  const { isPro } = useSubscription();

  // Calculate total pool
  const calculations = useMemo(() => {
    const participantEstimate = Math.max(currentParticipants, Math.round(maxParticipants * 0.75));
    
    const grossPool = prizePoolConfig.source === 'entry-fees'
      ? entryFee.amount * participantEstimate
      : prizePoolConfig.manualAmount;

    const platformFee = grossPool * (prizePoolConfig.platformFeePercent / 100);
    const netPool = grossPool - platformFee;

    const prizeBreakdown = prizePoolConfig.distribution.map(d => ({
      ...d,
      amount: Math.round((netPool * d.percentage / 100) * 100) / 100,
    }));

    const totalPercentage = prizePoolConfig.distribution.reduce((sum, d) => sum + d.percentage, 0);

    return {
      participantEstimate,
      grossPool,
      platformFee,
      netPool,
      prizeBreakdown,
      totalPercentage,
    };
  }, [entryFee, prizePoolConfig, currentParticipants, maxParticipants]);

  // Apply as prizes
  const handleApplyPrizes = () => {
    const prizes: Prize[] = calculations.prizeBreakdown.map(p => ({
      position: p.position,
      label: p.label,
      reward: `$${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      type: 'cash' as const,
    }));
    onPrizesCalculated(prizes);
  };

  const handlePreset = (preset: DistributionPreset) => {
    onPrizePoolConfigChange({
      ...prizePoolConfig,
      distribution: preset.distribution,
    });
  };

  if (!isPro) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="py-8">
          <ProUpgradePrompt />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calculadora de Prize Pool
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" /> Plus
          </Badge>
        </CardTitle>
        <CardDescription>
          Configura cobro de inscripciones y distribución automática de premios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Entry Fee Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <CreditCard className="h-4 w-4" />
              Cobro de Inscripción
            </Label>
            <Switch
              checked={entryFee.enabled}
              onCheckedChange={(v) => onEntryFeeChange({ ...entryFee, enabled: v })}
            />
          </div>

          {entryFee.enabled && (
            <div className="grid grid-cols-2 gap-4 pl-6 animate-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-sm">Monto</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={entryFee.amount}
                    onChange={(e) => onEntryFeeChange({ ...entryFee, amount: parseFloat(e.target.value) || 0 })}
                    className="pl-9"
                    placeholder="10.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Moneda</Label>
                <Select
                  value={entryFee.currency}
                  onValueChange={(v) => onEntryFeeChange({ ...entryFee, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="MXN">MXN ($)</SelectItem>
                    <SelectItem value="ARS">ARS ($)</SelectItem>
                    <SelectItem value="COP">COP ($)</SelectItem>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Prize Pool Source */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Fuente del Prize Pool</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onPrizePoolConfigChange({ ...prizePoolConfig, source: 'entry-fees' })}
              className={`p-4 rounded-lg border text-left transition-colors ${
                prizePoolConfig.source === 'entry-fees'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <Users className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium text-sm">Desde inscripciones</p>
              <p className="text-xs text-muted-foreground">Calculado automáticamente</p>
            </button>
            <button
              type="button"
              onClick={() => onPrizePoolConfigChange({ ...prizePoolConfig, source: 'manual' })}
              className={`p-4 rounded-lg border text-left transition-colors ${
                prizePoolConfig.source === 'manual'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <DollarSign className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium text-sm">Monto fijo</p>
              <p className="text-xs text-muted-foreground">Define el pozo manualmente</p>
            </button>
          </div>

          {prizePoolConfig.source === 'manual' && (
            <div className="space-y-2 pl-2">
              <Label className="text-sm">Pozo total</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  value={prizePoolConfig.manualAmount}
                  onChange={(e) =>
                    onPrizePoolConfigChange({
                      ...prizePoolConfig,
                      manualAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="pl-9"
                  placeholder="1000.00"
                />
              </div>
            </div>
          )}

          {prizePoolConfig.source === 'entry-fees' && (
            <div className="space-y-2 pl-2">
              <Label className="text-sm">Comisión de plataforma (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={prizePoolConfig.platformFeePercent}
                  onChange={(e) =>
                    onPrizePoolConfigChange({
                      ...prizePoolConfig,
                      platformFeePercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="pl-9"
                  placeholder="5"
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Porcentaje que retiene la plataforma/organizador
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Distribution Presets */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Distribución de premios</Label>
          <div className="flex flex-wrap gap-2">
            {DISTRIBUTION_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>

          {/* Custom Distribution Rows */}
          {prizePoolConfig.distribution.length > 0 && (
            <div className="space-y-2 mt-4">
              {prizePoolConfig.distribution.map((d, idx) => (
                <div key={d.position} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <Badge variant="outline" className="min-w-[80px] justify-center">
                    {d.label}
                  </Badge>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={d.percentage}
                      onChange={(e) => {
                        const updated = [...prizePoolConfig.distribution];
                        updated[idx] = { ...d, percentage: parseFloat(e.target.value) || 0 };
                        onPrizePoolConfigChange({ ...prizePoolConfig, distribution: updated });
                      }}
                      className="w-20 h-8"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <span className="text-sm font-semibold text-primary min-w-[80px] text-right">
                    ${calculations.prizeBreakdown[idx]?.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </span>
                </div>
              ))}

              {calculations.totalPercentage !== 100 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  La suma de porcentajes es {calculations.totalPercentage}%. Debe ser 100%.
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Summary Card */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Resumen del cálculo
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Participantes estimados:</span>
            <span className="text-right font-medium">{calculations.participantEstimate}</span>

            {entryFee.enabled && prizePoolConfig.source === 'entry-fees' && (
              <>
                <span className="text-muted-foreground">Entry fee × jugadores:</span>
                <span className="text-right font-medium">
                  ${entryFee.amount} × {calculations.participantEstimate} = ${calculations.grossPool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </>
            )}

            <span className="text-muted-foreground">Pool bruto:</span>
            <span className="text-right font-medium">
              ${calculations.grossPool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>

            {prizePoolConfig.platformFeePercent > 0 && prizePoolConfig.source === 'entry-fees' && (
              <>
                <span className="text-muted-foreground">Comisión ({prizePoolConfig.platformFeePercent}%):</span>
                <span className="text-right font-medium text-destructive">
                  -${calculations.platformFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </>
            )}

            <span className="font-semibold">Pool neto a repartir:</span>
            <span className="text-right font-bold text-primary text-lg">
              ${calculations.netPool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Apply button */}
        <Button
          type="button"
          onClick={handleApplyPrizes}
          disabled={calculations.totalPercentage !== 100 || calculations.netPool <= 0}
          className="w-full"
        >
          <Calculator className="h-4 w-4 mr-2" />
          Aplicar distribución como premios
        </Button>
      </CardContent>
    </Card>
  );
}
