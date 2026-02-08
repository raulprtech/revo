"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// =============================================
// Types
// =============================================

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE";

type RealtimeEvent = {
  table: string;
  event: PostgresChangeEvent;
  /** The new row (INSERT/UPDATE) or old row (DELETE) */
  record: Record<string, unknown>;
  /** The old row (UPDATE/DELETE only, requires REPLICA IDENTITY FULL) */
  oldRecord?: Record<string, unknown>;
};

type RealtimeCallback = (event: RealtimeEvent) => void;

type UseRealtimeOptions = {
  /** The table(s) to subscribe to */
  tables: Array<{
    table: string;
    /** Filter by column, e.g. "tournament_id=eq.abc-123" */
    filter?: string;
    /** Which events to listen for; default: all */
    events?: PostgresChangeEvent[];
  }>;
  /** Called when any subscribed event fires */
  onEvent: RealtimeCallback;
  /** Whether the subscription is active. Default: true */
  enabled?: boolean;
  /** Channel name hint for debugging */
  channelName?: string;
};

// =============================================
// Hook: useRealtimeSubscription
// =============================================

/**
 * Subscribe to Supabase Realtime Postgres Changes.
 * Automatically cleans up on unmount or when deps change.
 *
 * @example
 * ```tsx
 * useRealtimeSubscription({
 *   tables: [
 *     { table: "tournaments", filter: `id=eq.${id}` },
 *     { table: "participants", filter: `tournament_id=eq.${id}` },
 *   ],
 *   onEvent: (e) => {
 *     console.log(e.table, e.event, e.record);
 *     refreshTournament();
 *   },
 * });
 * ```
 */
export function useRealtimeSubscription({
  tables,
  onEvent,
  enabled = true,
  channelName,
}: UseRealtimeOptions) {
  // Keep callback ref stable to avoid re-subscribing on every render
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  // Serialized deps for the effect
  const tablesKey = JSON.stringify(
    tables.map((t) => `${t.table}:${t.filter ?? "*"}:${(t.events ?? ["*"]).join(",")}`)
  );

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const name =
      channelName ?? `realtime-${tables.map((t) => t.table).join("-")}-${Date.now()}`;

    let channel: RealtimeChannel = supabase.channel(name);

    for (const { table, filter, events } of tables) {
      const listenEvents = events ?? (["INSERT", "UPDATE", "DELETE"] as const);

      for (const event of listenEvents) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channel = (channel as any).on(
          "postgres_changes",
          {
            event,
            schema: "public",
            table,
            ...(filter ? { filter } : {}),
          },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            callbackRef.current({
              table,
              event,
              record: (payload.new as Record<string, unknown>) ?? {},
              oldRecord: (payload.old as Record<string, unknown>) ?? undefined,
            });
          }
        ) as RealtimeChannel;
      }
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, enabled]);
}

// =============================================
// Hook: useTournamentRealtime
// =============================================

/**
 * Subscribe to real-time changes for a specific tournament
 * and its participants. Fires a callback with a descriptive event.
 */
export type TournamentRealtimeEvent =
  | { type: "tournament_updated"; tournamentId: string }
  | { type: "participant_joined"; tournamentId: string; participantName: string }
  | { type: "participant_updated"; tournamentId: string; participantName: string; status: string }
  | { type: "participant_removed"; tournamentId: string; participantName: string }
  | { type: "bracket_updated"; tournamentId: string }
  | { type: "status_changed"; tournamentId: string; oldStatus: string; newStatus: string };

export function useTournamentRealtime(
  tournamentId: string | null,
  onEvent: (event: TournamentRealtimeEvent) => void,
  enabled = true
) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  const handleEvent = useCallback(
    (e: RealtimeEvent) => {
      if (!tournamentId) return;

      if (e.table === "tournaments") {
        // Check if status changed
        if (
          e.event === "UPDATE" &&
          e.oldRecord?.status &&
          e.record.status &&
          e.oldRecord.status !== e.record.status
        ) {
          callbackRef.current({
            type: "status_changed",
            tournamentId,
            oldStatus: e.oldRecord.status as string,
            newStatus: e.record.status as string,
          });
          return;
        }

        // Check if brackets/rounds changed (stored in tournament data)
        if (e.event === "UPDATE") {
          callbackRef.current({
            type: "bracket_updated",
            tournamentId,
          });
          return;
        }

        callbackRef.current({
          type: "tournament_updated",
          tournamentId,
        });
      }

      if (e.table === "participants") {
        const name = (e.record.name as string) || "Un participante";

        if (e.event === "INSERT") {
          callbackRef.current({
            type: "participant_joined",
            tournamentId,
            participantName: name,
          });
        } else if (e.event === "UPDATE") {
          callbackRef.current({
            type: "participant_updated",
            tournamentId,
            participantName: name,
            status: (e.record.status as string) || "desconocido",
          });
        } else if (e.event === "DELETE") {
          const deletedName = (e.oldRecord?.name as string) || "Un participante";
          callbackRef.current({
            type: "participant_removed",
            tournamentId,
            participantName: deletedName,
          });
        }
      }
    },
    [tournamentId]
  );

  useRealtimeSubscription({
    tables: [
      { table: "tournaments", filter: `id=eq.${tournamentId}` },
      { table: "participants", filter: `tournament_id=eq.${tournamentId}` },
    ],
    onEvent: handleEvent,
    enabled: enabled && !!tournamentId,
    channelName: `tournament-${tournamentId}`,
  });
}

// =============================================
// Hook: useTournamentsListRealtime
// =============================================

/**
 * Subscribe to changes across ALL public tournaments.
 * Optimized: only listens for the events that affect the list view.
 */
export function useTournamentsListRealtime(
  onEvent: (event: TournamentRealtimeEvent) => void,
  enabled = true
) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  const handleEvent = useCallback((e: RealtimeEvent) => {
    if (e.table === "tournaments") {
      const id = (e.record.id as string) || "";
      if (e.event === "UPDATE" && e.oldRecord?.status !== e.record.status) {
        callbackRef.current({
          type: "status_changed",
          tournamentId: id,
          oldStatus: (e.oldRecord?.status as string) || "",
          newStatus: (e.record.status as string) || "",
        });
      } else {
        callbackRef.current({
          type: "tournament_updated",
          tournamentId: id,
        });
      }
    }

    if (e.table === "participants") {
      const tid = (e.record.tournament_id as string) || "";
      const name = (e.record.name as string) || "Un participante";

      if (e.event === "INSERT") {
        callbackRef.current({
          type: "participant_joined",
          tournamentId: tid,
          participantName: name,
        });
      }
    }
  }, []);

  useRealtimeSubscription({
    tables: [
      { table: "tournaments", events: ["INSERT", "UPDATE"] },
      { table: "participants", events: ["INSERT"] },
    ],
    onEvent: handleEvent,
    enabled,
    channelName: "tournaments-list",
  });
}
