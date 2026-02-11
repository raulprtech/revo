"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCosmetics() {
    const supabase = await createClient();
    const { data } = await supabase.from('cosmetic_items').select('*').order('created_at', { ascending: false });
    return data || [];
}

export async function upsertCosmetic(item: any) {
    const supabase = await createClient();
    const { error } = await supabase.from('cosmetic_items').upsert({
        ...item,
        updated_at: new Date().toISOString()
    });
    
    if (!error) revalidatePath('/admin/mission-control/cosmetics');
    return { success: !error, error };
}

export async function deleteCosmetic(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('cosmetic_items').delete().eq('id', id);
    
    if (!error) revalidatePath('/admin/mission-control/cosmetics');
    return { success: !error, error };
}

export async function updatePilotMode(settings: { enabled: boolean, threshold: number }) {
    const supabase = await createClient();
    const { error } = await supabase.from('platform_settings').upsert({
        key: 'burn_master_pilot_mode',
        value: settings,
        updated_at: new Date().toISOString()
    });
    return { success: !error, error };
}

export async function getPilotMode() {
    const supabase = await createClient();
    const { data } = await supabase.from('platform_settings').select('value').eq('key', 'burn_master_pilot_mode').single();
    return data?.value || { enabled: false, threshold: 0.30 };
}
