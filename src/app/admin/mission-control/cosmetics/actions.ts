"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCosmetics() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('cosmetic_items')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error("[getCosmetics]", error.message);
            return [];
        }
        return data || [];
    } catch (err: any) {
        console.error("[getCosmetics] unexpected:", err.message);
        return [];
    }
}

export async function upsertCosmetic(item: {
    id?: string;
    name: string;
    slug: string;
    price: number;
    rarity: string;
    stock: number;
    category?: string;
}) {
    try {
        const supabase = await createClient();

        const payload: Record<string, unknown> = {
            name: item.name,
            slug: item.slug,
            price: item.price,
            rarity: item.rarity || 'common',
            stock: item.stock ?? -1,
            category: item.category || 'general',
        };
        if (item.id) payload.id = item.id;

        const { error } = await supabase.from('cosmetic_items').upsert(payload);

        if (error) {
            console.error("[upsertCosmetic]", error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/admin/mission-control');
        return { success: true, error: null };
    } catch (err: any) {
        console.error("[upsertCosmetic] unexpected:", err.message);
        return { success: false, error: err.message };
    }
}

export async function deleteCosmetic(id: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from('cosmetic_items').delete().eq('id', id);

        if (error) {
            console.error("[deleteCosmetic]", error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/admin/mission-control');
        return { success: true, error: null };
    } catch (err: any) {
        console.error("[deleteCosmetic] unexpected:", err.message);
        return { success: false, error: err.message };
    }
}
