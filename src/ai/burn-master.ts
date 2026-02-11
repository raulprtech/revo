import { ai } from "./genkit";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const BurnActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("single_tournament"),
    game_key: z.string(),
    reasoning: z.string(),
    tournament_config: z.object({
      name: z.string(),
      entry_fee: z.number(),
      prize_description: z.string(),
      max_participants: z.number(),
      start_time_iso: z.string()
    }),
    target_persona: z.string(),
    estimated_burn: z.number()
  }),
  z.object({
    type: z.literal("multi_day_event"),
    event_name: z.string(),
    reasoning: z.string(),
    duration_days: z.number(),
    tournaments: z.array(z.object({
      name: z.string(),
      game_key: z.string(),
      entry_fee: z.number(),
      prize_description: z.string(),
      day_offset: z.number()
    })),
    target_burn_goal: z.number(),
    marketing_push: z.string()
  })
]);

export const defineBurnStrategy = ai.defineFlow(
  {
    name: "defineBurnStrategy",
    inputSchema: z.object({
      intelligence_data: z.any(),
      retention_data: z.any(),
      available_items: z.array(z.string()),
      intensity_level: z.enum(["normal", "aggressive", "crisis"]),
      historical_roi: z.any().optional()
    }),
    outputSchema: BurnActionSchema
  },
  async (input) => {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: `
        Eres el Director Económico de Duels Esports. Tu objetivo es crear planes de recuperación de moneda (Burn) 
        basados en el nivel de intensidad: ${input.intensity_level}.

        CONTEXTO ACTUAL:
        - Datos de Inteligencia: ${JSON.stringify(input.intelligence_data)}
        - Riesgos de Retención: ${JSON.stringify(input.retention_data)}
        - Items Raros disponibles para premios: ${input.available_items.join(', ')}
        
        HISTÓRICO DE RENDIMIENTO (AUTO-CORRECCIÓN):
        ${JSON.stringify(input.historical_roi || "No hay datos históricos aún.")}

        INSTRUCCIONES:
        1. Analiza el HISTÓRICO DE RENDIMIENTO. Si un juego ha demostrado tener un ROI bajo o predicciones inexactas en el pasado, ajusta tu estrategia (cambia de juego o ajusta los entry fees).
        2. Si la intensidad es 'normal', propón un (single_tournament).
        3. Si la intensidad es 'aggressive' o 'crisis', propón un (multi_day_event) de 3-7 días con múltiples torneos.
        4. Prioriza los formatos que históricamente han tenido mayor quema (total_burned).
        5. Justifica tu estrategia basándote en la combinación de datos actuales y rendimiento histórico.

        Devuelve un objeto JSON que siga el esquema definido por discriminador "type".
      `
    });

    return response.output();
  }
);

export async function generateAutomatedBurnAction(intensity: "normal" | "aggressive" | "crisis" = "normal") {
    const supabase = await createClient();
    
    // 1. Fetch data for AI
    const { data: intelligence } = await supabase.from('platform_heartbeat').select('*').limit(5);
    const { data: profiles } = await supabase.from('player_intelligence_profiles').select('*').gt('churn_risk_score', 50);
    const { data: items } = await supabase.from('cosmetic_items').select('slug').limit(10);
    
    // 1b. Fetch Historical ROI for Auto-Correction
    const { data: historicalRoi } = await supabase.from('burn_efficiency_stats').select('*');

    // 2. Run AI Strategy
    const strategy = await defineBurnStrategy({
        intelligence_data: intelligence,
        retention_data: profiles,
        available_items: items?.map(i => i.slug) || [],
        intensity_level: intensity,
        historical_roi: historicalRoi // Pass historical performance to AI
    });

    // 3. Log to AI Refinement Loop (ai_conversations)
    // Esto permite que el Admin refine el comportamiento del Burn Master
    await supabase.from('ai_conversations').insert({
        feature_name: 'burn_master',
        user_id: (await supabase.auth.getUser()).data.user?.id,
        context: { intensity, inputs: { intelligence, profiles } },
        prompt: `Generate burn strategy for intensity ${intensity}`,
        response: strategy,
        is_corrected: false
    });

    if (strategy.type === "single_tournament") {
        const { data: tournament } = await supabase.from('tournaments').insert({
            name: strategy.tournament_config.name,
            game: strategy.game_key,
            max_participants: strategy.tournament_config.max_participants,
            start_date: strategy.tournament_config.start_time_iso,
            owner_email: 'admin@duels.pro',
            registration_type: 'public',
            prize_pool: strategy.tournament_config.prize_description,
            data_ai_hint: `AUTO_BURN_STRATEGY: ${strategy.target_persona}`
        }).select().single();

        if (tournament) {
            await supabase.from('ai_generated_events_log').insert({
                trigger_reason: strategy.reasoning,
                predicted_engagement: 0.85,
                tournament_id: tournament.id
            });
        }
        return { success: !!tournament, strategy };
    } else {
        // Multi-day Event logic
        const { data: campaign } = await supabase.from('ai_generated_campaigns').insert({
            name: strategy.event_name,
            strategy_reasoning: strategy.reasoning,
            target_burn_goal: strategy.target_burn_goal,
            start_date: new Date().toISOString(),
            status: 'active'
        }).select().single();

        if (campaign) {
            for (const t of strategy.tournaments) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + t.day_offset);

                const { data: tourney } = await supabase.from('tournaments').insert({
                    name: t.name,
                    game: t.game_key,
                    campaign_id: campaign.id,
                    max_participants: 100,
                    start_date: startDate.toISOString(),
                    owner_email: 'admin@duels.pro',
                    registration_type: 'public',
                    prize_pool: t.prize_description,
                    data_ai_hint: `CAMPAIGN_PART: ${campaign.name}`
                }).select().single();

                if (tourney) {
                    await supabase.from('ai_generated_events_log').insert({
                        trigger_reason: `Part of campaign: ${campaign.name}`,
                        predicted_engagement: 0.9,
                        tournament_id: tourney.id,
                        campaign_id: campaign.id
                    });
                }
            }
        }
        return { success: !!campaign, strategy };
    }
}
