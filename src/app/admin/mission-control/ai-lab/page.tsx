"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wand2, 
  MessageSquare, 
  Download, 
  RefreshCcw, 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle2, 
  XCircle,
  Database,
  Search,
  Users,
  Terminal,
  BrainCircuit,
  FileJson
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AILabPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("architect");
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchConversations();
  }, [activeTab]);

  const fetchConversations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('feature_name', activeTab)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setConversations(data || []);
      if (data && data.length > 0 && !selectedConv) {
        setSelectedConv(data[0]);
      }
    }
    setIsLoading(false);
  };

  const markUseful = async (id: string, isUseful: boolean) => {
    const { error } = await supabase
      .from('ai_conversations')
      .update({ 
        is_useful: isUseful, 
        labeled_at: new Date().toISOString(),
        labeled_by: (await supabase.auth.getUser()).data.user?.email 
      })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar la etiqueta." });
    } else {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, is_useful: isUseful } : c));
      if (selectedConv?.id === id) setSelectedConv({ ...selectedConv, is_useful: isUseful });
      toast({ title: "Etiquetado", description: "Cambio guardado para refinamiento." });
    }
  };

  const exportForFineTuning = () => {
    const dataset = conversations
      .filter(c => c.is_useful === true)
      .map(c => ({
        messages: c.messages,
        expected_json: c.extracted_data
      }));

    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duels-training-data-${activeTab}-${format(new Date(), 'yyyyMMdd')}.json`;
    a.click();
    toast({ title: "Checkpoint", description: "Data exportada correctamente." });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">AI Refinement Lab</h1>
          </div>
          <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest">
            Entrenamiento, etiquetado y supervisión de modelos Gemini 1.5 Flash
          </p>
        </div>

        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchConversations} disabled={isLoading} className="text-[10px] font-bold uppercase">
                <RefreshCcw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} /> Refrescar
            </Button>
            <Button size="sm" onClick={exportForFineTuning} className="bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold uppercase">
                <Download className="h-3 w-3 mr-1" /> Crear Checkpoint
            </Button>
        </div>
      </div>

      <Tabs defaultValue="architect" onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/10 p-1 mb-4">
          <TabsTrigger value="architect" className="gap-2 text-[10px] font-black uppercase">
            <Wand2 className="h-3.5 w-3.5" /> Architect
          </TabsTrigger>
          <TabsTrigger value="caster" className="gap-2 text-[10px] font-black uppercase">
            <Terminal className="h-3.5 w-3.5" /> Caster
          </TabsTrigger>
          <TabsTrigger value="arbiter" className="gap-2 text-[10px] font-black uppercase">
            <Database className="h-3.5 w-3.5" /> Arbiter
          </TabsTrigger>
          <TabsTrigger value="retention" className="gap-2 text-[10px] font-black uppercase">
            <Users className="h-3.5 w-3.5" /> Retention
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
          {/* List Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input 
                    placeholder="Buscar interacción..." 
                    className="w-full bg-muted/20 border-border rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 ring-indigo-500 outline-none"
                />
            </div>
            
            <ScrollArea className="flex-1 bg-background border border-border rounded-xl">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="h-20 rounded-lg bg-muted/20 animate-pulse" />
                  ))
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-20" />
                    <p className="text-xs text-muted-foreground italic uppercase">No hay interacciones registradas</p>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <div 
                      key={c.id} 
                      onClick={() => setSelectedConv(c)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all border border-transparent",
                        selectedConv?.id === c.id ? "bg-indigo-500/10 border-indigo-500/30" : "hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black uppercase opacity-60 flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" /> {c.user_email.split('@')[0]}
                        </span>
                        <span className="text-[9px] opacity-40">
                          {format(new Date(c.created_at), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium line-clamp-1 opacity-80 mb-1">
                        {c.messages?.[c.messages.length - 2]?.content || "Interaction"}
                      </p>
                      <div className="flex items-center gap-2">
                        {c.is_useful === true && <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] h-4">VALIDADO</Badge>}
                        {c.is_useful === false && <Badge className="bg-red-500/20 text-red-500 border-none text-[8px] h-4">DESCARTADO</Badge>}
                        <Badge variant="outline" className="text-[8px] h-4 opacity-50">{c.model_name}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Details View */}
          <Card className="lg:col-span-8 flex flex-col bg-background/50 backdrop-blur-sm border-border">
            {selectedConv ? (
              <>
                <CardHeader className="p-4 border-b border-border bg-muted/5 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Detalle de Interacción
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold font-mono">
                      ID: {selectedConv.id}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={selectedConv.is_useful === true ? "default" : "outline"}
                      className={cn("text-[10px] font-bold h-7", selectedConv.is_useful === true && "bg-emerald-600")}
                      onClick={() => markUseful(selectedConv.id, true)}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1" /> Útil
                    </Button>
                    <Button 
                      size="sm" 
                      variant={selectedConv.is_useful === false ? "destructive" : "outline"}
                      className="text-[10px] font-bold h-7"
                      onClick={() => markUseful(selectedConv.id, false)}
                    >
                      <ThumbsDown className="h-3 w-3 mr-1" /> Error
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 h-full divide-x divide-border">
                    {/* Chat History */}
                    <div className="flex flex-col">
                      <div className="p-2 bg-muted/10 border-b border-border text-[9px] font-black uppercase flex items-center gap-1 opacity-60">
                        <MessageSquare className="h-3 w-3" /> Chat Log
                      </div>
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {selectedConv.messages?.map((m: any, i: number) => (
                            <div key={i} className={cn(
                              "flex flex-col gap-1",
                              m.role === 'user' ? "items-end" : "items-start"
                            )}>
                              <span className="text-[8px] font-bold uppercase opacity-40">
                                {m.role === 'user' ? 'Human' : 'Gemini'}
                              </span>
                              <div className={cn(
                                "p-2.5 rounded-xl text-[11px] max-w-[90%]",
                                m.role === 'user' ? "bg-indigo-500 text-white" : "bg-muted border border-border"
                              )}>
                                {m.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Extracted Data / RAW */}
                    <div className="flex flex-col">
                      <div className="p-2 bg-muted/10 border-b border-border text-[9px] font-black uppercase flex items-center gap-1 opacity-60">
                        <FileJson className="h-3 w-3" /> Extracted Context
                      </div>
                      <div className="flex-1 p-4 bg-muted/5 font-mono text-[10px] overflow-auto">
                        <pre className="text-emerald-500 dark:text-emerald-400">
                          {JSON.stringify(selectedConv.extracted_data, null, 2)}
                        </pre>
                        
                        <div className="mt-8 border-t border-border/50 pt-4">
                           <div className="text-[9px] font-black uppercase mb-2 opacity-60">Metadata</div>
                           <pre className="text-amber-500 opacity-80">
                            {JSON.stringify(selectedConv.metadata, null, 2)}
                           </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="h-full flex items-center justify-center italic text-muted-foreground text-xs uppercase opacity-40">
                Selecciona una conversación para analizar
              </div>
            )}
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
