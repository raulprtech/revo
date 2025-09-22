import { createClient } from '@/lib/supabase/client';

export type Tournament = {
  id: string;
  name: string;
  description?: string;
  game: string;
  participants: number;
  max_participants: number;
  start_date: string;
  start_time?: string;
  format: 'single-elimination' | 'double-elimination' | 'swiss';
  status: string;
  owner_email: string;
  image?: string;
  data_ai_hint?: string;
  registration_type: 'public' | 'private';
  prize_pool?: string;
  location?: string;
  invited_users?: string[];
  created_at?: string;
  updated_at?: string;
};

export type Participant = {
  id?: string;
  tournament_id: string;
  email: string;
  name: string;
  avatar?: string;
  status: 'Aceptado' | 'Pendiente' | 'Rechazado';
  created_at?: string;
};

export type CreateTournamentData = Omit<Tournament, 'id' | 'participants' | 'created_at' | 'updated_at'>;
export type UpdateTournamentData = Partial<CreateTournamentData>;

export type TournamentFetchResult = {
  tournament: Tournament | null;
  status: number;
  error?: Record<string, unknown>;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

class DatabaseService {
  private supabase = createClient();

  // Tournament operations
  async createTournament(tournament: CreateTournamentData): Promise<Tournament> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .insert({
        ...tournament,
        start_date: tournament.start_date,
        max_participants: tournament.max_participants,
        invited_users: tournament.invited_users || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tournament:', error);
      throw new Error('Failed to create tournament');
    }

    return this.mapTournamentFromDB(data);
  }

  async getTournaments(): Promise<Tournament[]> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    // Handle empty error objects from Supabase
    if (error) {
      if (typeof error === 'object' && Object.keys(error).length === 0) {
        console.log('Empty error object received in getTournaments, continuing...');
      } else if (error.message) {
        console.error('Error fetching tournaments:', error);
        return [];
      }
    }

    if (!data) {
      console.log('No tournaments data returned from Supabase.');
      return [];
    }

    return data.map(this.mapTournamentFromDB);
  }

  async getPublicTournaments(): Promise<Tournament[]> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables are not configured.');
      return [];
    }

    try {
      const url = new URL('/rest/v1/tournaments', SUPABASE_URL);
      url.searchParams.set('select', '*');
      url.searchParams.set('registration_type', 'eq.public');
      url.searchParams.set('order', 'created_at.desc');

      const response = await this.fetchSupabase(url);

      if (!response.ok) {
        const errorPayload = await this.parseSupabaseError(response);
        console.error('Error fetching public tournaments via REST:', {
          status: response.status,
          statusText: response.statusText,
          ...errorPayload,
        });
        return [];
      }

      const data = (await response.json()) as unknown;

      if (!Array.isArray(data)) {
        console.error('Unexpected tournaments payload received from Supabase:', data);
        return [];
      }

      return data.map(this.mapTournamentFromDB);
    } catch (err) {
      console.error('Unexpected error in getPublicTournaments:', this.serializeError(err));
      return [];
    }
  }

  async getTournament(id: string): Promise<TournamentFetchResult> {
    try {
      const { data, error, status } = await this.supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        const normalizedError = this.normalizeSupabaseError(error);
        if (normalizedError.isEmptyError) {
          console.warn('Empty Supabase error received when fetching tournament.');
        } else {
          console.error('Error fetching tournament:', normalizedError);
        }
        return {
          tournament: null,
          status: status ?? 400,
          error: normalizedError.payload,
        };
      }

      if (!data) {
        return { tournament: null, status: 404 };
      }

      return { tournament: this.mapTournamentFromDB(data), status: 200 };
    } catch (err) {
      const serialized = this.serializeError(err);
      console.error('Unexpected error in getTournament:', serialized);
      return { tournament: null, status: 0, error: serialized };
    }
  }

  async updateTournament(id: string, updates: UpdateTournamentData): Promise<Tournament> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tournament:', error);
      throw new Error('Failed to update tournament');
    }

    return this.mapTournamentFromDB(data);
  }

  async deleteTournament(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tournament:', error);
      throw new Error('Failed to delete tournament');
    }
  }

  // Participant operations
  async addParticipant(participant: Omit<Participant, 'id' | 'created_at'>): Promise<Participant> {
    const { data, error } = await this.supabase
      .from('participants')
      .insert(participant)
      .select()
      .single();

    if (error) {
      console.error('Error adding participant:', error);
      throw new Error('Failed to add participant');
    }

    // Update tournament participant count
    await this.updateParticipantCount(participant.tournament_id);

    return this.mapParticipantFromDB(data);
  }

  async getParticipants(tournamentId: string): Promise<Participant[]> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    // Handle empty error objects from Supabase
    if (error) {
      if (typeof error === 'object' && Object.keys(error).length === 0) {
        console.log('Empty error object received in getParticipants, continuing...');
      } else if (error.message) {
        console.error('Error fetching participants:', error);
        return [];
      }
    }

    if (!data) {
      console.log('No participants data returned from Supabase.');
      return [];
    }

    return data.map(this.mapParticipantFromDB);
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant> {
    const { data, error } = await this.supabase
      .from('participants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating participant:', error);
      throw new Error('Failed to update participant');
    }

    // Update tournament participant count
    await this.updateParticipantCount(data.tournament_id);

    return this.mapParticipantFromDB(data);
  }

  async removeParticipant(id: string): Promise<void> {
    // Get tournament ID before deleting
    const { data: participant } = await this.supabase
      .from('participants')
      .select('tournament_id')
      .eq('id', id)
      .single();

    const { error } = await this.supabase
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing participant:', error);
      throw new Error('Failed to remove participant');
    }

    // Update tournament participant count
    if (participant) {
      await this.updateParticipantCount(participant.tournament_id);
    }
  }

  async isUserParticipating(tournamentId: string, userEmail: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('email', userEmail)
      .single();

    return !!data && !error;
  }

  // Helper method to update participant count
  private async updateParticipantCount(tournamentId: string): Promise<void> {
    const { data: participants } = await this.supabase
      .from('participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .in('status', ['Aceptado', 'Pendiente']); // Count both accepted and pending

    const count = participants?.length || 0;

    await this.supabase
      .from('tournaments')
      .update({ participants: count })
      .eq('id', tournamentId);
  }

  // Mapping functions to convert between DB format and app format
  private mapTournamentFromDB(dbTournament: any): Tournament {
    return {
      id: dbTournament.id,
      name: dbTournament.name,
      description: dbTournament.description,
      game: dbTournament.game,
      participants: dbTournament.participants || 0,
      max_participants: dbTournament.max_participants,
      start_date: dbTournament.start_date,
      start_time: dbTournament.start_time,
      format: dbTournament.format,
      status: dbTournament.status,
      owner_email: dbTournament.owner_email,
      image: dbTournament.image,
      data_ai_hint: dbTournament.data_ai_hint,
      registration_type: dbTournament.registration_type,
      prize_pool: dbTournament.prize_pool,
      location: dbTournament.location,
      invited_users: dbTournament.invited_users || [],
      created_at: dbTournament.created_at,
      updated_at: dbTournament.updated_at,
    };
  }

  private mapParticipantFromDB(dbParticipant: any): Participant {
    return {
      id: dbParticipant.id,
      tournament_id: dbParticipant.tournament_id,
      email: dbParticipant.email,
      name: dbParticipant.name,
      avatar: dbParticipant.avatar,
      status: dbParticipant.status,
      created_at: dbParticipant.created_at,
    };
  }

  private async fetchSupabase(url: URL, accessToken?: string, init?: RequestInit): Promise<Response> {
    const headers = this.mergeHeaders(accessToken, init?.headers);

    return fetch(url.toString(), {
      ...init,
      headers,
      cache: init?.cache ?? 'no-store',
    });
  }

  private mergeHeaders(accessToken?: string, extra?: HeadersInit): HeadersInit {
    if (!SUPABASE_ANON_KEY) {
      throw new Error('Supabase anon key is not configured.');
    }

    const base: Record<string, string> = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    if (!extra) {
      return base;
    }

    if (extra instanceof Headers) {
      extra.forEach((value, key) => {
        base[key] = value;
      });
      return base;
    }

    if (Array.isArray(extra)) {
      for (const [key, value] of extra) {
        base[key] = value;
      }
      return base;
    }

    return { ...base, ...(extra as Record<string, string>) };
  }

  private async parseSupabaseError(response: Response): Promise<Record<string, unknown>> {
    try {
      const payload = await response.json();
      if (payload && typeof payload === 'object') {
        return payload as Record<string, unknown>;
      }
      return { message: payload };
    } catch {
      try {
        const fallback = await response.text();
        return { message: fallback };
      } catch {
        return { message: 'Unknown error' };
      }
    }
  }

  private normalizeSupabaseError(error: unknown): { payload: Record<string, unknown>; isEmptyError: boolean } {
    if (!error || typeof error !== 'object') {
      return { payload: { message: String(error) }, isEmptyError: false };
    }

    const raw = error as Record<string, unknown>;
    const isEmptyError = Object.keys(raw).length === 0;

    if (isEmptyError) {
      return {
        payload: {
          message: 'Supabase returned an empty error object.',
        },
        isEmptyError: true,
      };
    }

    const payload: Record<string, unknown> = {};
    if (raw.code) payload.code = raw.code;
    if (raw.message) payload.message = raw.message;
    if (raw.details) payload.details = raw.details;
    if (raw.hint) payload.hint = raw.hint;
    if (raw.status) payload.status = raw.status;

    return { payload, isEmptyError: false };
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        ...(typeof error.cause !== 'undefined' ? { cause: error.cause } : {}),
      };
    }

    if (error && typeof error === 'object') {
      try {
        const plain: Record<string, unknown> = {};
        for (const key of Object.getOwnPropertyNames(error)) {
          plain[key] = (error as Record<string, unknown>)[key];
        }
        return plain;
      } catch {
        return { message: 'Unable to serialize error object' };
      }
    }

    return { message: String(error) };
  }
}

export const db = new DatabaseService();
