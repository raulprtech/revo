"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, Users, Search, Loader2, Plus, Trophy, CalendarDays, Zap, CreditCard, Coins,
  ArrowRightLeft, AlertCircle, Banknote
} from "lucide-react";
import Link from 'next/link';
import { useState } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { useSubscription } from "@/lib/subscription";
import { useCoins } from "@/hooks/use-coins";
import { useUserTournaments } from "@/hooks/use-tournaments";
import { Pagination, paginateArray } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { coinsService } from "@/lib/coins";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const DASHBOARD_PER_PAGE = 10;

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { isPro, subscription } = useSubscription();
    const { balance, cashBalance, dailyAvailable, refresh: refreshCoins } = useCoins();
    const { toast } = useToast();
    
    // Reinversion State
    const [isConvertOpen, setIsConvertOpen] = useState(false);
    const [convertAmount, setConvertAmount] = useState<string>("");
    const [isConverting, setIsConverting] = useState(false);

    // Withdrawal State (Payout)
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState<string>("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const handleWithdraw = async () => {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({ title: "Monto inválido", variant: "destructive" });
        return;
      }
      if (amount > cashBalance) {
        toast({ title: "Saldo insuficiente", variant: "destructive" });
        return;
      }

      setIsWithdrawing(true);
      try {
        const result = await coinsService.requestPayout(user!.email!, amount);
        if (result.success) {
          toast({ 
            title: "Retiro solicitado", 
            description: `Se han retenido $${amount} MXN. Recibirás $${result.netAmount} MXN en tu cuenta vinculada.` 
          });
          setIsWithdrawOpen(false);
          setWithdrawAmount("");
          refreshCoins();
        } else {
          toast({ title: "Error", description: result.error, variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
      } finally {
        setIsWithdrawing(false);
      }
    };

    const handleConvert = async () => {
      const amount = parseFloat(convertAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({ title: "Monto inválido", variant: "destructive" });
        return;
      }
      if (amount > cashBalance) {
        toast({ title: "Saldo insuficiente", variant: "destructive" });
        return;
      }

      setIsConverting(true);
      try {
        const result = await coinsService.convertCashToCoins(user!.email!, amount);
        if (result.success) {
          toast({ 
            title: "¡Conversión exitosa!", 
            description: `Has recibido ${result.coinsAdded} coins (incluyendo el bono del 10%).` 
          });
          setIsConvertOpen(false);
          setConvertAmount("");
          refreshCoins();
        } else {
          toast({ title: "Error", description: result.error, variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
      } finally {
        setIsConverting(false);
      }
    };

    const { ownedTournaments, participatingTournaments, isLoading: tournamentsLoading } = useUserTournaments();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed' | 'finances'>('all');
    const [ownedPage, setOwnedPage] = useState(1);
    const [participatingPage, setParticipatingPage] = useState(1);
    const [cashTransactions, setCashTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'finances' && user?.email) {
            coinsService.getCashHistory(user.email).then(setCashTransactions);
        }
    }, [activeTab, user?.email]);
    // Note: Route protection is handled by middleware.
    // The useAuth() hook is used here only for user data display.

    const loading = authLoading || tournamentsLoading;

    // Filter tournaments by status and search term
    const filterTournaments = (tournaments: typeof ownedTournaments) => {
        return tournaments.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            
            switch (activeTab) {
                case 'pending':
                    return t.status === 'Próximo';
                case 'active':
                    return t.status === 'En Curso';
                case 'completed':
                    return t.status === 'Completado';
                default:
                    return true;
            }
        });
    };

    const filteredOwned = filterTournaments(ownedTournaments);
    const filteredParticipating = filterTournaments(participatingTournaments);
    const allFiltered = [...filteredOwned, ...filteredParticipating];

    const paginatedOwned = paginateArray(filteredOwned, ownedPage, DASHBOARD_PER_PAGE);
    const paginatedParticipating = paginateArray(filteredParticipating, participatingPage, DASHBOARD_PER_PAGE);

    // Reset pages when filters/search change
    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setOwnedPage(1);
        setParticipatingPage(1);
    };

    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
        setOwnedPage(1);
        setParticipatingPage(1);
    };

    // Count by status for tabs
    const allTournaments = [...ownedTournaments, ...participatingTournaments];
    const pendingCount = allTournaments.filter(t => t.status === 'Próximo').length;
    const activeCount = allTournaments.filter(t => t.status === 'En Curso').length;
    const completedCount = allTournaments.filter(t => t.status === 'Completado').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="bg-background text-foreground min-h-screen p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <h1 className="text-4xl font-bold">Panel de Organizador</h1>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="lg">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear Nuevo
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem asChild>
                                <Link href="/tournaments/create" className="flex items-center cursor-pointer">
                                    <Trophy className="mr-2 h-4 w-4" />
                                    <div>
                                        <div className="font-medium">Torneo</div>
                                        <div className="text-xs text-muted-foreground">Competencia individual</div>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/events/create" className="flex items-center cursor-pointer">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    <div>
                                        <div className="font-medium">Evento</div>
                                        <div className="text-xs text-muted-foreground">Agrupa múltiples torneos</div>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Plan Card */}
                <div className="mb-6 p-4 rounded-lg border border-border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPro ? (
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <div className="p-2 bg-muted rounded-full">
                        <Zap className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">
                        Plan {isPro ? 'Organizer Plus' : 'Community'}
                        {isPro && subscription?.cancel_at_period_end && (
                          <span className="ml-2 text-xs text-destructive">(se cancela pronto)</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isPro ? 'Acceso completo a todas las funciones' : 'Funciones básicas gratuitas'}
                      </p>
                    </div>
                  </div>
                  <Button variant={isPro ? 'outline' : 'default'} size="sm" asChild>
                    <Link href={isPro ? '/billing' : '/pricing'}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      {isPro ? 'Facturación' : 'Upgrade'}
                    </Link>
                  </Button>
                </div>

                {/* Wallet Strategy: Dual Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Duels Cash (Saldo Retirable) */}
                  <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-full">
                        <CreditCard className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Duels Cash (Retirable)</p>
                        <p className="text-2xl font-bold text-emerald-400">
                          ${cashBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs shadow-none"
                        onClick={() => setIsWithdrawOpen(true)}
                      >
                        Retirar
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs border-none shadow-none"
                        onClick={() => setIsConvertOpen(true)}
                      >
                        Reinvertir (+10%)
                      </Button>
                    </div>
                  </div>

                  {/* Duels Coins (Saldo de Uso) */}
                  <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-full">
                        <Coins className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Duels Coins (Favoritos)</p>
                        <p className="text-2xl font-bold text-amber-400">
                          {balance.toLocaleString()} 
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs h-8 shadow-none" asChild>
                      <Link href="/coins">
                        Tienda
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="flex border-b border-border mb-6 overflow-x-auto">
                    <button 
                        onClick={() => handleTabChange('all')}
                        className={`py-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'all' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        TODOS {allTournaments.length}
                    </button>
                    <button 
                        onClick={() => handleTabChange('pending')}
                        className={`py-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'pending' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        PENDIENTE {pendingCount}
                    </button>
                    <button 
                        onClick={() => handleTabChange('active')}
                        className={`py-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'active' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        EN CURSO {activeCount}
                    </button>
                    <button 
                        onClick={() => handleTabChange('completed')}
                        className={`py-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'completed' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        COMPLETO {completedCount}
                    </button>                    <button 
                        onClick={() => handleTabChange('finances')}
                        className={`py-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === 'finances' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        FINANZAS
                    </button>                </div>

                <div className="relative mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar tus torneos" 
                        className="pl-10 bg-card border-border h-12" 
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>

                {/* Owned Tournaments Section */}
                {filteredOwned.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                            Torneos que organizas
                            <span className="text-sm font-normal ml-2">({filteredOwned.length})</span>
                        </h2>
                        <div className="space-y-4">
                            {paginatedOwned.data.map((tournament) => (
                                <TournamentCard key={tournament.id} tournament={tournament} isOwner />
                            ))}
                        </div>
                        <Pagination
                            currentPage={ownedPage}
                            totalPages={paginatedOwned.totalPages}
                            onPageChange={setOwnedPage}
                            className="mt-4"
                        />
                    </div>
                )}

                {/* Participating Tournaments Section */}
                {activeTab !== 'finances' && filteredParticipating.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                            Torneos en los que participas
                            <span className="text-sm font-normal ml-2">({filteredParticipating.length})</span>
                        </h2>
                        <div className="space-y-4">
                            {paginatedParticipating.data.map((tournament) => (
                                <TournamentCard key={tournament.id} tournament={tournament} />
                            ))}
                        </div>
                        <Pagination
                            currentPage={participatingPage}
                            totalPages={paginatedParticipating.totalPages}
                            onPageChange={setParticipatingPage}
                            className="mt-4"
                        />
                    </div>
                )}

                {/* Finances Tab Content */}
                {activeTab === 'finances' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card className="bg-card">
                                <CardHeader className="pb-2">
                                    <CardDescription>Ganado (Lifetime)</CardDescription>
                                    <CardTitle className="text-2xl text-emerald-400">
                                        ${wallet?.lifetime_cash_earned?.toLocaleString() || '0.00'}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="bg-card">
                                <CardHeader className="pb-2">
                                    <CardDescription>Retirado</CardDescription>
                                    <CardTitle className="text-2xl text-muted-foreground">
                                        ${wallet?.lifetime_cash_withdrawn?.toLocaleString() || '0.00'}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="bg-card">
                                <CardHeader className="pb-2">
                                    <CardDescription>Disponible</CardDescription>
                                    <CardTitle className="text-2xl text-primary">
                                        ${cashBalance.toLocaleString()}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Historial de Transacciones (Cash)</CardTitle>
                                <CardDescription>Registro auditado de tus movimientos de dinero real</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1">
                                    {cashTransactions.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            No hay movimientos registrados.
                                        </div>
                                    ) : (
                                        cashTransactions.map(tx => (
                                            <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors border-b border-border last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${
                                                        tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                                    }`}>
                                                        {tx.amount > 0 ? <Plus className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{tx.description || tx.type}</p>
                                                        <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-foreground'}`}>
                                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} MXN
                                                    </p>
                                                    <Badge variant="outline" className="text-[10px] py-0 h-4 uppercase">{tx.status}</Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Empty State */}
                {allFiltered.length === 0 && (
                    <div className="text-center py-16 bg-card rounded-lg">
                        <h3 className="text-xl font-semibold">No se encontraron torneos</h3>
                        <p className="text-muted-foreground mt-2">
                            {searchTerm 
                                ? `No hay torneos que coincidan con "${searchTerm}".`
                                : activeTab !== 'all'
                                    ? `No tienes torneos ${activeTab === 'pending' ? 'pendientes' : activeTab === 'active' ? 'en curso' : 'completados'}.`
                                    : "No has creado ni te has unido a ningún torneo todavía."
                            }
                        </p>
                        {!searchTerm && activeTab === 'all' && (
                            <div className="flex gap-4 justify-center mt-4">
                                <Button asChild>
                                    <Link href="/tournaments/create">Crear tu primer torneo</Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href="/tournaments">Explorar torneos</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-emerald-400" />
                        Retirar Fondos
                      </DialogTitle>
                      <DialogDescription>
                        Envía tus ganancias directamente a tu cuenta bancaria vía Stripe Connect.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border border-border">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Saldo Retirable</span>
                          <span className="font-bold text-emerald-400 text-xl">${cashBalance.toLocaleString()} MXN</span>
                        </div>
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5">Verificado</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Monto a retirar (MXN)</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                        />
                      </div>

                      <div className="p-3 rounded-md bg-muted/30 border border-dashed border-border text-xs space-y-2 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Comisión de retiro (Fija):</span>
                          <span className="text-foreground">$15.00 MXN</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t border-border/50">
                          <span>Recibirás en tu banco:</span>
                          <span className="text-emerald-400">${(Math.max(0, (parseFloat(withdrawAmount) || 0) - 15)).toLocaleString()} MXN</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-200/80">
                        <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                        <p>Los retiros suelen procesarse en 2-3 días hábiles. Asegúrate de tener tu cuenta de Stripe Connect vinculada en Ajustes.</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>Cancelar</Button>
                      <Button 
                        onClick={handleWithdraw} 
                        disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 15}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isWithdrawing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          "Confirmar Retiro"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-emerald-400" />
                        Reinvertir en Duels
                      </DialogTitle>
                      <DialogDescription>
                        Convierte tu saldo de Cash a Duels Coins y obtén un <strong>10% EXTRA</strong> de regalo. 
                        Este proceso no es reversible.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                        <span className="text-sm">Saldo Disponible:</span>
                        <span className="font-bold text-emerald-400">${cashBalance.toLocaleString()} MXN</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Monto a convertir (MXN)</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={convertAmount}
                          onChange={(e) => setConvertAmount(e.target.value)}
                        />
                      </div>
                      {convertAmount && !isNaN(parseFloat(convertAmount)) && (
                        <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-center">
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Recibirás aproximadamente</p>
                          <p className="text-2xl font-black text-emerald-400">
                            {(parseFloat(convertAmount) * 11).toLocaleString()} Coins
                          </p>
                          <p className="text-[10px] text-emerald-500/70 mt-1">Incluye bono de {(parseFloat(convertAmount) * 1).toLocaleString()} Coins</p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsConvertOpen(false)}>Cancelar</Button>
                      <Button 
                        onClick={handleConvert} 
                        disabled={isConverting || !convertAmount}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isConverting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Convirtiendo...
                          </>
                        ) : (
                          "Confirmar Reinversión"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

// Tournament Card Component
function TournamentCard({ tournament, isOwner = false }: { 
    tournament: { 
        id: string; 
        name: string; 
        description?: string; 
        participants: number; 
        max_participants: number; 
        start_date: string;
        image?: string;
        status: string;
    }; 
    isOwner?: boolean;
}) {
    return (
        <Link href={`/tournaments/${tournament.id}`} className="block">
            <div className="bg-card p-4 rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={tournament.image} />
                        <AvatarFallback>{tournament.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-semibold">{tournament.name}</p>
                            {isOwner && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Organizador</span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{tournament.description}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{tournament.participants} / {tournament.max_participants}</span>
                    </div>
                    <div className="text-sm text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                            tournament.status === 'En Curso' ? 'bg-green-500/20 text-green-400' :
                            tournament.status === 'Completado' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-muted text-muted-foreground'
                        }`}>
                            {tournament.status}
                        </span>
                        <p className="text-muted-foreground mt-1">
                            {new Date(tournament.start_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    );
}
