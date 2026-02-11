"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePilotMode(settings: { enabled: boolean, threshold: number }) {
    const supabase = await createClient();
    const { error } = await supabase.from('platform_settings').upsert({
        key: 'burn_master_pilot_mode',
        value: settings,
        updated_at: new Date().toISOString()
    });
    
    if (!error) revalidatePath('/admin/mission-control');
    return { success: !error, error };
}

export async function getPilotMode() {
    const supabase = await createClient();
    const { data } = await supabase.from('platform_settings').select('value').eq('key', 'burn_master_pilot_mode').single();
    return data?.value || { enabled: false, threshold: 0.30 };
}

export async function forceBurnCycle() {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('admin_force_burn_cycle');
    if (!error) revalidatePath('/admin/mission-control');
    return { success: !error, data, error };
}
