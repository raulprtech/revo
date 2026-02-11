// Action to process AI Caster requests on the server
"use server"

import { tournamentCaster } from '@/ai/genkit';

export async function getAiCasterComment(input: {
  eventType: 'match_start' | 'stream_start' | 'tournament_end';
  tournamentName: string;
  p1Name: string;
  p2Name?: string;
  additionalContext?: string;
}) {
  try {
    const result = await tournamentCaster(input);
    return { success: true, text: result };
  } catch (error) {
    console.error('AI Caster Server Action Error:', error);
    return { success: false, error: 'Failed to generate AI comment' };
  }
}
