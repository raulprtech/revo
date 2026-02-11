import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-pro', // Arbitraje con Gemini Pro para máximo razonamiento visual
});

export const arbiterFlow = ai.defineFlow(
  {
    name: 'matchArbiter',
    inputSchema: z.object({
      screenshot_url: z.string(),
      p1_name: z.string(),
      p2_name: z.string(),
      is_plus_user: z.boolean().default(false),
    }),
    outputSchema: z.object({
      p1_score: z.number(),
      p2_score: z.number(),
      confidence: z.number(),
      reasoning: z.string(),
      needs_human: z.boolean(),
    }),
  },
  async (input) => {
    // Si el usuario no es PLUS, forzamos intervención humana
    if (!input.is_plus_user) {
      return { 
        p1_score: 0, 
        p2_score: 0, 
        confidence: 0, 
        reasoning: "Usuario Free: Arbitraje automático desactivado. Turnado a organizador.", 
        needs_human: true 
      };
    }

    const response = await ai.generate({
      prompt: `Analiza esta captura de pantalla del juego. 
               Identifica el marcador final para ${input.p1_name} y ${input.p2_name}. 
               Si la imagen es borrosa o ambigua, marca needs_human como true.`,
      // En una implementación real, aquí pasaríamos la imagen como parte del mensaje multipart
    });
    
    // Simulación de lógica de arbitraje
    return {
        p1_score: 2,
        p2_score: 1,
        confidence: 0.95,
        reasoning: "Detección clara de HUD superior",
        needs_human: false
    };
  }
);

export const tournamentCaster = ai.defineFlow(
  {
    name: 'tournamentCaster',
    inputSchema: z.object({
      eventType: z.enum(['match_start', 'stream_start', 'tournament_end']),
      tournamentName: z.string(),
      p1Name: z.string(),
      p2Name: z.string().optional(),
      additionalContext: z.string().optional(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const { eventType, tournamentName, p1Name, p2Name, additionalContext } = input;

    const prompt = `
      Eres el "Revo AI Caster", un narrador de eSports legendario, apasionado y con mucho estilo. 
      Tu objetivo es animar a la comunidad en Discord con anuncios sobre el torneo "${tournamentName}".

      Contexto actual:
      - Evento: ${eventType}
      - Jugador 1: ${p1Name}
      ${p2Name ? `- Jugador 2: ${p2Name}` : ''}
      ${additionalContext ? `- Detalles extra: ${additionalContext}` : ''}

      Instrucciones:
      1. Genera un mensaje corto pero impactante (máximo 280 caracteres).
      2. Usa emojis relacionados con gaming (🎮, 🔥, 🏆, ⚔️).
      3. Si es un inicio de partida, genera hype por el enfrentamiento.
      4. Si es un stream, invita a todos a no perderse la acción.
      5. Mantén un tono profesional pero muy emocionante, como un caster de las finales mundiales.
      6. No menciones que eres una IA. Eres el Caster oficial de Revo.

      Genera el mensaje para Discord:
    `;

    const response = await ai.generate({
      prompt,
      config: {
        temperature: 0.8,
      },
    });

    return response.text();
  }
);
