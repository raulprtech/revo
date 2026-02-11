"use server";

import { createClient } from "@supabase/supabase-js";
import { analyzePlayerRetention } from "@/ai/profiler";

export async function runBulkRetentionAnalysis() {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Get all active users (limited to 50 for safety in this demo)
        const { data: users, error: userError } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .limit(50);

        if (userError) throw userError;

        const results = [];
        
        for (const user of users) {
            // 2. Fetch RFM metrics using the SQL function we created in the migration
            const { data: rfmData, error: rfmError } = await supabaseAdmin.rpc('calculate_player_rfm_metrics', {
                p_user_id: user.id
            });

            if (rfmError) continue;

            // 3. Analyze with AI
            const profile = await analyzePlayerRetention(user.id, rfmData);
            results.push({ user: user.email, status: profile ? 'success' : 'failed' });
        }

        return { success: true, count: results.length };
    } catch (error: any) {
        console.error("Bulk Analysis Error:", error);
        return { success: false, error: error.message };
    }
}
