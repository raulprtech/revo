import { describe, it, expect } from 'vitest';
import { isFeatureAvailable, PLAN_FEATURES, type PlanTier } from '@/lib/plans';

describe('Plan Feature Gating', () => {
  it('correctly identifies features for Community plan', () => {
    const bracketBranding = PLAN_FEATURES.find(f => f.name === 'Personalización de marca');
    const unlimitedTournaments = PLAN_FEATURES.find(f => f.name === 'Torneos ilimitados');

    expect(isFeatureAvailable(bracketBranding!, 'community')).toBe(false);
    expect(isFeatureAvailable(unlimitedTournaments!, 'community')).toBe(true);
  });

  it('correctly identifies features for Plus plan', () => {
    const bracketBranding = PLAN_FEATURES.find(f => f.name === 'Personalización de marca');
    const iaArbiter = PLAN_FEATURES.find(f => f.name === 'Árbitro IA');

    expect(isFeatureAvailable(bracketBranding!, 'plus')).toBe(true);
    expect(isFeatureAvailable(iaArbiter!, 'plus')).toBe(true);
  });

  it('handles all feature statuses correctly', () => {
    // Check excluding features
    const stationManager = PLAN_FEATURES.find(f => f.name === 'Station Manager');
    expect(isFeatureAvailable(stationManager!, 'community')).toBe(false);
    expect(isFeatureAvailable(stationManager!, 'plus')).toBe(true);
  });
});
