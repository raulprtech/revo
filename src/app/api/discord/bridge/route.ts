import { NextResponse } from 'next/server';

/**
 * DISCORD BRIDGE API
 * This route communicates directly with Discord's API using standard REST calls.
 * To use this, you must set DISCORD_BOT_TOKEN in your environment.
 */

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized Bridge Access' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, guildId } = body;

    switch (action) {
      case 'setup_tournament':
        return await handleSetupTournament(guildId, body.name);
      
      case 'assign_role':
        return await handleAssignRole(guildId, body.discordId, body.roleId);
      
      case 'send_message':
        return await handleSendMessage(body.channelId, body.content, body.embed);

      default:
        return NextResponse.json({ error: 'Action not supported' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Discord Bridge] Execution Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleSetupTournament(guildId: string, tournamentName: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const headers = {
    'Authorization': `Bot ${token}`,
    'Content-Type': 'application/json'
  };

  // 1. Create Role
  const roleRes = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: `🏆 ${tournamentName}`, color: 0x5865F2, hoist: true })
  });
  const role = await roleRes.json();

  // 2. Create Category
  const catRes = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: tournamentName, type: 4 }) // 4 = Category
  });
  const category = await catRes.json();

  // 3. Create Channels under Category
  const channels = ['📢-anuncios', '💬-chat-general', '🆘-soporte'];
  const channelIds: Record<string, string> = {};

  for (const name of channels) {
    const chRes = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        name, 
        type: 0, // 0 = Text
        parent_id: category.id 
      })
    });
    const ch = await chRes.json();
    channelIds[name.split('-')[1]] = ch.id;
  }

  return NextResponse.json({
    categoryId: category.id,
    roleId: role.id,
    channels: channelIds
  });
}

async function handleAssignRole(guildId: string, userId: string, roleId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`;
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `Bot ${token}` }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Discord Role Assign Failed: ${JSON.stringify(err)}`);
  }

  return NextResponse.json({ success: true });
}

async function handleSendMessage(channelId: string, content: string, embed?: any) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content, embeds: embed ? [embed] : [] })
  });

  return NextResponse.json(await res.json());
}
