"use server"

import { tournamentBuilderFlow } from '@/ai/genkit';

export async function chatWithTournamentBuilder(input: {
  message: string;
  history?: { role: 'user' | 'model'; content: string }[];
}) {
  try {
    const result = await tournamentBuilderFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Tournament Builder AI Error:', error);
    return { success: false, error: 'Failed to communicate with AI Architect' };
  }
}
