import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash-lite', // Usamos Gemini 2.0 Flash para baja latencia y alta calidad
});

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
