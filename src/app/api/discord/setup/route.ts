
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DiscordBotService } from '@/lib/discord-bot-service';

export async function POST(req: Request) {
  const supabase = await createClient();
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tournamentId, tournamentName } = await req.json();

    if (!tournamentId || !tournamentName) {
      return NextResponse.json({ error: 'tournamentId and tournamentName are required' }, { status: 400 });
    }

    // Call the real Discord Bot service for provisioning
    console.log(`[Discord API] Setting up Discord for ${tournamentName} (${tournamentId})`);

    const tournament = { id: tournamentId, name: tournamentName } as any;
    const discordData = await DiscordBotService.setupTournamentDiscord(tournament);

    if (!discordData) {
        return NextResponse.json({ error: 'Failed to provision Discord infrastructure. Check bot configuration.' }, { status: 500 });
    }

    // Update the tournament in the database with real Discord IDs
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({
        discord_category_id: discordData.categoryId,
        discord_role_id: discordData.roleId,
        discord_settings: {
          auto_create: true,
          sync_roles: true,
          channels: discordData.channels
        }
      })
      .eq('id', tournamentId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      ...discordData
    });

  } catch (error: any) {
    console.error('Discord Setup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
