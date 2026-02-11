export interface Tournament {
  id: string;
  name: string;
  description?: string;
  game: string;
  participants: number;
  maxParticipants: number;
  startDate: string;
  startTime?: string;
  image?: string;
  dataAiHint?: string;
  registrationType: 'public' | 'private';
  status: string;
  location?: string;
  ownerEmail?: string;
  format?: 'single-elimination' | 'double-elimination' | 'swiss' | 'round-robin' | 'free-for-all';
  prizePool?: string;
  invitedUsers?: string[]; // Array of email addresses for private tournaments
}

export interface User {
  displayName: string;
  email: string;
  photoURL: string;
  location?: string;
}

export interface Participant {
  email: string;
  name: string;
  avatar: string;
  status: 'Aceptado' | 'Pendiente' | 'Rechazado';
}