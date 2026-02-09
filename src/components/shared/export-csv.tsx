"use client";

import { Download, FileSpreadsheet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSubscription, ProUpgradePrompt } from "@/lib/subscription";
import { useToast } from "@/hooks/use-toast";
import type { Participant, Tournament } from "@/lib/database";
import type { Round } from "@/components/tournaments/bracket";

// =============================================
// CSV Generation Helpers
// =============================================

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================
// Export Functions
// =============================================

export function exportParticipantsList(
  participants: Participant[],
  tournamentName: string
) {
  const headers = [
    "Nombre",
    "Nombre Completo",
    "Email",
    "Estado",
    "Fecha de Registro",
    "Check-in",
    "Género",
  ];

  const rows = participants.map((p) => [
    p.name,
    p.full_name || "",
    p.email,
    p.status,
    p.created_at ? new Date(p.created_at).toLocaleString("es-ES") : "",
    p.checked_in_at ? new Date(p.checked_in_at).toLocaleString("es-ES") : "No",
    p.gender || "",
  ]);

  const csv = generateCsv(headers, rows);
  const safeName = tournamentName.replace(/[^a-zA-Z0-9]/g, "_");
  downloadCsv(csv, `participantes_${safeName}_${new Date().toISOString().slice(0, 10)}`);
}

export function exportResultsList(
  rounds: Round[],
  participants: Participant[],
  tournamentName: string
) {
  const headers = [
    "Ronda",
    "Partida ID",
    "Jugador Superior",
    "Score Superior",
    "Jugador Inferior",
    "Score Inferior",
    "Ganador",
    "Estación",
  ];

  const rows: (string | number | null | undefined)[][] = [];

  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      rows.push([
        round.name,
        match.id,
        match.top.name,
        match.top.score,
        match.bottom.name,
        match.bottom.score,
        match.winner || "",
        match.station?.name || "",
      ]);
    });
  });

  const csv = generateCsv(headers, rows);
  const safeName = tournamentName.replace(/[^a-zA-Z0-9]/g, "_");
  downloadCsv(csv, `resultados_${safeName}_${new Date().toISOString().slice(0, 10)}`);
}

export function exportEmailList(
  participants: Participant[],
  tournamentName: string
) {
  const headers = ["Email", "Nombre", "Estado"];

  const rows = participants
    .filter((p) => p.status === "Aceptado")
    .map((p) => [p.email, p.name, p.status]);

  const csv = generateCsv(headers, rows);
  const safeName = tournamentName.replace(/[^a-zA-Z0-9]/g, "_");
  downloadCsv(csv, `emails_${safeName}_${new Date().toISOString().slice(0, 10)}`);
}

export function exportTournamentSummary(
  tournaments: Tournament[],
  eventName: string
) {
  const headers = [
    "Torneo",
    "Juego",
    "Formato",
    "Participantes",
    "Max. Participantes",
    "Tasa de Llenado (%)",
    "Estado",
    "Fecha de Inicio",
    "Ubicación",
    "Prize Pool",
  ];

  const rows = tournaments.map((t) => [
    t.name,
    t.game,
    t.format,
    t.participants,
    t.max_participants,
    t.max_participants > 0
      ? ((t.participants / t.max_participants) * 100).toFixed(1)
      : "0",
    t.status,
    t.start_date ? new Date(t.start_date).toLocaleDateString("es-ES") : "",
    t.location || "",
    t.prize_pool || "",
  ]);

  const csv = generateCsv(headers, rows);
  const safeName = eventName.replace(/[^a-zA-Z0-9]/g, "_");
  downloadCsv(csv, `resumen_evento_${safeName}_${new Date().toISOString().slice(0, 10)}`);
}

// =============================================
// EXPORT BUTTON COMPONENT
// =============================================

interface ExportButtonProps {
  participants?: Participant[];
  rounds?: Round[];
  tournaments?: Tournament[];
  tournamentName?: string;
  eventName?: string;
  /** Which export options to show */
  options?: ('participants' | 'results' | 'emails' | 'event-summary')[];
}

export function ExportButton({
  participants = [],
  rounds = [],
  tournaments = [],
  tournamentName = "torneo",
  eventName = "evento",
  options = ["participants", "results", "emails"],
}: ExportButtonProps) {
  const { isPro } = useSubscription();
  const { toast } = useToast();

  if (!isPro) {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-50" title="Disponible en Plus">
        <Download className="h-4 w-4 mr-2" />
        Exportar CSV
        <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1">
          <Zap className="h-2.5 w-2.5 mr-0.5" /> Plus
        </Badge>
      </Button>
    );
  }

  const handleExport = (type: string) => {
    try {
      switch (type) {
        case "participants":
          exportParticipantsList(participants, tournamentName);
          break;
        case "results":
          exportResultsList(rounds, participants, tournamentName);
          break;
        case "emails":
          exportEmailList(participants, tournamentName);
          break;
        case "event-summary":
          exportTournamentSummary(tournaments, eventName);
          break;
      }
      toast({
        title: "Exportación exitosa",
        description: "El archivo CSV se ha descargado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo CSV.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.includes("participants") && (
          <DropdownMenuItem onClick={() => handleExport("participants")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Lista de Participantes
          </DropdownMenuItem>
        )}
        {options.includes("results") && rounds.length > 0 && (
          <DropdownMenuItem onClick={() => handleExport("results")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Resultados del Bracket
          </DropdownMenuItem>
        )}
        {options.includes("emails") && (
          <DropdownMenuItem onClick={() => handleExport("emails")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Lista de Emails
          </DropdownMenuItem>
        )}
        {options.includes("event-summary") && (
          <DropdownMenuItem onClick={() => handleExport("event-summary")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Resumen del Evento
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
