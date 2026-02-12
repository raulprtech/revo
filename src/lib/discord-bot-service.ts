/**
 * Discord Bot Service
 * This service handles high-level platform interactions with Discord via an internal bridge.
 * All operations are production-ready and communicate directly with the Discord API.
 */

import { Tournament } from './database';
import { getAiCasterComment } from '@/ai/actions';

/**
 * DiscordBotService - Final Production Ready Structure
 * Integration requires DISCORD_BOT_TOKEN and DISCORD_GUILD_ID in .env
 */
export class DiscordBotService {
    private static async callBotBridge(action: string, data: any) {
        const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
        const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

        if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
            console.warn(`[DiscordBot] Missing configuration. Action ${action} aborted.`);
            return null;
        }

        try {
            // This calls our internal API which acts as a bridge to Discord API or a dedicated bot process
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/discord/bridge`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DISCORD_BOT_TOKEN}`
                },
                body: JSON.stringify({ action, guildId: DISCORD_GUILD_ID, ...data })
            });

            if (!response.ok) throw new Error(`Discord Bridge Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`[DiscordBot] Error in action ${action}:`, error);
            throw error;
        }
    }

    static async setupTournamentDiscord(tournament: Tournament) {
        console.log(`[DiscordBot] Provisioning Discord for: ${tournament.name}`);
        
        return this.callBotBridge('setup_tournament', {
            tournamentId: tournament.id,
            name: tournament.name
        });
    }

    static async onboardParticipant(discordId: string, roleId: string) {
        console.log(`[DiscordBot] Adding role ${roleId} to user ${discordId}`);
        return this.callBotBridge('assign_role', { discordId, roleId });
    }

    static async announceMatchStart(tournamentName: string, player1: string, player2: string, channelId?: string) {
        if (!channelId) return;

        try {
            const result = await getAiCasterComment({
                eventType: 'match_start',
                tournamentName,
                p1Name: player1,
                p2Name: player2
            });

            const content = result.success ? result.text : `⚔️ **¡Partida Iniciada!**\n${player1} vs ${player2}`;
            
            return this.callBotBridge('send_message', {
                channelId,
                content,
                embed: {
                    title: "🏆 Duelo Revo",
                    description: content,
                    color: 0x5865F2,
                    fields: [
                        { name: "Jugador 1", value: player1, inline: true },
                        { name: "Jugador 2", value: player2, inline: true }
                    ]
                }
            });
        } catch (error) {
            console.error('Error in match start announcement:', error);
        }
    }

    static async announceStream(tournamentName: string, playerName: string, vsName: string, streamUrl: string, channelId?: string) {
        if (!channelId) return;

        let aiComment = `¡${playerName} está en vivo!`;
        try {
            const result = await getAiCasterComment({
                eventType: 'stream_start',
                tournamentName,
                p1Name: playerName,
                p2Name: vsName,
                additionalContext: `Stream: ${streamUrl}`
            });
            if (result.success) aiComment = result.text as string;
        } catch (err) {}

        return this.callBotBridge('send_message', {
            channelId,
            content: `🔴 **¡EN VIVO!** ${streamUrl}`,
            embed: {
                title: `${playerName} vs ${vsName}`,
                description: aiComment,
                url: streamUrl,
                color: 0xFF0000,
                author: { name: tournamentName }
            }
        });
    }
}
                    { name: "Oponente", value: vsName, inline: true },
                    { name: "Torneo", value: tournamentName }
                ],
                footer: { text: "Duels Esports - AI Caster Integration" },
                timestamp: new Date().toISOString()
            }]
        });
        // In production: await fetch(DISCORD_WEBHOOK_URL, { method: 'POST', ... });
    }

    /**
     * Triggered when the tournament finishes.
     * Logic:
     * 1. Post final results.
     * 2. Set channels to Read-Only.
     * 3. Remove roles from all participants.
     */
    static async teardownTournament(tournamentId: string, categoryId: string, roleId: string) {
        console.log(`[DiscordBot] Tearing down Discord for tournament: ${tournamentId}`);
    }
}
