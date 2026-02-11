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
      Eres el "Duels AI Caster", un narrador de eSports legendario, apasionado y con mucho estilo. 
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
      6. No menciones que eres una IA. Eres el Caster oficial de Duels Esports.

      Genera el mensaje para Discord:
    `;

    const response = await ai.generate({
      prompt,
      config: {
        temperature: 0.8,
      },
    });

    return response.text;
  }
);

export const tournamentBuilderFlow = ai.defineFlow(
  {
    name: 'tournamentBuilder',
    inputSchema: z.object({
      message: z.string(),
      history: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      })).optional(),
    }),
    outputSchema: z.object({
      reply: z.string(),
      tournamentData: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        game: z.string().optional(),
        gameMode: z.string().optional(),
        format: z.enum(["single-elimination", "double-elimination", "swiss"]).optional(),
        startDate: z.string().optional(),
        startTime: z.string().optional(),
        maxParticipants: z.number().optional(),
        registrationType: z.enum(["public", "private"]).optional(),
        tournamentMode: z.enum(["online", "presencial"]).optional(),
        location: z.string().optional(),
        prizePool: z.string().optional(),
      }).optional(),
    }),
  },
  async (input) => {
    const prompt = `
      Eres un asistente experto en organizar torneos de eSports llamado "Duels AI Architect". 
      Tu objetivo es ayudar al usuario a configurar los detalles de un nuevo torneo mediante una conversación natural.

      INSTRUCCIONES:
      1. Extrae los datos del torneo si el usuario los menciona.
      2. Si faltan datos críticos, pregunta por ellos amablemente uno por uno o en pequeños grupos.
      3. Importante: Devuelve SIEMPRE un JSON que incluya "reply" (tu respuesta al usuario) y opcionalmente "tournamentData" con los campos que hayas logrado identificar hasta ahora.
      4. Los juegos soportados son: FIFA, The King of Fighters, Super Smash Bros, Mario Kart, Street Fighter, Clash Royale. Si el usuario elige otro, menciónalo pero intenta mapearlo o dejar el campo 'game' con el valor del usuario.
      5. Formatos válidos: single-elimination, double-elimination, swiss.
      6. Modos válidos: online, presencial.

      ESTRUCTURA DE RESPUESTA:
      {
        "reply": "Tu mensaje aquí",
        "tournamentData": {
          "name": "...",
          "game": "...",
          ...
        }
      }

      Mensaje del usuario: ${input.message}
    `;

    const response = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash-lite', // Usando Flash para velocidad y menor costo en chat lite
      config: {
        temperature: 0.7,
      },
    });

    try {
      // Intentar limpiar la respuesta si Gemini devuelve markdown
      const aiText = response.text;
      const cleanText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (e) {
      return { 
        reply: response.text,
        tournamentData: {}
      };
    }
  }
);
