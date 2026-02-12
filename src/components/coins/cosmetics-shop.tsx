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
  const [viewMode, setViewMode] = useState<'shop' | 'inventory'>('shop');

  useEffect(() => {
    // Sync viewMode with URL search params
    const params = new URLSearchParams(window.location.search);
    if (params.get('inventory') === 'true') {
      setViewMode('inventory');
    }
  }, []);

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
        setItems(fetchedItems);
        setOwnedIds(new Set(data.owned || []));
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
    let base = shopItems;
    if (viewMode === 'inventory') {
      base = shopItems.filter(i => ownedIds.has(i.id));
    }
    
    if (activeCategory === 'all') return base;
    return base.filter(i => i.category === activeCategory);
  }, [shopItems, activeCategory, viewMode, ownedIds]);

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
        {/* Toggle Mode & Category filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
           <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => setViewMode('shop')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'shop' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                Mercado
              </button>
              <button
                onClick={() => setViewMode('inventory')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'inventory' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Mi Colección
              </button>
           </div>

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
        </div>

        {/* Empty State Inventory */}
        {viewMode === 'inventory' && displayItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card/40 rounded-xl border border-dashed border-border">
             <div className="p-4 bg-muted rounded-full mb-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
             </div>
             <h3 className="text-lg font-bold">Tu colección está vacía</h3>
             <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
               Aún no has adquirido cosméticos de esta categoría. ¡Visita el mercado para personalizar tu perfil!
             </p>
             <Button 
                variant="outline" 
                className="mt-6"
                onClick={() => setViewMode('shop')}
             >
               Ir al Mercado
             </Button>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayItems.map((item) => {
            const isOwned = ownedIds.has(item.id);
            const isEquipped = equippedIds.has(item.id);
            const canAfford = balance >= item.price;
            const rarityStyle = RARITY_COLORS[item.rarity as CosmeticRarity];
            
            // Border and glow colors based on rarity
            const colorMap: Record<string, string> = {
              common: 'zinc',
              rare: 'blue',
              epic: 'purple',
              legendary: 'amber'
            };
            const activeColor = colorMap[item.rarity] || 'zinc';

            return (
              <div
                key={item.id}
                className="group relative"
                onClick={() => setSelectedItem(item)}
              >
                {/* Rarity Glow Effect */}
                <div className={`absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md ${
                  item.rarity === 'legendary' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500' :
                  item.rarity === 'epic' ? 'bg-purple-500' :
                  item.rarity === 'rare' ? 'bg-blue-500' : 'bg-zinc-500'
                }`} />

                <Card
                  className={`relative flex flex-col h-full overflow-hidden border-border bg-card/80 backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-1 ${
                    isEquipped ? 'ring-2 ring-primary border-transparent' : ''
                  }`}
                >
                  <CardHeader className="pb-3 space-y-1">
                    <div className="flex items-start justify-between">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-none ${rarityStyle.bg} ${rarityStyle.text}`}
                      >
                        {RARITY_LABELS[item.rarity as CosmeticRarity]}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm font-black text-amber-400">
                        {isOwned ? (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-none text-[10px] uppercase">Poseído</Badge>
                        ) : (
                          <>
                            <Coins className="h-3.5 w-3.5" />
                            {item.price}
                          </>
                        )}
                      </span>
                    </div>
                    <CardTitle className="text-base truncate">{item.name}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1.5 uppercase font-medium">
                      <span className="opacity-70">{CATEGORY_ICONS[item.category as CosmeticCategory]}</span>
                      {CATEGORY_LABELS[item.category as CosmeticCategory]}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-grow pb-4 px-4">
                    <div className="relative aspect-video flex items-center justify-center rounded-lg bg-muted/30 border border-border/50 overflow-hidden mb-3">
                      <ItemPreview item={item} fill />
                      {isOwned && (
                        <div className="absolute top-2 right-2">
                           <div className="bg-emerald-500 text-white rounded-full p-1 shadow-lg shadow-emerald-500/20">
                             <Check className="h-3 w-3" />
                           </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">
                      "{item.description}"
                    </p>
                  </CardContent>

                  <CardFooter className="pt-0 pb-4 px-4 flex gap-2">
                    {isOwned ? (
                      <Button
                        size="sm"
                        variant={isEquipped ? "outline" : "default"}
                        className={`w-full text-xs h-8 ${isEquipped ? 'border-primary text-primary' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquip(item, !isEquipped);
                        }}
                      >
                        {isEquipped ? "Desequipar" : "Equipar"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={canAfford ? "default" : "outline"}
                        className={`w-full text-xs h-8 ${!canAfford ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'bg-primary hover:bg-primary/90'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchase(item);
                        }}
                        disabled={purchasingId === item.id}
                      >
                        {purchasingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        ) : (
                          <ShoppingBag className="h-3.5 w-3.5 mr-2" />
                        )}
                        Comprar ahora
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
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

function ItemPreview({ item, large = false, fill = false }: { item: CosmeticItem; large?: boolean; fill?: boolean }) {
  const metadata = item.metadata || {};
  const size = fill ? 'w-full h-full' : (large ? 'h-32 w-full' : 'h-20 w-full');

  switch (item.category) {
    case 'avatar_collection': {
      const style = metadata.dicebear_style || 'adventurer';
      const seeds: string[] = metadata.seeds || ['seed1', 'seed2', 'seed3', 'seed4'];
      const displaySeeds = large ? seeds.slice(0, 8) : seeds.slice(0, 4);
      const isSingle = seeds.length === 1;

      // If the item has an image_preview URL, show it directly
      if (item.image_preview) {
        return (
          <div className={`flex items-center justify-center ${fill ? 'h-full w-full' : (large ? 'py-4' : 'py-1')}`}>
            <Avatar className={large ? 'h-24 w-24' : 'h-16 w-16'}>
              <AvatarImage src={item.image_preview} alt={item.name} />
              <AvatarFallback>{item.name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        );
      }

      return (
        <div className={`flex flex-wrap gap-2 items-center justify-center ${fill ? 'h-full w-full' : (large ? 'py-4' : 'py-1')}`}>
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
          className={`${size} rounded-lg overflow-hidden relative shadow-inner`}
          style={{
            background: `linear-gradient(135deg, ${gradient.join(', ')})`,
          }}
        >
          {pattern === 'stars' && (
            <div className="absolute inset-0 opacity-50">
              {[...Array(15)].map((_, i) => (
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
