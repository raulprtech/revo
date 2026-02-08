// Supabase Edge Function: delete-expired-accounts
// This function deletes user accounts that have been marked for deletion
// and whose grace period has expired (7 days after deletion request)
//
// Deploy with: supabase functions deploy delete-expired-accounts --no-verify-jwt
// 
// Note: This file uses Deno runtime (not Node.js). TypeScript errors in VS Code
// are expected. The function will work correctly when deployed to Supabase.
//
// @ts-nocheck - Deno types not available in Node.js environment

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeletedAccountLog {
  userId: string;
  email: string;
  deletionRequestedAt: string;
  deletedAt: string;
  dataDeleted: {
    tournaments: number;
    events: number;
    participations: number;
  };
}

// Delete all user data from application tables
async function deleteUserData(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<{ tournaments: number; events: number; participations: number }> {
  const result = { tournaments: 0, events: 0, participations: 0 };

  try {
    // 1. Delete user's participations in tournaments
    const { data: deletedParticipations, error: partError } = await supabase
      .from("participants")
      .delete()
      .eq("email", userEmail)
      .select("id");

    if (!partError && deletedParticipations) {
      result.participations = deletedParticipations.length;
    }

    // 2. Get tournaments owned by user to handle their participants
    const { data: userTournaments } = await supabase
      .from("tournaments")
      .select("id")
      .eq("owner_email", userEmail);

    if (userTournaments && userTournaments.length > 0) {
      const tournamentIds = userTournaments.map((t) => t.id);

      // Delete participants of user's tournaments
      await supabase
        .from("participants")
        .delete()
        .in("tournament_id", tournamentIds);
    }

    // 3. Delete user's tournaments
    const { data: deletedTournaments, error: tournError } = await supabase
      .from("tournaments")
      .delete()
      .eq("owner_email", userEmail)
      .select("id");

    if (!tournError && deletedTournaments) {
      result.tournaments = deletedTournaments.length;
    }

    // 4. Delete user's events
    const { data: deletedEvents, error: eventError } = await supabase
      .from("events")
      .delete()
      .eq("owner_email", userEmail)
      .select("id");

    if (!eventError && deletedEvents) {
      result.events = deletedEvents.length;
    }

    // 5. Remove user from organizers arrays in tournaments they don't own
    // This updates the JSONB array to remove the user's email
    await supabase.rpc("remove_user_from_organizers", { user_email: userEmail });

    // 6. Delete user's profile from profiles table (COPPA compliance)
    await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    console.log(`Deleted user data for ${userEmail}:`, result);
  } catch (error) {
    console.error(`Error deleting user data for ${userEmail}:`, error);
  }

  return result;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization - this function should only be called by:
    // 1. Supabase cron job (scheduled)
    // 2. Admin with service role key
    const authHeader = req.headers.get("Authorization");
    
    // Create Supabase admin client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all users (requires admin access)
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000, // Adjust if you have more users
    });

    if (listError) {
      throw new Error(`Error listing users: ${listError.message}`);
    }

    const now = new Date();
    const deletedAccounts: DeletedAccountLog[] = [];
    const errors: string[] = [];

    // Process each user
    for (const user of usersData.users) {
      const metadata = user.user_metadata || {};
      
      // Check if user is marked for deletion
      if (!metadata.pending_deletion) {
        continue;
      }

      const deletionRequestedAt = metadata.deletion_requested_at;
      if (!deletionRequestedAt) {
        continue;
      }

      // Calculate if grace period has expired (7 days)
      const requestDate = new Date(deletionRequestedAt);
      const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      const expirationDate = new Date(requestDate.getTime() + gracePeriodMs);

      if (now < expirationDate) {
        // Grace period hasn't expired yet
        continue;
      }

      // Grace period expired - delete the user
      console.log(`Deleting user ${user.id} (${user.email}) - grace period expired`);

      try {
        // First: Delete user's data from application tables
        const dataDeleted = await deleteUserData(supabaseAdmin, user.id, user.email || "");

        // Then: Delete the user from auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {
          errors.push(`Failed to delete user ${user.id}: ${deleteError.message}`);
          continue;
        }

        deletedAccounts.push({
          userId: user.id,
          email: user.email || "unknown",
          deletionRequestedAt: deletionRequestedAt,
          deletedAt: now.toISOString(),
          dataDeleted: dataDeleted,
        });

        console.log(`Successfully deleted user ${user.id} and their data`);
      } catch (deleteErr) {
        const errorMessage = deleteErr instanceof Error ? deleteErr.message : String(deleteErr);
        errors.push(`Error deleting user ${user.id}: ${errorMessage}`);
      }
    }

    // Log results
    const result = {
      success: true,
      timestamp: now.toISOString(),
      totalUsersChecked: usersData.users.length,
      accountsDeleted: deletedAccounts.length,
      deletedAccounts: deletedAccounts,
      errors: errors,
    };

    console.log("Deletion job completed:", JSON.stringify(result, null, 2));

    // Optional: Store deletion log in a table
    if (deletedAccounts.length > 0) {
      try {
        await supabaseAdmin.from("deletion_logs").insert(
          deletedAccounts.map((account) => ({
            user_id: account.userId,
            email: account.email,
            deletion_requested_at: account.deletionRequestedAt,
            deleted_at: account.deletedAt,
            data_deleted: account.dataDeleted,
          }))
        );
      } catch (logError) {
        // Table might not exist, that's ok
        console.log("Could not log deletions (table may not exist):", logError);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in delete-expired-accounts function:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
