// AI Conversations Logging Logic
// =============================================

import { createClient } from '@/lib/supabase/client';

export type AIInteractionType = 'architect' | 'caster' | 'arbiter';

export async function logAIConversation(data: {
  feature_name: AIInteractionType;
  user_email: string;
  interaction_type?: 'chat' | 'command' | 'automatic';
  messages: any[];
  raw_response?: string;
  extracted_data?: any;
  model_name: string;
  metadata?: any;
}) {
  const supabase = createClient();
  
  try {
    const { error } = await supabase
      .from('ai_conversations')
      .insert([
        {
          feature_name: data.feature_name,
          user_email: data.user_email,
          interaction_type: data.interaction_type || 'chat',
          messages: data.messages,
          raw_response: data.raw_response,
          extracted_data: data.extracted_data || {},
          model_name: data.model_name,
          metadata: data.metadata || {}
        }
      ]);

    if (error) {
       console.error('Error logging AI interaction:', error);
       return { success: false, error };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Failed to log AI conversation:', err);
    return { success: false, error: err };
  }
}

export async function getAIConversations(filters?: { 
  feature?: AIInteractionType;
  labeled?: boolean;
}) {
  const supabase = createClient();
  
  let query = supabase
    .from('ai_interactions_view') // Custom view for admins
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.feature) {
    query = query.eq('feature_name', filters.feature);
  }

  const { data, error } = await query;
  return { data, error };
}
