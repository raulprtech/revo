import { createClient } from '@/lib/supabase/client';

// =============================================
// TYPES
// =============================================

export type Sponsor = {
  name: string;
  logo: string;
  url?: string;
};

// Badge/Medal types for tournaments and events
export type BadgeType = 
  | 'champion'      // 1st place
  | 'runner-up'     // 2nd place  
  | 'third-place'   // 3rd place
  | 'top-4'         // Top 4
  | 'top-8'         // Top 8
  | 'top-16'        // Top 16
  | 'participant'   // Participated
  | 'mvp'           // Most Valuable Player
  | 'custom';       // Custom badge

export type Badge = {
  id: string;
  type: BadgeType;
  name: string;           // 'Campeón', 'Subcampeón', 'Participante', etc.
  description?: string;   // 'Ganador del torneo X'
  icon: string;           // Emoji or icon name: '🥇', '🥈', 'trophy', etc.
  color: string;          // Hex color for the badge: '#FFD700', '#C0C0C0', etc.
  image?: string;         // Optional custom image URL
  position?: string;      // Position achieved: '1', '2', '3', 'top-8', etc.
  isCustom?: boolean;     // If true, uses custom image/design
};

export type BadgeTemplate = {
  id: string;
  badge: Badge;
  awardTo: 'position' | 'all-participants' | 'custom'; // Who receives this badge
  position?: string;      // If awardTo is 'position', which position: '1', '2', '3', etc.
  customEmails?: string[]; // If awardTo is 'custom', list of emails
};

export type AwardedBadge = {
  id: string;
  badge: Badge;
  tournament_id?: string;
  tournament_name?: string;
  event_id?: string;
  event_name?: string;
  game?: string;
  awarded_at: string;
  position?: string;
};

export type Event = {
  id: string;
  name: string;
  description?: string;
  slug: string;
  banner_image?: string;
  logo_image?: string;
  primary_color: string;
  secondary_color: string;
  start_date: string;
  end_date: string;
  location?: string;
  organizer_name?: string;
  organizer_logo?: string;
  owner_email: string;
  organizers?: string[]; // Array of co-organizer emails
  status: 'Próximo' | 'En curso' | 'Finalizado';
  is_public: boolean;
  sponsors: Sponsor[];
  badges?: BadgeTemplate[]; // Badges to award to participants
  created_at?: string;
  updated_at?: string;
  // Computed fields (not in DB)
  tournaments_count?: number;
};

export type CreateEventData = Omit<Event, 'id' | 'created_at' | 'updated_at' | 'tournaments_count'>;
export type UpdateEventData = Partial<CreateEventData>;

export type Prize = {
  position: string; // '1', '2', '3', '4', 'top8', 'top16', etc.
  label: string; // '1er Lugar', '2do Lugar', 'Top 8', etc.
  reward: string; // '$500', 'Medalla de Oro', 'Pase VIP', etc.
  type?: 'cash' | 'item' | 'other';
};

export type GameStation = {
  id: string;
  name: string; // 'Consola 1', 'PC Gaming 2', 'Mesa 3', etc.
  type: 'console' | 'pc' | 'arcade' | 'table' | 'other';
  description?: string; // 'PS5 con monitor LG', 'PC RTX 4080', etc.
  location?: string; // 'Área A', 'Zona VIP', 'Sala 2'
  isAvailable: boolean;
  currentMatchId?: number | null;
};

export type MatchStationAssignment = {
  matchId: number;
  stationId: string;
  roundName: string;
  assignedAt: string;
  status: 'pending' | 'in-progress' | 'completed';
};

export type Tournament = {
  id: string;
  event_id?: string | null;
  name: string;
  description?: string;
  game: string;
  game_mode?: string;
  participants: number;
  max_participants: number;
  start_date: string;
  start_time?: string;
  format: 'single-elimination' | 'double-elimination' | 'swiss';
  status: string;
  owner_email: string;
  organizers?: string[]; // Array of co-organizer emails
  image?: string;
  data_ai_hint?: string;
  registration_type: 'public' | 'private';
  prize_pool?: string;
  prizes?: Prize[];
  badges?: BadgeTemplate[]; // Badges to award to participants
  location?: string;
  invited_users?: string[];
  // Gaming stations for in-person tournaments
  stations?: GameStation[];
  station_assignments?: MatchStationAssignment[];
  auto_assign_stations?: boolean;
  created_at?: string;
  updated_at?: string;
  // Computed fields (not in DB)
  event?: Event;
};

export type Participant = {
  id?: string;
  tournament_id: string;
  email: string;
  name: string;
  full_name?: string; // Complete name (first_name + last_name) for organizer verification
  birth_date?: string; // Birth date for age calculation
  gender?: string; // Gender of the participant
  avatar?: string;
  status: 'Aceptado' | 'Pendiente' | 'Rechazado';
  checked_in_at?: string | null;
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
  private get supabase() {
    return createClient();
  }

  // Tournament operations
  async createTournament(tournament: CreateTournamentData): Promise<Tournament> {
    // Log the data being sent for debugging
    console.log('Creating tournament with data:', JSON.stringify(tournament, null, 2));
    
    // Build insert object with only the fields that exist in the database
    // Note: 'organizers' column may not exist in older schemas
    const insertData: Record<string, unknown> = {
      name: tournament.name,
      description: tournament.description || null,
      game: tournament.game,
      max_participants: tournament.max_participants,
      start_date: tournament.start_date,
      format: tournament.format,
      status: tournament.status || 'Próximo',
      owner_email: tournament.owner_email,
      registration_type: tournament.registration_type,
    };

    // Add optional fields only if they have values
    if (tournament.game_mode) insertData.game_mode = tournament.game_mode;
    if (tournament.start_time) insertData.start_time = tournament.start_time;
    if (tournament.image) insertData.image = tournament.image;
    if (tournament.data_ai_hint) insertData.data_ai_hint = tournament.data_ai_hint;
    if (tournament.prize_pool) insertData.prize_pool = tournament.prize_pool;
    if (tournament.prizes && tournament.prizes.length > 0) insertData.prizes = tournament.prizes;
    if (tournament.location) insertData.location = tournament.location;
    if (tournament.invited_users) insertData.invited_users = tournament.invited_users;
    if (tournament.event_id) insertData.event_id = tournament.event_id;
    // Gaming stations for in-person tournaments
    if (tournament.stations && tournament.stations.length > 0) insertData.stations = tournament.stations;
    if (tournament.auto_assign_stations !== undefined) insertData.auto_assign_stations = tournament.auto_assign_stations;
    // Note: 'organizers' is intentionally not included - add column to DB first if needed

    const { data, error } = await this.supabase
      .from('tournaments')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating tournament:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to create tournament: ${error.message || 'Unknown error'}`);
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

    return data.map((t) => this.mapTournamentFromDB(t));
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

      return data.map((t) => this.mapTournamentFromDB(t));
    } catch (err) {
      console.error('Unexpected error in getPublicTournaments:', this.serializeError(err));
      return [];
    }
  }

  // Get tournaments owned by a specific user
  async getTournamentsByOwner(ownerEmail: string): Promise<Tournament[]> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*')
      .eq('owner_email', ownerEmail)
      .order('created_at', { ascending: false });

    if (error) {
      if (typeof error === 'object' && Object.keys(error).length === 0) {
        console.log('Empty error object received in getTournamentsByOwner, continuing...');
      } else if (error.message) {
        console.error('Error fetching tournaments by owner:', error);
        return [];
      }
    }

    if (!data) {
      return [];
    }

    return data.map((t) => this.mapTournamentFromDB(t));
  }

  // Get tournaments where user is participating
  async getTournamentsWhereParticipating(userEmail: string): Promise<Tournament[]> {
    // First get all tournament IDs where user is a participant
    const { data: participations, error: partError } = await this.supabase
      .from('participants')
      .select('tournament_id')
      .eq('email', userEmail)
      .in('status', ['Aceptado', 'Pendiente']);

    if (partError || !participations || participations.length === 0) {
      return [];
    }

    const tournamentIds = participations.map(p => p.tournament_id);

    // Then fetch those tournaments
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*')
      .in('id', tournamentIds)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching participating tournaments:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((t) => this.mapTournamentFromDB(t));
  }

  // Get all tournaments accessible to user (owned + participating + public)
  async getUserAccessibleTournaments(userEmail: string): Promise<{
    owned: Tournament[];
    participating: Tournament[];
  }> {
    const [owned, participating] = await Promise.all([
      this.getTournamentsByOwner(userEmail),
      this.getTournamentsWhereParticipating(userEmail),
    ]);

    // Filter out owned tournaments from participating list to avoid duplicates
    const ownedIds = new Set(owned.map(t => t.id));
    const participatingFiltered = participating.filter(t => !ownedIds.has(t.id));

    return {
      owned,
      participating: participatingFiltered,
    };
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
    // Filter out undefined values to avoid Supabase errors
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    console.log('Updating tournament:', id, 'with data:', cleanUpdates);

    const { data, error } = await this.supabase
      .from('tournaments')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tournament:', error, 'Code:', error.code, 'Message:', error.message, 'Details:', error.details);
      throw new Error(error.message || 'Failed to update tournament');
    }

    if (!data) {
      throw new Error('No data returned after update - you may not have permission to update this tournament');
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
    console.log('Adding participant with data:', JSON.stringify(participant, null, 2));
    
    const { data, error } = await this.supabase
      .from('participants')
      .insert(participant)
      .select()
      .single();

    if (error) {
      console.error('Error adding participant:', error);
      throw new Error('Failed to add participant');
    }

    console.log('Participant added, received data:', JSON.stringify(data, null, 2));

    // Update tournament participant count
    await this.updateParticipantCount(participant.tournament_id);

    return this.mapParticipantFromDB(data);
  }

  async getParticipants(tournamentId: string): Promise<Participant[]> {
    // First get participants
    const { data: participantsData, error: participantsError } = await this.supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    // Handle empty error objects from Supabase
    if (participantsError) {
      if (typeof participantsError === 'object' && Object.keys(participantsError).length === 0) {
        console.log('Empty error object received in getParticipants, continuing...');
      } else if (participantsError.message) {
        console.error('Error fetching participants:', participantsError);
        return [];
      }
    }

    if (!participantsData || participantsData.length === 0) {
      console.log('No participants data returned from Supabase.');
      return [];
    }

    // Get emails to fetch profiles
    const emails = participantsData.map(p => p.email);
    
    // Fetch profiles for these participants
    const { data: profilesData } = await this.supabase
      .from('profiles')
      .select('email, first_name, last_name, birth_date, gender')
      .in('email', emails);

    // Create a map of email -> profile for quick lookup
    const profilesMap = new Map<string, { first_name?: string; last_name?: string; birth_date?: string; gender?: string }>();
    if (profilesData) {
      for (const profile of profilesData) {
        profilesMap.set(profile.email, profile);
      }
    }

    // Map participants with enriched profile data
    return participantsData.map((p) => {
      const profile = profilesMap.get(p.email);
      const enrichedParticipant = {
        ...p,
        // Use profile data if available, otherwise fall back to participant data
        full_name: profile?.first_name || profile?.last_name 
          ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
          : p.full_name,
        birth_date: profile?.birth_date || p.birth_date,
        gender: profile?.gender || p.gender,
      };
      return this.mapParticipantFromDB(enrichedParticipant);
    });
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant> {
    // First verify we have an authenticated session
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) {
      console.error('No authenticated session for update participant');
      throw new Error('Debes iniciar sesión para realizar esta acción');
    }

    const { data, error, status, statusText } = await this.supabase
      .from('participants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating participant:', { error, status, statusText, id, updates });
      throw new Error(error?.message || 'Failed to update participant');
    }

    // Update tournament participant count
    await this.updateParticipantCount(data.tournament_id);

    return this.mapParticipantFromDB(data);
  }

  async checkInParticipant(id: string): Promise<Participant> {
    // First verify we have an authenticated session
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) {
      console.error('No authenticated session for check-in');
      throw new Error('Debes iniciar sesión para realizar esta acción');
    }

    const { data, error, status, statusText } = await this.supabase
      .from('participants')
      .update({ checked_in_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error checking in participant:', { error, status, statusText, id });
      throw new Error(error?.message || 'Failed to check in participant');
    }

    return this.mapParticipantFromDB(data);
  }

  async undoCheckIn(id: string): Promise<Participant> {
    // First verify we have an authenticated session
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) {
      console.error('No authenticated session for undo check-in');
      throw new Error('Debes iniciar sesión para realizar esta acción');
    }

    const { data, error, status, statusText } = await this.supabase
      .from('participants')
      .update({ checked_in_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error undoing check-in:', { error, status, statusText, id });
      throw new Error('Failed to undo check-in');
    }

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

  // =============================================
  // EVENT OPERATIONS
  // =============================================

  async createEvent(event: CreateEventData): Promise<Event> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) {
      throw new Error('Debes iniciar sesión para crear un evento');
    }

    const { data, error } = await this.supabase
      .from('events')
      .insert({
        ...event,
        owner_email: session.user.email,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw new Error(error.message || 'Failed to create event');
    }

    return this.mapEventFromDB(data);
  }

  async getEvents(): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, tournaments:tournaments(count)')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return (data || []).map((e: any) => ({
      ...this.mapEventFromDB(e),
      tournaments_count: e.tournaments?.[0]?.count || 0,
    }));
  }

  async getPublicEvents(): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, tournaments:tournaments(count)')
      .eq('is_public', true)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching public events:', error);
      return [];
    }

    return (data || []).map((e: any) => ({
      ...this.mapEventFromDB(e),
      tournaments_count: e.tournaments?.[0]?.count || 0,
    }));
  }

  async getEventBySlug(slug: string): Promise<Event | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, tournaments:tournaments(count)')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      console.error('Error fetching event by slug:', error);
      return null;
    }

    return {
      ...this.mapEventFromDB(data),
      tournaments_count: data.tournaments?.[0]?.count || 0,
    };
  }

  async getEventById(id: string): Promise<Event | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, tournaments:tournaments(count)')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching event by id:', error);
      return null;
    }

    return {
      ...this.mapEventFromDB(data),
      tournaments_count: data.tournaments?.[0]?.count || 0,
    };
  }

  async updateEvent(id: string, updates: UpdateEventData): Promise<Event> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) {
      throw new Error('Debes iniciar sesión para actualizar un evento');
    }

    const { data, error } = await this.supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating event:', error);
      throw new Error(error?.message || 'Failed to update event');
    }

    return this.mapEventFromDB(data);
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event');
    }
  }

  async getEventTournaments(eventId: string): Promise<Tournament[]> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*')
      .eq('event_id', eventId)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching event tournaments:', error);
      return [];
    }

    return (data || []).map((t) => this.mapTournamentFromDB(t));
  }

  async assignTournamentToEvent(tournamentId: string, eventId: string | null): Promise<Tournament> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) {
      throw new Error('Debes iniciar sesión para asignar un torneo a un evento');
    }

    const { data, error } = await this.supabase
      .from('tournaments')
      .update({ event_id: eventId })
      .eq('id', tournamentId)
      .select()
      .single();

    if (error || !data) {
      console.error('Error assigning tournament to event:', error);
      throw new Error(error?.message || 'Failed to assign tournament to event');
    }

    return this.mapTournamentFromDB(data);
  }

  async getUserEvents(userEmail: string): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, tournaments:tournaments(count)')
      .eq('owner_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user events:', error);
      return [];
    }

    return (data || []).map((e: any) => ({
      ...this.mapEventFromDB(e),
      tournaments_count: e.tournaments?.[0]?.count || 0,
    }));
  }

  // Mapping functions to convert between DB format and app format
  private mapTournamentFromDB(dbTournament: any): Tournament {
    return {
      id: dbTournament.id,
      event_id: dbTournament.event_id,
      name: dbTournament.name,
      description: dbTournament.description,
      game: dbTournament.game,
      game_mode: dbTournament.game_mode,
      participants: dbTournament.participants || 0,
      max_participants: dbTournament.max_participants,
      start_date: dbTournament.start_date,
      start_time: dbTournament.start_time,
      format: dbTournament.format,
      status: dbTournament.status,
      owner_email: dbTournament.owner_email,
      organizers: dbTournament.organizers || [],
      image: dbTournament.image,
      data_ai_hint: dbTournament.data_ai_hint,
      registration_type: dbTournament.registration_type,
      prize_pool: dbTournament.prize_pool,
      prizes: dbTournament.prizes || [],
      location: dbTournament.location,
      invited_users: dbTournament.invited_users || [],
      created_at: dbTournament.created_at,
      updated_at: dbTournament.updated_at,
    };
  }

  private mapEventFromDB(dbEvent: any): Event {
    return {
      id: dbEvent.id,
      name: dbEvent.name,
      description: dbEvent.description,
      slug: dbEvent.slug,
      banner_image: dbEvent.banner_image,
      logo_image: dbEvent.logo_image,
      primary_color: dbEvent.primary_color || '#6366f1',
      secondary_color: dbEvent.secondary_color || '#8b5cf6',
      start_date: dbEvent.start_date,
      end_date: dbEvent.end_date,
      location: dbEvent.location,
      organizer_name: dbEvent.organizer_name,
      organizer_logo: dbEvent.organizer_logo,
      owner_email: dbEvent.owner_email,
      organizers: dbEvent.organizers || [],
      status: dbEvent.status,
      is_public: dbEvent.is_public ?? true,
      sponsors: dbEvent.sponsors || [],
      created_at: dbEvent.created_at,
      updated_at: dbEvent.updated_at,
      tournaments_count: dbEvent.tournaments_count,
    };
  }

  private mapParticipantFromDB(dbParticipant: any): Participant {
    return {
      id: dbParticipant.id,
      tournament_id: dbParticipant.tournament_id,
      email: dbParticipant.email,
      name: dbParticipant.name,
      full_name: dbParticipant.full_name,
      birth_date: dbParticipant.birth_date,
      gender: dbParticipant.gender,
      avatar: dbParticipant.avatar,
      status: dbParticipant.status,
      checked_in_at: dbParticipant.checked_in_at,
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

  // =============================================
  // USER BADGES OPERATIONS
  // =============================================

  async getUserBadges(userEmail: string): Promise<AwardedBadge[]> {
    const { data, error } = await this.supabase
      .from('user_badges')
      .select('*')
      .eq('user_email', userEmail)
      .order('awarded_at', { ascending: false });

    if (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      badge: row.badge as Badge,
      tournament_id: row.tournament_id,
      tournament_name: row.tournament_name,
      event_id: row.event_id,
      event_name: row.event_name,
      game: row.game,
      awarded_at: row.awarded_at,
      position: row.position,
    }));
  }

  async awardBadge(
    userEmail: string,
    badge: Badge,
    options: {
      tournament_id?: string;
      tournament_name?: string;
      event_id?: string;
      event_name?: string;
      game?: string;
      position?: string;
    }
  ): Promise<AwardedBadge | null> {
    const { data, error } = await this.supabase
      .from('user_badges')
      .insert({
        user_email: userEmail,
        badge,
        tournament_id: options.tournament_id || null,
        tournament_name: options.tournament_name || null,
        event_id: options.event_id || null,
        event_name: options.event_name || null,
        game: options.game || null,
        position: options.position || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error awarding badge:', error);
      return null;
    }

    return {
      id: data.id,
      badge: data.badge as Badge,
      tournament_id: data.tournament_id,
      tournament_name: data.tournament_name,
      event_id: data.event_id,
      event_name: data.event_name,
      game: data.game,
      awarded_at: data.awarded_at,
      position: data.position,
    };
  }

  async awardBadgesToParticipants(
    tournament: Tournament,
    finalStandings: { email: string; position: string }[]
  ): Promise<void> {
    if (!tournament.badges || tournament.badges.length === 0) return;

    for (const template of tournament.badges) {
      const recipients: string[] = [];

      if (template.awardTo === 'all-participants') {
        // Award to all participants
        recipients.push(...finalStandings.map(p => p.email));
      } else if (template.awardTo === 'position' && template.position) {
        // Award to specific position
        const position = template.position;
        
        if (position.startsWith('top-')) {
          // Top N (e.g., top-8)
          const topN = parseInt(position.replace('top-', ''));
          const topParticipants = finalStandings
            .filter(p => parseInt(p.position) <= topN)
            .map(p => p.email);
          recipients.push(...topParticipants);
        } else {
          // Specific position (1, 2, 3)
          const positionParticipant = finalStandings.find(p => p.position === position);
          if (positionParticipant) {
            recipients.push(positionParticipant.email);
          }
        }
      } else if (template.awardTo === 'custom' && template.customEmails) {
        // Award to custom list
        recipients.push(...template.customEmails);
      }

      // Award badge to all recipients
      for (const email of recipients) {
        const participant = finalStandings.find(p => p.email === email);
        await this.awardBadge(email, template.badge, {
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          game: tournament.game,
          position: participant?.position,
        });
      }
    }
  }

  async removeBadge(badgeId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_badges')
      .delete()
      .eq('id', badgeId);

    if (error) {
      console.error('Error removing badge:', error);
      return false;
    }

    return true;
  }
}

export const db = new DatabaseService();
