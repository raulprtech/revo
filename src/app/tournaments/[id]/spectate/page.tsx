"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Gamepad2,
  Loader2,
  ArrowLeft,
  Maximize,
  Minimize,
  Radio,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LiveBracket from "@/components/tournaments/live-bracket";
import StandingsTable from "@/components/tournaments/standings-table";
import { calculateStandings } from "@/components/tournaments/standings-table";
import { generateRounds, type Round, type CosmeticsMap } from "@/components/tournaments/bracket";
import { db, type Tournament } from "@/lib/database";
import { useTournament, useParticipants } from "@/hooks/use-tournaments";
import { useTournamentRealtime, type TournamentRealtimeEvent } from "@/hooks/use-realtime";
import { getDefaultTournamentImage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Video, ShieldCheck } from "lucide-react";

function BrandingSponsors({ tournament, ownerIsPro, isOverlay = false }: { tournament: Tournament; ownerIsPro: boolean, isOverlay?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-4",
      isOverlay && "bg-background/80 backdrop-blur-md p-2 px-4 rounded-xl border"
    )}>
      {!ownerIsPro ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
          <span className="text-[8px] font-black uppercase text-primary/70 tracking-tighter">Powered by</span>
          <span className="text-xs font-black italic tracking-tighter text-primary">DUELS ESPORTS</span>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {tournament.sponsor_logos && tournament.sponsor_logos.filter(s => s.showInSpectator !== false).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase opacity-40 mr-1">Sponsors</span>
              <div className="flex items-center -space-x-2">
                {tournament.sponsor_logos
                  .filter(sponsor => sponsor.showInSpectator !== false)
                  .map((sponsor, idx) => (
                    <div key={idx} className="h-8 w-8 rounded-full border-2 border-background overflow-hidden bg-white/5 shadow-xl transition-transform hover:scale-110 hover:z-10" title={sponsor.name}>
                      {sponsor.logo ? (
                        <img src={sponsor.logo} alt={sponsor.name} className="h-full w-full object-contain p-1" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] font-bold bg-muted">{sponsor.name[0]}</div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
          <div className="h-4 w-[1px] bg-border mx-1" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Verified Pro</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SpectatePage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  
  const [isOverlay, setIsOverlay] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setIsOverlay(searchParams.get("overlay") === "true");
  }, []);

  const { tournament, isLoading: tournamentLoading, refresh: refreshTournament } = useTournament(id);
  const { participants } = useParticipants(id);

  const [rounds, setRounds] = useState<Round[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ownerIsPro, setOwnerIsPro] = useState(false);

  useEffect(() => {
    if (tournament?.owner_email) {
      db.hasProAccess(tournament.owner_email).then(setOwnerIsPro);
    }
  }, [tournament?.owner_email]);

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updatedMatchIds, setUpdatedMatchIds] = useState<Set<number>>(new Set());
  const [spectatorCount] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [cosmeticsMap, setCosmeticsMap] = useState<CosmeticsMap>({});

  // Load bracket data from Supabase (not localStorage — spectators don't have it)
  const loadBracketFromDB = useCallback(async () => {
    if (!id || !tournament) return;

    try {
      const bracketData = await db.getBracketData(id);
      let loadedRounds: Round[] = [];

      if (bracketData && bracketData.rounds && bracketData.rounds.length > 0) {
        loadedRounds = bracketData.rounds;
        setRounds(loadedRounds);
        setLastUpdate(new Date());
      } else if (bracketData?.seededPlayers && bracketData.seededPlayers.length > 0) {
        loadedRounds = generateRounds(
          bracketData.seededPlayers.length,
          bracketData.seededPlayers,
          tournament.format
        );
        setRounds(loadedRounds);
        setLastUpdate(new Date());
      } else {
        setRounds([]);
      }

      // Fetch cosmetics from seededPlayers or rounds
      const emails: string[] = [];
      if (bracketData?.seededPlayers) {
        for (const p of bracketData.seededPlayers) {
          const player = p as { email?: string };
          if (typeof player === 'object' && player.email) emails.push(player.email);
        }
      }
      if (emails.length === 0 && loadedRounds.length > 0) {
        for (const round of loadedRounds) {
          for (const match of round.matches) {
            if (match.top.email) emails.push(match.top.email);
            if (match.bottom.email) emails.push(match.bottom.email);
          }
        }
      }
      const uniqueEmails = [...new Set(emails)];
      if (uniqueEmails.length > 0) {
        fetch('/api/coins/cosmetics-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: uniqueEmails }),
        })
          .then(res => res.json())
          .then(data => setCosmeticsMap(data || {}))
          .catch(() => {});
      }
    } catch (error) {
      console.error("Error loading bracket data:", error);
      setRounds([]);
    }
  }, [id, tournament]);

  // Initial load
  useEffect(() => {
    loadBracketFromDB();
  }, [loadBracketFromDB]);

  // Real-time updates
  useTournamentRealtime(
    id,
    useCallback(
      (event: TournamentRealtimeEvent) => {
        refreshTournament();

        switch (event.type) {
          case "bracket_updated":
          case "status_changed":
            // Reload bracket data from DB
            loadBracketFromDB();
            break;
          case "participant_joined":
          case "participant_removed":
          case "participant_updated":
            // These might affect the participant count shown
            refreshTournament();
            break;
        }
      },
      [refreshTournament, loadBracketFromDB]
    ),
    !tournamentLoading
  );

  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-refresh bracket data every 10 seconds as a fallback
  useEffect(() => {
    if (!tournament || tournament.status !== "En curso") return;
    const interval = setInterval(loadBracketFromDB, 10000);
    return () => clearInterval(interval);
  }, [tournament, loadBracketFromDB]);

  const statusColors: Record<string, string> = {
    Próximo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "En curso": "bg-green-500/20 text-green-400 border-green-500/30",
    Finalizado: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  const formatMapping: Record<string, string> = {
    "single-elimination": "Eliminación Simple",
    "double-elimination": "Doble Eliminación",
    swiss: "Suizo",
  };

  if (tournamentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-lg">
            Cargando modo espectador...
          </p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center space-y-4">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Torneo no encontrado</h2>
            <p className="text-muted-foreground">
              El torneo que buscas no existe o no está disponible.
            </p>
            <Link href="/tournaments">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a torneos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const acceptedCount = participants.filter(
    (p) => p.status === "Aceptado"
  ).length;
  const isLive = tournament.status === "En curso";
  const standings =
    rounds.length > 0 ? calculateStandings(rounds, tournament.format) : [];

  return (
    <div
      className={cn(
        "min-h-screen",
        isOverlay ? "bg-transparent overflow-hidden" : "bg-background",
        isFullscreen && "p-4"
      )}
    >
      {/* Header Bar */}
      {!isOverlay && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back + Tournament info */}
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/tournaments/${id}`}>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>

              <div className="relative h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden">
                {tournament.image && tournament.image.trim() !== '' ? (
                  <Image
                    src={tournament.image}
                    alt={tournament.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${getDefaultTournamentImage(tournament.game)} flex items-center justify-center`}>
                    <Gamepad2 className="h-5 w-5 text-white/80" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate">
                  {tournament.name}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gamepad2 className="h-3.5 w-3.5" />
                  <span className="truncate">{tournament.game}</span>
                </div>
              </div>
            </div>

            {/* Center: Live status */}
            <div className="flex items-center gap-3">
              {isLive && (
                <Badge className="bg-red-600 text-white border-red-600 gap-1.5 animate-pulse">
                  <Radio className="h-3 w-3" />
                  EN VIVO
                </Badge>
              )}
              <Badge
                variant="outline"
                className={statusColors[tournament.status] || ""}
              >
                {tournament.status}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {acceptedCount}/{tournament.max_participants}
              </Badge>
              <Badge variant="outline" className="gap-1 hidden sm:flex">
                <Eye className="h-3 w-3" />
                {spectatorCount} viendo
              </Badge>
            </div>

            {/* Right: Fullscreen + format */}
            <div className="flex items-center gap-4">
              {tournament && (
                <BrandingSponsors tournament={tournament} ownerIsPro={ownerIsPro} />
              )}
              <div className="h-6 w-[1px] bg-border mx-1" />
              <Button
                variant="outline"
                size="sm"
                className="hidden lg:flex gap-1.5 h-8 text-[10px] font-black uppercase"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("overlay", "true");
                  navigator.clipboard.writeText(url.toString());
                  toast({
                    title: "Link de OBS Copiado",
                    description: "Pega esto como 'Browser Source' en tu OBS (Fondo transparente).",
                  });
                }}
              >
                <Video className="h-3 w-3" />
                OBS Overlay
              </Button>
              <Badge variant="secondary" className="hidden md:flex">
                {formatMapping[tournament.format] || tournament.format}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn("container mx-auto px-4 py-6", isOverlay && "max-w-none p-0")}>
        {isOverlay && tournament && (
          <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right duration-700">
            <BrandingSponsors tournament={tournament} ownerIsPro={ownerIsPro} isOverlay />
          </div>
        )}
        {!isOverlay && lastUpdate && (
          <p className="text-xs text-muted-foreground text-right mb-2">
            Última actualización:{" "}
            {lastUpdate.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        )}

        {isOverlay ? (
          <div className="scale-90 transform-gpu origin-top">
             <LiveBracket
              rounds={rounds}
              format={tournament.format}
              gameMode={tournament.game_mode}
              updatedMatchIds={updatedMatchIds}
              cosmeticsMap={cosmeticsMap}
            />
          </div>
        ) : (
          <Tabs defaultValue="bracket" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="bracket" className="gap-1.5">
              <Trophy className="h-4 w-4" />
              Bracket
            </TabsTrigger>
            {standings.length > 0 && (
              <TabsTrigger value="standings" className="gap-1.5">
                <Users className="h-4 w-4" />
                Clasificación
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="bracket">
            <LiveBracket
              rounds={rounds}
              format={tournament.format}
              gameMode={tournament.game_mode}
              updatedMatchIds={updatedMatchIds}
              cosmeticsMap={cosmeticsMap}
            />
          </TabsContent>

          {standings.length > 0 && (
            <TabsContent value="standings">
              <StandingsTable
                rounds={rounds}
                tournamentId={id}
                format={tournament.format}
              />
            </TabsContent>
          )}
        </Tabs>
        )}
      </div>

      {/* Footer info bar */}
      {!isOverlay && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t py-2 px-4">
        <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Modo espectador • Solo lectura
          </span>
          <span>
            {isLive
              ? "Los resultados se actualizan en tiempo real"
              : tournament.status === "Finalizado"
              ? "Torneo finalizado"
              : "El torneo aún no ha comenzado"}
          </span>
        </div>
      </div>
      )}
    </div>
  );
}
