import { describe, it, expect } from 'vitest';
import { generateRounds } from '@/components/tournaments/bracket';

describe('Bracket Generation - New Formats', () => {
  const players = [
    { name: 'Player 1', avatar: 'a1', email: 'p1@test.com' },
    { name: 'Player 2', avatar: 'a2', email: 'p2@test.com' },
    { name: 'Player 3', avatar: 'a3', email: 'p3@test.com' },
    { name: 'Player 4', avatar: 'a4', email: 'p4@test.com' },
  ];

  describe('Round Robin', () => {
    it('generates n-1 rounds for even participants', () => {
      const rounds = generateRounds(4, players, 'round-robin');
      expect(rounds.length).toBe(3); // 4 players = 3 rounds
      rounds.forEach(r => {
        expect(r.matches.length).toBe(2); // 2 matches per round
      });
    });

    it('adds BYE for odd participants', () => {
      const oddPlayers = players.slice(0, 3);
      const rounds = generateRounds(3, oddPlayers, 'round-robin');
      expect(rounds.length).toBe(3); // 3 players + 1 BYE = 4 -> 3 rounds
      expect(rounds[0].matches.some(m => m.bottom.name === 'BYE')).toBe(true);
    });
  });

  describe('Free For All', () => {
    it('generates group matches', () => {
      const manyPlayers = Array.from({ length: 16 }, (_, i) => ({ 
        name: `P${i+1}`, avatar: null, email: `p${i}@t.com` 
      }));
      // Standard 8 players per match
      const rounds = generateRounds(16, manyPlayers, 'free-for-all');
      
      expect(rounds[0].name).toBe('Fase 1');
      expect(rounds[0].matches.length).toBe(2); // 16 players / 8 = 2 matches
      expect(rounds[0].matches[0].players?.length).toBe(8);
      
      expect(rounds[1].name).toBe('Final');
      expect(rounds[1].matches.length).toBe(1);
    });
  });
});
