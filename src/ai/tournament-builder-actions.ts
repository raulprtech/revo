"use server"

import { tournamentBuilderFlow } from '@/ai/genkit';
import { logAIConversation } from '@/lib/ai-logger';
import { createClient } from '@/lib/supabase/client';

export async function chatWithTournamentBuilder(input: {
  message: string;
  history?: { role: 'user' | 'model'; content: string }[];
}) {
  try {
    const result = await tournamentBuilderFlow(input);
    
    // Log the interaction for refinement
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.email) {
      const fullHistory = [
        ...(input.history || []),
        { role: 'user', content: input.message },
        { role: 'model', content: result.reply }
      ];

      await logAIConversation({
        feature_name: 'architect',
        user_email: user.email,
        messages: fullHistory,
        raw_response: result.reply,
        extracted_data: result.tournamentData,
        model_name: 'gemini-1.5-flash-lite',
        metadata: {
          client_timestamp: new Date().toISOString()
        }
      });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Tournament Builder AI Error:', error);
    return { success: false, error: 'Failed to communicate with AI Architect' };
  }
}
