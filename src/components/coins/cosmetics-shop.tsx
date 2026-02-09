"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCoins } from "@/hooks/use-coins";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatCoins } from "@/lib/coins";
import { 
  RARITY_COLORS, RARITY_LABELS, CATEGORY_LABELS, CATEGORY_ICONS,
  type CosmeticItem, type CosmeticCategory, type CosmeticRarity
} from "@/types/coins";
import { Coins, ShoppingBag, Check, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Fallback catalog when DB is empty ──────────────
const FALLBACK_ITEMS: CosmeticItem[] = [
  // === AVATARES — Bottts Neutral (robots minimalistas) ===
  { id: 'fb-bottts-1', slug: 'bottts_circuit', name: 'Circuit', description: 'Robot con circuitos integrados', category: 'avatar_collection', price: 20, image_preview: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=circuit', rarity: 'common', metadata: { dicebear_style: 'bottts-neutral', seeds: ['circuit'] }, is_active: true, created_at: '' },
  { id: 'fb-bottts-2', slug: 'bottts_spark', name: 'Spark', description: 'Robot eléctrico y energético', category: 'avatar_collection', price: 20, image_preview: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=spark', rarity: 'common', metadata: { dicebear_style: 'bottts-neutral', seeds: ['spark'] }, is_active: true, created_at: '' },
  { id: 'fb-bottts-3', slug: 'bottts_bolt', name: 'Bolt', description: 'Robot veloz como un rayo', category: 'avatar_collection', price: 20, image_preview: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=bolt', rarity: 'common', metadata: { dicebear_style: 'bottts-neutral', seeds: ['bolt'] }, is_active: true, created_at: '' },
  { id: 'fb-bottts-4', slug: 'bottts_gear', name: 'Gear', description: 'Robot mecánico con engranajes', category: 'avatar_collection', price: 20, image_preview: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=gear', rarity: 'common', metadata: { dicebear_style: 'bottts-neutral', seeds: ['gear'] }, is_active: true, created_at: '' },
  { id: 'fb-bottts-5', slug: 'bottts_neon', name: 'Neon', description: 'Robot con luces de neón', category: 'avatar_collection', price: 20, image_preview: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=neon', rarity: 'rare', metadata: { dicebear_style: 'bottts-neutral', seeds: ['neon'] }, is_active: true, created_at: '' },
  { id: 'fb-bottts-6', slug: 'bottts_quantum', name: 'Quantum', description: 'Robot cuántico avanzado', category: 'avatar_collection', price: 20, image_preview: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=quantum', rarity: 'rare', metadata: { dicebear_style: 'bottts-neutral', seeds: ['quantum'] }, is_active: true, created_at: '' },
  // === MARCOS ===
  { id: 'fb-frame-1', slug: 'frame_golden', name: 'Marco Dorado', description: 'Un elegante borde dorado para tu avatar', category: 'bracket_frame', price: 100, image_preview: null, rarity: 'common', metadata: { border_color: '#FFD700', border_style: 'solid', border_width: 3, glow: false }, is_active: true, created_at: '' },
  { id: 'fb-frame-2', slug: 'frame_neon_blue', name: 'Neón Azul', description: 'Borde luminoso en tono azul eléctrico', category: 'bracket_frame', price: 150, image_preview: null, rarity: 'rare', metadata: { border_color: '#00D4FF', border_style: 'solid', border_width: 2, glow: true, glow_color: '#00D4FF' }, is_active: true, created_at: '' },
  { id: 'fb-frame-3', slug: 'frame_fire', name: 'Marco de Fuego', description: 'Borde animado con efecto de llamas', category: 'bracket_frame', price: 300, image_preview: null, rarity: 'epic', metadata: { border_color: '#FF4500', border_style: 'animated', animation: 'fire', glow: true, glow_color: '#FF6B00' }, is_active: true, created_at: '' },
  { id: 'fb-frame-4', slug: 'frame_legendary', name: 'Marco Legendario', description: 'El máximo prestigio: borde arcoíris animado', category: 'bracket_frame', price: 500, image_preview: null, rarity: 'legendary', metadata: { border_style: 'animated', animation: 'rainbow', glow: true, gradient: ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#8B00FF'] }, is_active: true, created_at: '' },
  // === BANNERS ===
  { id: 'fb-banner-1', slug: 'banner_galaxy', name: 'Galaxia', description: 'Fondo de galaxia con estrellas', category: 'profile_banner', price: 350, image_preview: null, rarity: 'legendary', metadata: { gradient: ['#0c0d13','#1a1a2e','#16213e','#0f3460'], pattern: 'stars', animated: true }, is_active: true, created_at: '' },
  { id: 'fb-banner-2', slug: 'banner_fire_gradient', name: 'Fuego Vivo', description: 'Gradiente de tonos cálidos y ardientes', category: 'profile_banner', price: 80, image_preview: null, rarity: 'common', metadata: { gradient: ['#f12711', '#f5af19'], pattern: 'none' }, is_active: true, created_at: '' },
  // === COLORES DE NICKNAME ===
  { id: 'fb-nick-1', slug: 'nick_gold', name: 'Nombre Dorado', description: 'Tu nickname brilla en dorado', category: 'nickname_color', price: 100, image_preview: null, rarity: 'common', metadata: { color: '#FFD700', gradient: false }, is_active: true, created_at: '' },
  { id: 'fb-nick-2', slug: 'nick_rainbow', name: 'Nombre Arcoíris', description: 'Tu nickname con todos los colores', category: 'nickname_color', price: 400, image_preview: null, rarity: 'legendary', metadata: { gradient: true, animated: true, colors: ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#8B00FF'] }, is_active: true, created_at: '' },
];

export function CosmeticsShop() {
  const { user } = useAuth();
  const { balance, refresh: refreshWallet } = useCoins();
  const { toast } = useToast();
  const [items, setItems] = useState<CosmeticItem[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [equippedIds, setEquippedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const fetchShop = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/coins/shop', { headers });
      if (response.ok) {
        const data = await response.json();
        const fetchedItems = data.items || [];
        // Use fallback catalog if DB is empty
        setItems(fetchedItems.length > 0 ? fetchedItems : FALLBACK_ITEMS);
        setOwnedIds(new Set(data.owned || []));
      } else {
        // API error — show fallback items anyway
        setItems(FALLBACK_ITEMS);
      }

      // Fetch equipped
      if (user?.email) {
        const { data: equipped } = await supabase
          .from('user_cosmetics')
          .select('item_id')
          .eq('user_email', user.email)
          .eq('is_equipped', true);
        
        setEquippedIds(new Set((equipped || []).map((e: any) => e.item_id)));
      }
    } catch (err) {
      console.error('Error fetching shop:', err);
      // On any error, show fallback items so the shop is never empty
      if (items.length === 0) {
        setItems(FALLBACK_ITEMS);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handlePurchase = async (item: CosmeticItem) => {
    if (!user?.email) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para comprar artículos",
        variant: "destructive",
      });
      return;
    }

    // Check balance before attempting purchase
    if (balance < item.price) {
      const deficit = item.price - balance;
      toast({
        title: "Monedas insuficientes",
        description: `Te faltan ${deficit.toLocaleString()} DC para comprar "${item.name}". ¡Completa misiones o compra monedas!`,
        variant: "destructive",
      });
      return;
    }

    setPurchasingId(item.id);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/coins/shop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'purchase', itemId: item.id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "¡Compra exitosa!",
          description: `Has adquirido "${item.name}"`,
        });
        setOwnedIds(prev => new Set([...prev, item.id]));
        await refreshWallet();
        setSelectedItem(null);
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo completar la compra",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquip = async (item: CosmeticItem, equip: boolean) => {
    if (!user?.email) return;
    setEquippingId(item.id);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/coins/shop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'equip', itemId: item.id, equip }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local state
        if (equip) {
          // Remove other items from same category
          const newEquipped = new Set(equippedIds);
          items.forEach(i => {
            if (i.category === item.category) newEquipped.delete(i.id);
          });
          newEquipped.add(item.id);
          setEquippedIds(newEquipped);
        } else {
          const newEquipped = new Set(equippedIds);
          newEquipped.delete(item.id);
          setEquippedIds(newEquipped);
        }

        toast({
          title: equip ? "Equipado" : "Desequipado",
          description: `"${item.name}" ${equip ? 'equipado' : 'desequipado'}`,
        });
      }
    } catch (err) {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setEquippingId(null);
    }
  };

  // Functional categories only
  const SHOP_CATEGORIES: CosmeticCategory[] = [
    'avatar_collection', 'bracket_frame', 'profile_banner', 'nickname_color',
  ];

  const shopItems = useMemo(() => {
    return items.filter(i => SHOP_CATEGORIES.includes(i.category as CosmeticCategory));
  }, [items]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(shopItems.map(i => i.category)));
  }, [shopItems]);

  const displayItems = useMemo(() => {
    if (activeCategory === 'all') return shopItems;
    return shopItems.filter(i => i.category === activeCategory);
  }, [shopItems, activeCategory]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            Todo
          </button>
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {CATEGORY_ICONS[cat as CosmeticCategory]} {CATEGORY_LABELS[cat as CosmeticCategory]}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayItems.map(item => {
            const isOwned = ownedIds.has(item.id);
            const isEquipped = equippedIds.has(item.id);
            const canAfford = balance >= item.price;
            const rarityStyle = RARITY_COLORS[item.rarity as CosmeticRarity];

            return (
              <Card
                key={item.id}
                className={`group cursor-pointer transition-all hover:shadow-lg ${
                  isEquipped ? 'ring-2 ring-primary' : ''
                } ${rarityStyle.border ? `border-${item.rarity === 'legendary' ? 'amber' : item.rarity === 'epic' ? 'purple' : item.rarity === 'rare' ? 'blue' : 'zinc'}-500/30` : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {CATEGORY_LABELS[item.category as CosmeticCategory]}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${rarityStyle.bg} ${rarityStyle.text}`}
                    >
                      {RARITY_LABELS[item.rarity as CosmeticRarity]}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  {/* Preview */}
                  <ItemPreview item={item} />
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                </CardContent>

                <CardFooter className="flex items-center justify-between pt-0">
                  <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
                    <Coins className="h-3.5 w-3.5" />
                    {item.price}
                  </span>

                  {isOwned ? (
                    isEquipped ? (
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        <Check className="h-3 w-3 mr-1" /> Equipado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-green-400 border-green-500/30">
                        <Check className="h-3 w-3 mr-1" /> Adquirido
                      </Badge>
                    )
                  ) : (
                    <Button
                      size="sm"
                      variant={canAfford ? "default" : "outline"}
                      className={`text-xs h-7 px-3 ${!canAfford ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase(item);
                      }}
                      disabled={purchasingId === item.id}
                    >
                      {purchasingId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <ShoppingBag className="h-3 w-3 mr-1" />
                      )}
                      Comprar
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl">{selectedItem.name}</DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-xs ${RARITY_COLORS[selectedItem.rarity as CosmeticRarity].bg} ${RARITY_COLORS[selectedItem.rarity as CosmeticRarity].text}`}
                >
                  {RARITY_LABELS[selectedItem.rarity as CosmeticRarity]}
                </Badge>
              </div>
              <DialogDescription>{selectedItem.description}</DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <ItemPreview item={selectedItem} large />
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <span className="flex items-center gap-2 text-lg font-bold text-amber-400">
                <Coins className="h-5 w-5" />
                {selectedItem.price} DC
              </span>

              {ownedIds.has(selectedItem.id) ? (
                <Button
                  onClick={() => handleEquip(selectedItem, !equippedIds.has(selectedItem.id))}
                  disabled={equippingId === selectedItem.id}
                  variant={equippedIds.has(selectedItem.id) ? "outline" : "default"}
                >
                  {equippingId === selectedItem.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : equippedIds.has(selectedItem.id) ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {equippedIds.has(selectedItem.id) ? "Desequipar" : "Equipar"}
                </Button>
              ) : (
                <Button
                  onClick={() => handlePurchase(selectedItem)}
                  disabled={purchasingId === selectedItem.id}
                  variant={balance < selectedItem.price ? "outline" : "default"}
                  className={balance < selectedItem.price ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : ''}
                >
                  {purchasingId === selectedItem.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 mr-2" />
                  )}
                  {balance < selectedItem.price 
                    ? `Comprar (te faltan ${(selectedItem.price - balance).toLocaleString()} DC)` 
                    : "Comprar"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

// ─── Preview Component ──────────────────────────

function ItemPreview({ item, large = false }: { item: CosmeticItem; large?: boolean }) {
  const metadata = item.metadata || {};
  const size = large ? 'h-32' : 'h-20';

  switch (item.category) {
    case 'avatar_collection': {
      const style = metadata.dicebear_style || 'adventurer';
      const seeds: string[] = metadata.seeds || ['seed1', 'seed2', 'seed3', 'seed4'];
      const displaySeeds = large ? seeds.slice(0, 8) : seeds.slice(0, 4);
      const isSingle = seeds.length === 1;

      // If the item has an image_preview URL, show it directly
      if (item.image_preview) {
        return (
          <div className={`flex justify-center ${large ? 'py-4' : 'py-1'}`}>
            <Avatar className={large ? 'h-24 w-24' : 'h-16 w-16'}>
              <AvatarImage src={item.image_preview} alt={item.name} />
              <AvatarFallback>{item.name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        );
      }

      return (
        <div className={`flex flex-wrap gap-2 justify-center ${large ? 'py-4' : 'py-1'}`}>
          {displaySeeds.map((seed) => (
            <Avatar key={seed} className={isSingle ? (large ? 'h-24 w-24' : 'h-16 w-16') : (large ? 'h-14 w-14' : 'h-10 w-10')}>
              <AvatarImage
                src={`https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`}
                alt={seed}
              />
              <AvatarFallback>{seed[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      );
    }

    case 'bracket_frame': {
      const borderColor = metadata.border_color || '#FFD700';
      const glow = metadata.glow;
      const glowColor = metadata.glow_color || borderColor;
      const isAnimated = metadata.border_style === 'animated';
      const gradient = metadata.gradient;

      const style: React.CSSProperties = gradient
        ? {
            border: '3px solid transparent',
            backgroundImage: `linear-gradient(var(--card), var(--card)), linear-gradient(135deg, ${(gradient as string[]).join(', ')})`,
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            ...(glow ? { boxShadow: `0 0 12px ${glowColor}40` } : {}),
          }
        : {
            border: `3px solid ${borderColor}`,
            ...(glow ? { boxShadow: `0 0 12px ${glowColor}40` } : {}),
          };

      return (
        <div
          className={`${size} rounded-lg flex items-center justify-center bg-muted/50 ${isAnimated ? 'animate-pulse' : ''}`}
          style={style}
        >
          <span className={large ? 'text-3xl' : 'text-xl'}>🏆</span>
        </div>
      );
    }

    case 'profile_banner': {
      const gradient = metadata.gradient as string[] || ['#6366f1', '#8b5cf6'];
      const isAnimated = metadata.animated;
      const pattern = metadata.pattern;

      return (
        <div
          className={`${size} rounded-lg overflow-hidden relative`}
          style={{
            background: `linear-gradient(135deg, ${gradient.join(', ')})`,
          }}
        >
          {pattern === 'stars' && (
            <div className="absolute inset-0 opacity-50">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-1 h-1 bg-white rounded-full ${isAnimated ? 'animate-pulse' : ''}`}
                  style={{
                    left: `${(i * 17 + 5) % 100}%`,
                    top: `${(i * 23 + 10) % 100}%`,
                    animationDelay: `${(i * 0.3) % 2}s`,
                  }}
                />
              ))}
            </div>
          )}
          {pattern === 'grid' && (
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          )}
        </div>
      );
    }

    case 'nickname_color': {
      const color = metadata.color || '#FFD700';
      const isGradient = metadata.gradient;
      const colors = metadata.colors as string[] || [color];
      const isAnimated = metadata.animated;

      const textStyle: React.CSSProperties = isGradient
        ? {
            backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }
        : { color };

      return (
        <div className={`${size} rounded-lg flex items-center justify-center bg-muted/50`}>
          <span
            className={`${large ? 'text-2xl' : 'text-lg'} font-bold ${isAnimated ? 'animate-pulse' : ''}`}
            style={textStyle}
          >
            PlayerName
          </span>
        </div>
      );
    }

    case 'victory_effect':
    default:
      return (
        <div className={`${size} rounded-lg bg-muted flex items-center justify-center`}>
          <Sparkles className="h-6 w-6 text-muted-foreground" />
        </div>
      );
  }
}
