-- Migration: AI Conversational Interactions Tracking
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT NOT NULL, -- 'architect', 'caster', 'arbiter'
    user_email TEXT NOT NULL,
    interaction_type TEXT DEFAULT 'chat', -- 'chat', 'command', 'automatic'
    
    -- Conversation Content
    messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {role, content, timestamp}
    
    -- AI Context & Response
    raw_response TEXT,
    extracted_data JSONB DEFAULT '{}'::jsonb, -- Structured data extracted by AI
    model_name TEXT NOT NULL, -- 'gemini-1.5-flash-lite', etc.
    
    -- Labeling & Refinement
    is_useful BOOLEAN DEFAULT NULL,
    correction_notes TEXT,
    labeled_by TEXT, -- Admin email
    
    metadata JSONB DEFAULT '{}'::jsonb, -- Extra context (tournament_id, match_id, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    labeled_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage AI conversations" ON public.ai_conversations
FOR ALL USING (
    (auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com')
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    OR auth.jwt() ->> 'email' = 'admin@duels.pro'
);

-- Index for searching and filtering
CREATE INDEX IF NOT EXISTS idx_ai_conversations_feature ON public.ai_conversations(feature_name);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_email);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON public.ai_conversations(created_at);
