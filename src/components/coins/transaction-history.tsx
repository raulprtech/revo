"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getTransactionLabel } from "@/lib/coins";
import type { CoinTransaction } from "@/types/coins";
import { Coins, ArrowUpCircle, ArrowDownCircle, Loader2, ChevronDown } from "lucide-react";

export function TransactionHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 15;

  const fetchTransactions = async (newOffset = 0, append = false) => {
    if (!user?.email) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/coins/transactions?limit=${limit}&offset=${newOffset}`,
        {
          headers: { 'Authorization': `Bearer ${session?.access_token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const txs = data.transactions || [];
        setTransactions(prev => append ? [...prev, ...txs] : txs);
        setHasMore(txs.length === limit);
        setOffset(newOffset + limit);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Coins className="h-10 w-10 mb-3 opacity-50" />
          <p className="text-sm">Sin transacciones aún</p>
          <p className="text-xs">Las monedas que ganes y gastes se mostrarán aquí</p>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const grouped = transactions.reduce<Record<string, CoinTransaction[]>>((acc, tx) => {
    const date = new Date(tx.created_at).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5 text-amber-400" />
          Historial de Transacciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(grouped).map(([date, txs]) => (
          <div key={date}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{date}</p>
            <div className="space-y-2">
              {txs.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {tx.amount > 0 ? (
                      <ArrowUpCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{getTransactionLabel(tx.type)}</p>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Saldo: {tx.balance_after}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {hasMore && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => fetchTransactions(offset, true)}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Cargar más
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
