'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Trophy, Medal, Award, Star, Crown, Shield, Sparkles } from 'lucide-react';
import { Badge as BadgeType, BadgeTemplate, BadgeType as BadgeTypeEnum } from '@/lib/database';
import { CompactImageUpload } from '@/components/ui/image-upload';

// Simple ID generator (compatible with all browsers)
const generateId = () => {
  return 'badge_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Predefined badge templates
const BADGE_PRESETS: Record<string, Omit<BadgeType, 'id'>> = {
  champion: {
    type: 'champion',
    name: 'Campeón',
    description: 'Ganador del torneo',
    icon: '🏆',
    color: '#FFD700',
    position: '1',
  },
  'runner-up': {
    type: 'runner-up',
    name: 'Subcampeón',
    description: 'Segundo lugar',
    icon: '🥈',
    color: '#C0C0C0',
    position: '2',
  },
  'third-place': {
    type: 'third-place',
    name: 'Tercer Lugar',
    description: 'Tercer lugar',
    icon: '🥉',
    color: '#CD7F32',
    position: '3',
  },
  'top-4': {
    type: 'top-4',
    name: 'Top 4',
    description: 'Entre los 4 mejores',
    icon: '⭐',
    color: '#9333EA',
    position: 'top-4',
  },
  'top-8': {
    type: 'top-8',
    name: 'Top 8',
    description: 'Entre los 8 mejores',
    icon: '✨',
    color: '#3B82F6',
    position: 'top-8',
  },
  participant: {
    type: 'participant',
    name: 'Participante',
    description: 'Participó en el torneo',
    icon: '🎮',
    color: '#10B981',
  },
  mvp: {
    type: 'mvp',
    name: 'MVP',
    description: 'Jugador más valioso',
    icon: '👑',
    color: '#F59E0B',
  },
};

const ICON_OPTIONS = [
  { value: '🏆', label: 'Trofeo' },
  { value: '🥇', label: 'Medalla Oro' },
  { value: '🥈', label: 'Medalla Plata' },
  { value: '🥉', label: 'Medalla Bronce' },
  { value: '⭐', label: 'Estrella' },
  { value: '✨', label: 'Brillos' },
  { value: '👑', label: 'Corona' },
  { value: '🎮', label: 'Control' },
  { value: '🎯', label: 'Diana' },
  { value: '🔥', label: 'Fuego' },
  { value: '💎', label: 'Diamante' },
  { value: '🛡️', label: 'Escudo' },
  { value: '⚔️', label: 'Espadas' },
  { value: '🎖️', label: 'Insignia' },
  { value: '🏅', label: 'Medalla' },
];

const COLOR_OPTIONS = [
  { value: '#FFD700', label: 'Oro' },
  { value: '#C0C0C0', label: 'Plata' },
  { value: '#CD7F32', label: 'Bronce' },
  { value: '#9333EA', label: 'Morado' },
  { value: '#3B82F6', label: 'Azul' },
  { value: '#10B981', label: 'Verde' },
  { value: '#F59E0B', label: 'Naranja' },
  { value: '#EF4444', label: 'Rojo' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#6366F1', label: 'Índigo' },
];

interface BadgeManagerProps {
  badges: BadgeTemplate[];
  onChange: (badges: BadgeTemplate[]) => void;
  type?: 'tournament' | 'event';
}

export function BadgeManager({ badges, onChange, type = 'tournament' }: BadgeManagerProps) {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customBadge, setCustomBadge] = useState<Partial<BadgeType>>({
    type: 'custom',
    name: '',
    description: '',
    icon: '🏆',
    color: '#FFD700',
    isCustom: true,
  });
  const [customAwardTo, setCustomAwardTo] = useState<'position' | 'all-participants' | 'custom'>('position');
  const [customPosition, setCustomPosition] = useState('1');
  const [customEmails, setCustomEmails] = useState('');

  const addPresetBadge = (presetKey: string) => {
    const preset = BADGE_PRESETS[presetKey];
    if (!preset) return;

    // Check if this preset is already added
    const exists = badges.some(b => b.badge.type === preset.type);
    if (exists) return;

    const newBadge: BadgeTemplate = {
      id: generateId(),
      badge: {
        id: generateId(),
        ...preset,
      },
      awardTo: preset.type === 'participant' ? 'all-participants' : 'position',
      position: preset.position,
    };

    onChange([...badges, newBadge]);
  };

  const addCustomBadge = () => {
    if (!customBadge.name) return;

    const newBadge: BadgeTemplate = {
      id: generateId(),
      badge: {
        id: generateId(),
        type: 'custom',
        name: customBadge.name || 'Badge Personalizado',
        description: customBadge.description,
        icon: customBadge.icon || '🏆',
        color: customBadge.color || '#FFD700',
        image: customBadge.image,
        isCustom: true,
      },
      awardTo: customAwardTo,
      position: customAwardTo === 'position' ? customPosition : undefined,
      customEmails: customAwardTo === 'custom' ? customEmails.split(',').map(e => e.trim()).filter(Boolean) : undefined,
    };

    onChange([...badges, newBadge]);
    setIsAddingCustom(false);
    setCustomBadge({
      type: 'custom',
      name: '',
      description: '',
      icon: '🏆',
      color: '#FFD700',
      isCustom: true,
    });
    setCustomAwardTo('position');
    setCustomPosition('1');
    setCustomEmails('');
  };

  const removeBadge = (id: string) => {
    onChange(badges.filter(b => b.id !== id));
  };

  const getAwardToLabel = (template: BadgeTemplate): string => {
    switch (template.awardTo) {
      case 'all-participants':
        return 'Todos los participantes';
      case 'position':
        return `Posición ${template.position}`;
      case 'custom':
        return `${template.customEmails?.length || 0} usuarios`;
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Badges y Medallas
        </CardTitle>
        <CardDescription>
          Define badges que se otorgarán a los participantes según su posición o participación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Add Presets */}
        <div className="space-y-2">
          <Label>Añadir badges predefinidos</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BADGE_PRESETS).map(([key, preset]) => {
              const isAdded = badges.some(b => b.badge.type === preset.type);
              return (
                <Button
                  key={key}
                  type="button"
                  variant={isAdded ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => addPresetBadge(key)}
                  disabled={isAdded}
                  className="gap-1"
                >
                  <span>{preset.icon}</span>
                  {preset.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Current Badges */}
        {badges.length > 0 && (
          <div className="space-y-2">
            <Label>Badges configurados</Label>
            <div className="grid gap-2">
              {badges.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {template.badge.image ? (
                      <img
                        src={template.badge.image}
                        alt={template.badge.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: template.badge.color + '20' }}
                      >
                        {template.badge.icon}
                      </div>
                    )}
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {template.badge.name}
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: template.badge.color,
                            color: template.badge.color,
                          }}
                        >
                          {getAwardToLabel(template)}
                        </Badge>
                      </div>
                      {template.badge.description && (
                        <p className="text-sm text-muted-foreground">
                          {template.badge.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBadge(template.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Badge */}
        {!isAddingCustom ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setIsAddingCustom(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear badge personalizado
          </Button>
        ) : (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nuevo Badge Personalizado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge-name">Nombre *</Label>
                  <Input
                    id="badge-name"
                    placeholder="Ej: Leyenda del Torneo"
                    value={customBadge.name || ''}
                    onChange={(e) => setCustomBadge({ ...customBadge, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge-description">Descripción</Label>
                  <Input
                    id="badge-description"
                    placeholder="Descripción del badge"
                    value={customBadge.description || ''}
                    onChange={(e) => setCustomBadge({ ...customBadge, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ícono</Label>
                  <Select
                    value={customBadge.icon}
                    onValueChange={(value) => setCustomBadge({ ...customBadge, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <span className="text-xl">{customBadge.icon}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          <span className="text-xl mr-2">{icon.value}</span>
                          {icon.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select
                    value={customBadge.color}
                    onValueChange={(value) => setCustomBadge({ ...customBadge, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: customBadge.color }}
                          />
                          {COLOR_OPTIONS.find(c => c.value === customBadge.color)?.label}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Imagen personalizada (opcional)</Label>
                <CompactImageUpload
                  value={customBadge.image || ''}
                  onChange={(url) => setCustomBadge({ ...customBadge, image: url })}
                  folder="badges"
                />
              </div>

              <div className="space-y-2">
                <Label>Otorgar a</Label>
                <Select
                  value={customAwardTo}
                  onValueChange={(value) => setCustomAwardTo(value as 'position' | 'all-participants' | 'custom')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="position">Por posición</SelectItem>
                    <SelectItem value="all-participants">Todos los participantes</SelectItem>
                    <SelectItem value="custom">Usuarios específicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {customAwardTo === 'position' && (
                <div className="space-y-2">
                  <Label>Posición</Label>
                  <Select value={customPosition} onValueChange={setCustomPosition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1er Lugar</SelectItem>
                      <SelectItem value="2">2do Lugar</SelectItem>
                      <SelectItem value="3">3er Lugar</SelectItem>
                      <SelectItem value="top-4">Top 4</SelectItem>
                      <SelectItem value="top-8">Top 8</SelectItem>
                      <SelectItem value="top-16">Top 16</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {customAwardTo === 'custom' && (
                <div className="space-y-2">
                  <Label>Emails de usuarios (separados por coma)</Label>
                  <Textarea
                    placeholder="usuario1@email.com, usuario2@email.com"
                    value={customEmails}
                    onChange={(e) => setCustomEmails(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingCustom(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={addCustomBadge}
                  disabled={!customBadge.name}
                >
                  Añadir Badge
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {badges.length > 0 && (
          <div className="space-y-2">
            <Label>Vista previa de badges</Label>
            <div className="flex flex-wrap gap-2 p-4 rounded-lg bg-muted/50">
              {badges.map((template) => (
                <div
                  key={template.id}
                  className="relative group"
                  title={template.badge.description}
                >
                  {template.badge.image ? (
                    <img
                      src={template.badge.image}
                      alt={template.badge.name}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-background shadow-lg"
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-2xl ring-2 ring-background shadow-lg"
                      style={{
                        backgroundColor: template.badge.color,
                        boxShadow: `0 4px 14px ${template.badge.color}40`,
                      }}
                    >
                      {template.badge.icon}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component to display earned badges on profiles
interface BadgeDisplayProps {
  badges: BadgeType[];
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function BadgeDisplay({ badges, size = 'md', showTooltip = true }: BadgeDisplayProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-lg',
    md: 'h-10 w-10 text-xl',
    lg: 'h-14 w-14 text-3xl',
  };

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge, index) => (
        <div
          key={badge.id || index}
          className="relative group cursor-pointer"
          title={showTooltip ? `${badge.name}${badge.description ? `: ${badge.description}` : ''}` : undefined}
        >
          {badge.image ? (
            <img
              src={badge.image}
              alt={badge.name}
              className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-background shadow-lg transition-transform hover:scale-110`}
            />
          ) : (
            <div
              className={`${sizeClasses[size]} rounded-full flex items-center justify-center ring-2 ring-background shadow-lg transition-transform hover:scale-110`}
              style={{
                backgroundColor: badge.color,
                boxShadow: `0 4px 14px ${badge.color}40`,
              }}
            >
              {badge.icon}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default BadgeManager;
