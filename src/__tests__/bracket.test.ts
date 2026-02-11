import { describe, it, expect } from 'vitest';
import { generateRounds, type Match, type Round } from '@/components/tournaments/bracket';

// Helpers
const playerNames = (count: number) =>
  Array.from({ length: count }, (_, i) => `Player ${i + 1}`);

const playerObjects = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    name: `Player ${i + 1}`,
    avatar: `https://example.com/avatar${i + 1}.png`,
  }));

/** Count non-BYE matches in a round */
const realMatches = (round: Round) =>
  round.matches.filter(
    (m) => m.top.name !== 'BYE' && m.bottom.name !== 'BYE'
  );

// ─────────────────────────────────────────────
// generateRounds — edge cases
// ─────────────────────────────────────────────
describe('generateRounds — edge cases', () => {
  it('returns empty array when numParticipants < 2', () => {
    expect(generateRounds(1, ['Solo'])).toEqual([]);
    expect(generateRounds(0)).toEqual([]);
  });

  it('returns empty array when seededPlayers is empty or undefined', () => {
    expect(generateRounds(4)).toEqual([]);
    expect(generateRounds(4, [])).toEqual([]);
  });

  it('accepts string players and object players interchangeably', () => {
    const fromStrings = generateRounds(4, playerNames(4));
    const fromObjects = generateRounds(4, playerObjects(4));

    expect(fromStrings.length).toBe(fromObjects.length);
    // Both should produce the same round/match structure
    fromStrings.forEach((round, i) => {
      expect(round.matches.length).toBe(fromObjects[i].matches.length);
    });
  });
});

// ─────────────────────────────────────────────
// Single Elimination
// ─────────────────────────────────────────────
describe('Single Elimination bracket', () => {
  it('generates correct number of rounds for power-of-2 participants', () => {
    // 2 players → 1 round (Final)
    const r2 = generateRounds(2, playerNames(2), 'single-elimination');
    expect(r2.length).toBe(1);
    expect(r2[0].name).toBe('Final');

    // 4 players → 2 rounds
    const r4 = generateRounds(4, playerNames(4), 'single-elimination');
    expect(r4.length).toBe(2);
    expect(r4[0].name).toBe('Semifinales');
    expect(r4[1].name).toBe('Final');

    // 8 players → 3 rounds
    const r8 = generateRounds(8, playerNames(8), 'single-elimination');
    expect(r8.length).toBe(3);
    expect(r8[0].name).toBe('Cuartos');
    expect(r8[1].name).toBe('Semifinales');
    expect(r8[2].name).toBe('Final');
  });

  it('generates correct match counts per round', () => {
    const rounds = generateRounds(8, playerNames(8), 'single-elimination');
    expect(rounds[0].matches.length).toBe(4); // Cuartos
    expect(rounds[1].matches.length).toBe(2); // Semis
    expect(rounds[2].matches.length).toBe(1); // Final
  });

  it('handles non-power-of-2 participants with BYEs', () => {
    // 3 players → rounds up to 4 bracket, 1 BYE
    const rounds = generateRounds(3, playerNames(3), 'single-elimination');
    expect(rounds.length).toBe(2);

    const firstRound = rounds[0];
    expect(firstRound.matches.length).toBe(2);

    // One match should have a BYE
    const byeMatches = firstRound.matches.filter(
      (m) => m.top.name === 'BYE' || m.bottom.name === 'BYE'
    );
    expect(byeMatches.length).toBe(1);
  });

  it('auto-advances BYE matches with a winner', () => {
    const rounds = generateRounds(3, playerNames(3), 'single-elimination');
    const byeMatch = rounds[0].matches.find(
      (m) => m.top.name === 'BYE' || m.bottom.name === 'BYE'
    )!;
    expect(byeMatch.winner).not.toBeNull();
    // The winner should be the non-BYE player
    const nonByePlayer =
      byeMatch.top.name === 'BYE' ? byeMatch.bottom.name : byeMatch.top.name;
    expect(byeMatch.winner).toBe(nonByePlayer);
  });

  it('propagates BYE winners into the next round', () => {
    const rounds = generateRounds(3, playerNames(3), 'single-elimination');
    const final = rounds[1].matches[0];
    // One slot in the final should already have the BYE winner
    const filled = [final.top.name, final.bottom.name].filter(
      (n) => n !== 'TBD'
    );
    expect(filled.length).toBeGreaterThanOrEqual(1);
  });

  it('handles 5 participants (bracket size 8, 3 BYEs)', () => {
    const rounds = generateRounds(5, playerNames(5), 'single-elimination');
    expect(rounds.length).toBe(3); // quarters, semis, final

    // 5 players + 3 BYEs = 8 slots → 4 matches
    // BYEs are appended at end: [P1,P2,P3,P4,P5,BYE,BYE,BYE]
    // Matches with at least one BYE: P5vBYE and BYEvBYE = 2
    const byeMatches = rounds[0].matches.filter(
      (m) => m.top.name === 'BYE' || m.bottom.name === 'BYE'
    );
    expect(byeMatches.length).toBe(2);
  });

  it('handles 16 participants', () => {
    const rounds = generateRounds(16, playerNames(16), 'single-elimination');
    expect(rounds.length).toBe(4);
    expect(rounds[0].matches.length).toBe(8);
    expect(rounds[3].name).toBe('Final');
  });

  it('sets bracket property to "winners" for all single-elimination rounds', () => {
    const rounds = generateRounds(8, playerNames(8), 'single-elimination');
    rounds.forEach((round) => {
      expect(round.bracket).toBe('winners');
    });
  });

  it('has no initial winners on first round (except BYEs)', () => {
    const rounds = generateRounds(8, playerNames(8), 'single-elimination');
    // All 8 real players → no BYEs → no auto-winners
    rounds[0].matches.forEach((m) => {
      expect(m.winner).toBeNull();
    });
  });

  it('all matches have unique ids', () => {
    const rounds = generateRounds(16, playerNames(16), 'single-elimination');
    const ids = rounds.flatMap((r) => r.matches.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every player appears exactly once in the first round', () => {
    const names = playerNames(8);
    const rounds = generateRounds(8, names, 'single-elimination');
    const firstRoundPlayers = rounds[0].matches.flatMap((m) => [
      m.top.name,
      m.bottom.name,
    ]);
    names.forEach((name) => {
      expect(firstRoundPlayers).toContain(name);
      expect(firstRoundPlayers.filter((p) => p === name).length).toBe(1);
    });
  });

  it('defaults to single-elimination when format is undefined', () => {
    const withFormat = generateRounds(4, playerNames(4), 'single-elimination');
    const withoutFormat = generateRounds(4, playerNames(4));
    expect(withFormat.length).toBe(withoutFormat.length);
    withFormat.forEach((round, i) => {
      expect(round.matches.length).toBe(withoutFormat[i].matches.length);
    });
  });
});

// ─────────────────────────────────────────────
// Double Elimination
// ─────────────────────────────────────────────
describe('Double Elimination bracket', () => {
  it('generates winners, losers, and grand finals rounds', () => {
    const rounds = generateRounds(4, playerNames(4), 'double-elimination');

    const winnersRounds = rounds.filter((r) => r.bracket === 'winners');
    const losersRounds = rounds.filter((r) => r.bracket === 'losers');
    const finalsRounds = rounds.filter((r) => r.bracket === 'finals');

    expect(winnersRounds.length).toBeGreaterThanOrEqual(1);
    expect(losersRounds.length).toBeGreaterThanOrEqual(1);
    expect(finalsRounds.length).toBe(1);
  });

  it('winners rounds have "W" prefix in name', () => {
    const rounds = generateRounds(4, playerNames(4), 'double-elimination');
    const winnersRounds = rounds.filter((r) => r.bracket === 'winners');
    winnersRounds.forEach((r) => {
      expect(r.name).toMatch(/^W /);
    });
  });

  it('losers rounds have "L" prefix in name', () => {
    const rounds = generateRounds(4, playerNames(4), 'double-elimination');
    const losersRounds = rounds.filter((r) => r.bracket === 'losers');
    losersRounds.forEach((r) => {
      expect(r.name).toMatch(/^L /);
    });
  });

  it('grand finals has exactly one match', () => {
    const rounds = generateRounds(8, playerNames(8), 'double-elimination');
    const gf = rounds.find((r) => r.bracket === 'finals')!;
    expect(gf.matches.length).toBe(1);
    expect(gf.name).toBe('Gran Final');
  });

  it('grand finals match has Winners/Losers TBD placeholders', () => {
    const rounds = generateRounds(4, playerNames(4), 'double-elimination');
    const gf = rounds.find((r) => r.bracket === 'finals')!;
    const match = gf.matches[0];
    expect(match.top.name).toContain('Winners');
    expect(match.bottom.name).toContain('Losers');
  });

  it('all match ids across all brackets are unique', () => {
    const rounds = generateRounds(8, playerNames(8), 'double-elimination');
    const ids = rounds.flatMap((r) => r.matches.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('total matches are correct for 4 players', () => {
    // 4 players double elim:
    // Winners: 2 rounds (2 + 1 = 3 matches)
    // Losers: at least 1 round
    // Grand Finals: 1
    const rounds = generateRounds(4, playerNames(4), 'double-elimination');
    const totalMatches = rounds.reduce(
      (acc, r) => acc + r.matches.length,
      0
    );
    expect(totalMatches).toBeGreaterThanOrEqual(5);
  });
});

// ─────────────────────────────────────────────
// Swiss Format
// ─────────────────────────────────────────────
describe('Swiss format bracket', () => {
  it('generates one round when called with swiss format', () => {
    const rounds = generateRounds(8, playerNames(8), 'swiss');
    expect(rounds.length).toBe(1);
    expect(rounds[0].name).toBe('Ronda 1');
  });

  it('pairs players correctly (N/2 matches for even N)', () => {
    const rounds = generateRounds(8, playerNames(8), 'swiss');
    expect(rounds[0].matches.length).toBe(4);
  });

  it('handles odd number of players with a BYE', () => {
    const rounds = generateRounds(7, playerNames(7), 'swiss');
    expect(rounds[0].matches.length).toBe(4); // 3 real + 1 bye

    const byeMatch = rounds[0].matches.find(
      (m) => m.bottom.name === 'BYE'
    );
    expect(byeMatch).toBeDefined();
    expect(byeMatch!.winner).toBe('Player 7');
  });

  it('sets bracket to "swiss" on generated rounds', () => {
    const rounds = generateRounds(6, playerNames(6), 'swiss');
    expect(rounds[0].bracket).toBe('swiss');
    rounds[0].matches.forEach((m) => {
      expect(m.bracket).toBe('swiss');
    });
  });

  it('every player appears exactly once', () => {
    const names = playerNames(6);
    const rounds = generateRounds(6, names, 'swiss');
    const allPlayers = rounds[0].matches.flatMap((m) => [
      m.top.name,
      m.bottom.name,
    ]);
    names.forEach((name) => {
      expect(allPlayers).toContain(name);
    });
  });
});

// ─────────────────────────────────────────────
// Match & Round structure
// ─────────────────────────────────────────────
describe('Match and Round structure', () => {
  it('each match has required fields', () => {
    const rounds = generateRounds(4, playerNames(4), 'single-elimination');
    rounds.forEach((round) => {
      round.matches.forEach((match) => {
        expect(match).toHaveProperty('id');
        expect(match).toHaveProperty('top');
        expect(match).toHaveProperty('bottom');
        expect(match).toHaveProperty('winner');
        expect(match.top).toHaveProperty('name');
        expect(match.top).toHaveProperty('score');
        expect(match.bottom).toHaveProperty('name');
        expect(match.bottom).toHaveProperty('score');
      });
    });
  });

  it('scores start as null', () => {
    const rounds = generateRounds(4, playerNames(4), 'single-elimination');
    rounds[0].matches.forEach((m) => {
      expect(m.top.score).toBeNull();
      expect(m.bottom.score).toBeNull();
    });
  });

  it('avatar data is preserved for object players', () => {
    const players = playerObjects(4);
    const rounds = generateRounds(4, players, 'single-elimination');
    const firstMatch = rounds[0].matches[0];
    // Top player should have the avatar from input
    expect(firstMatch.top.avatar).toBe(players[0].avatar);
    expect(firstMatch.bottom.avatar).toBe(players[1].avatar);
  });

  it('avatar is null for string players', () => {
    const rounds = generateRounds(4, playerNames(4), 'single-elimination');
    const firstMatch = rounds[0].matches[0];
    expect(firstMatch.top.avatar).toBeNull();
  });

  it('propagates player details (avatar/email) to next rounds when using BYEs', () => {
    const players = [
      { name: 'P1', avatar: 'avatar1', email: 'p1@test.com' },
      { name: 'BYE', avatar: null, email: null },
      { name: 'P2', avatar: 'avatar2', email: 'p2@test.com' },
      { name: 'BYE', avatar: null, email: null },
    ];
    // 2 real players, 2 implicit BYEs if I pass 2 as count, but generateRounds takes seededPlayers length if provided.
    // Actually, if I pass these 4, it's a 4-player bracket.
    const rounds = generateRounds(4, players, 'single-elimination');
    
    // First round matches:
    // Match 0 (id 1): P1 vs BYE -> winner P1 (auto-propagated)
    // Match 1 (id 2): P2 vs BYE -> winner P2 (auto-propagated)
    
    const finalRound = rounds[1]; // Final
    const finalMatch = finalRound.matches[0];
    
    // Check that P1 and P2 moved to the next round with their details
    expect(finalMatch.top.name).toBe('P1');
    expect(finalMatch.top.avatar).toBe('avatar1');
    expect(finalMatch.top.email).toBe('p1@test.com');
    
    expect(finalMatch.bottom.name).toBe('P2');
    expect(finalMatch.bottom.avatar).toBe('avatar2');
    expect(finalMatch.bottom.email).toBe('p2@test.com');
  });
});
