"use server";

import { createClient } from "@/lib/supabase/server";

export async function getIntelligenceMetrics(filters: any) {
    const supabase = await createClient();
    
    // 1. Fetch Heartbeat Data (Real platform activity)
    // We aggregate platform_heartbeat by hour/day depending on timeRange
    const { data: heartbeat, error: heartbeatError } = await supabase
        .from('platform_heartbeat')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(24);

    // 2. Fetch Velocity Stats
    const { data: velocity, error: velocityError } = await supabase
        .from('tournament_velocity_stats')
        .select('game_key, time_to_fill_seconds, conversion_rate, max_participants')
        .limit(10);

    // 3. Process Game Distribution
    const latestHeartbeat = heartbeat?.[0];
    const gameDist = latestHeartbeat?.game_distribution || {};
    const formattedGameDist = Object.entries(gameDist).map(([name, value]: [string, any]) => ({
        name,
        value,
        color: name === 'FIFA' ? '#0ea5e9' : name === 'KOF' ? '#f43f5e' : '#8b5cf6'
    }));

    // 4. Sponsor Engagement (From logs)
    const { data: engagement } = await supabase
        .from('sponsor_engagement_logs')
        .select('sponsor_name, interaction_type');
    
    const sponsorStats = engagement?.reduce((acc: any, curr: any) => {
        if (!acc[curr.sponsor_name]) acc[curr.sponsor_name] = { clicks: 0, impressions: 0 };
        if (curr.interaction_type === 'click_logo') acc[curr.sponsor_name].clicks++;
        if (curr.interaction_type === 'ad_impression') acc[curr.sponsor_name].impressions++;
        return acc;
    }, {});

    const formattedSponsors = Object.entries(sponsorStats || {}).map(([sponsor, stats]: [string, any]) => ({
        sponsor,
        clicks: stats.clicks,
        ctr: stats.impressions > 0 ? `${((stats.clicks / stats.impressions) * 100).toFixed(1)}%` : '0%',
        trend: 'up' // Simplified
    })).slice(0, 3);

    // If no data, return empty structures instead of mocks
    return {
        heartbeatData: heartbeat?.reverse().map(h => ({
            time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            users: h.active_users,
            matches: h.active_matches,
            segment: null
        })) || [],
        velocityStats: velocity?.map(v => ({
            name: v.game_key,
            fillTime: Math.floor(v.time_to_fill_seconds / 60) || 0,
            conversions: Math.floor(v.conversion_rate * 100) || 0,
            fillRate: Math.floor((v.time_to_fill_seconds > 0 ? 100 : 0))
        })) || [],
        gameDistribution: formattedGameDist.length > 0 ? formattedGameDist : [],
        sponsorEngagement: formattedSponsors.length > 0 ? formattedSponsors : [
            { sponsor: 'Waiting for data...', clicks: 0, ctr: '0%', trend: 'neutral' }
        ],
        platformStats: {
            sponsorValue: (engagement?.length || 0) * 0.5, // Simple formula
            platformHype: (latestHeartbeat?.active_tournaments || 0) > 5 ? 'HIGH' : 'NORMAL',
            concurrentEvents: latestHeartbeat?.active_tournaments || 0
        }
    };
}
