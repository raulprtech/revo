import { ai } from "./genkit";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// Types for the profiling results
const PlayerProfileSchema = z.object({
    persona: z.enum(['WHALE', 'GRINDER', 'CASUAL', 'PRO', 'AT_RISK', 'NEWBIE']),
    churn_risk: z.number().min(0).max(100),
    engagement_score: z.number().min(0).max(100),
    summary: z.string(),
    incentive_recommendation: z.string()
});

/**
 * Player Retention AI Service
 * Analyzing behavioral patterns to prevent churn and increase LTV.
 */
export async function analyzePlayerRetention(userId: string, rfmData: any, recentMessages?: string[]) {
    // Initialize Supabase Admin for DB updates
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const prompt = `
    Analyze this player's behavioral data for Duels Esports and provide a retention profile.
    
    Data Context:
    - User ID: ${userId}
    - Recency: ${rfmData.days_since_last_login} days since last activity
    - Frequency: ${rfmData.matches_30d} matches in last 30 days
    - Monetary: ${rfmData.coins_spent_total} coins spent lifetime
    - Recent Feedback/Chat: ${recentMessages?.join(' | ') || 'No chat data'}

    Rules:
    - WHALE: Spent > 1000 coins and high frequency.
    - AT_RISK: Frequency dropped by > 50% or Recency > 7 days for a previously active user.
    - GRINDER: High frequency (>20 matches/mo) but low spend.
    - PRO: Competitive focus, high win rate, uses AI Arbiter often.

    Respond ONLY with a JSON object matching this structure:
    {
        "persona": "ENUM",
        "churn_risk": 0-100,
        "engagement_score": 0-100,
        "summary": "Short 1-sentence behavioral profile",
        "incentive_recommendation": "Specific actionable incentive"
    }
    `;

    try {
        const response = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: prompt,
            config: {
                temperature: 0.2, // Low temperature for deterministic classification
            }
        });

        const rawText = response.text;
        const profile = PlayerProfileSchema.parse(JSON.parse(rawText));

        // Update the database with the new intelligence
        const { error } = await supabaseAdmin
            .from('player_intelligence_profiles')
            .upsert({
                user_id: userId,
                persona_type: profile.persona,
                churn_risk_score: profile.churn_risk,
                engagement_score: profile.engagement_score,
                behavioral_summary: profile.summary,
                recommended_incentive: profile.incentive_recommendation,
                last_analysis_at: new Date().toISOString()
            });

        if (error) throw error;

        return profile;
    } catch (error) {
        console.error("Retention Analysis Error:", error);
        return null;
    }
}
