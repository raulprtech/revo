/**
 * POST /api/coins/cosmetics-batch — Get equipped cosmetics for multiple users
 * Body: { emails: string[] }
 * Returns: Record<email, { bracketFrame, nicknameColor, avatarCollection }>
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { emails } = await request.json();

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({});
    }

    // Deduplicate & limit to 128 emails
    const uniqueEmails = [...new Set(emails as string[])].slice(0, 128);

    const supabase = createClient();

    // Fetch all equipped cosmetics for these users in one query
    const { data, error } = await supabase
      .from('user_cosmetics')
      .select('user_email, is_equipped, item:cosmetic_items(category, metadata)')
      .in('user_email', uniqueEmails)
      .eq('is_equipped', true)
      .in('item.category', ['bracket_frame', 'nickname_color', 'avatar_collection']);

    if (error) {
      console.error('Error fetching batch cosmetics:', error);
      return NextResponse.json({});
    }

    // Build the cosmetics map
    const cosmeticsMap: Record<string, {
      bracketFrame?: Record<string, unknown> | null;
      nicknameColor?: Record<string, unknown> | null;
      avatarCollection?: Record<string, unknown> | null;
    }> = {};

    for (const row of data || []) {
      const item = row.item as unknown as { category: string; metadata: Record<string, unknown> } | null;
      if (!item || !item.category) continue;

      const email = row.user_email;
      if (!cosmeticsMap[email]) {
        cosmeticsMap[email] = {};
      }

      switch (item.category) {
        case 'bracket_frame':
          cosmeticsMap[email].bracketFrame = item.metadata;
          break;
        case 'nickname_color':
          cosmeticsMap[email].nicknameColor = item.metadata;
          break;
        case 'avatar_collection':
          cosmeticsMap[email].avatarCollection = item.metadata;
          break;
      }
    }

    return NextResponse.json(cosmeticsMap);
  } catch (error) {
    console.error('Error in cosmetics-batch:', error);
    return NextResponse.json({});
  }
}
