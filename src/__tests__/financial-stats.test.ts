import { describe, it, expect } from 'vitest';
import { calculatePlatformFee, calculateNetRevenue, calculatePrizeSplits } from '@/lib/utils';

// Mocking the behavior we expect in the Stats component
describe('Tournament Stats Financial Logic', () => {
  const mockTournament = {
    id: 't1',
    name: 'Pro Tournament',
    entry_fee: 100,
    entry_fee_currency: 'MXN',
    collected_fees: 1600, // 16 participants * 100
    prize_pool_percentage: [
      { position: 1, percentage: 60 },
      { position: 2, percentage: 30 },
      { position: 3, percentage: 10 },
    ]
  };

  it('calculates the 10% platform fee correctly from collected fees', () => {
    const platformFee = calculatePlatformFee(mockTournament.collected_fees);
    expect(platformFee).toBe(160); // 10% of 1600
  });

  it('calculates the net revenue after platform fee', () => {
    const netRevenue = calculateNetRevenue(mockTournament.collected_fees);
    expect(netRevenue).toBe(1440); // 1600 - 160
  });

  it('calculates individual prize amounts correctly from net pool', () => {
    const netRevenue = calculateNetRevenue(mockTournament.collected_fees);
    const distributions = mockTournament.prize_pool_percentage;
    
    const prizes = calculatePrizeSplits(netRevenue, distributions);
    
    expect(prizes[0].amount).toBe(864); // 60% of 1440
    expect(prizes[1].amount).toBe(432); // 30% of 1440
    expect(prizes[2].amount).toBe(144); // 10% of 1440
    
    // Total distributed should equal netRevenue
    const totalPrize = prizes.reduce((sum, p) => sum + p.amount, 0);
    expect(totalPrize).toBe(netRevenue);
  });

  it('calculates organizer gain (rest of net revenue)', () => {
    const netRevenue = calculateNetRevenue(mockTournament.collected_fees);
    const prizePercentageTotal = mockTournament.prize_pool_percentage.reduce((s, p) => s + p.percentage, 0);
    
    // In this case, percentages sum to 100, so organizer gain is 0 from the net revenue (all goes to prizes)
    // But if prize pool was only 50%:
    const limitedPrizePool = [ { position: 1, percentage: 50 } ];
    const prizeSplits = calculatePrizeSplits(netRevenue, limitedPrizePool);
    const prizeTotal = prizeSplits.reduce((s, p) => s + p.amount, 0);
    
    const organizerGain = netRevenue - prizeTotal;
    expect(organizerGain).toBe(720); // 50% of 1440
  });
});
