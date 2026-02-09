// Supabase Edge Function: process-email-queue
// Processes pending emails from the email_queue table and sends them via Resend API.
//
// Required secrets (set via Supabase Dashboard or CLI):
//   RESEND_API_KEY  - Your Resend API key
//   RESEND_FROM     - Sender email (e.g., "Duels Esports <noreply@duelsesports.com>")
//
// Deploy with: supabase functions deploy process-email-queue --no-verify-jwt
//
// @ts-nocheck - Deno types not available in Node.js environment

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Duels Esports <noreply@duelsesports.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRow {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  html_body: string;
  status: string;
  type: string | null;
  metadata: Record<string, unknown> | null;
  retry_count: number;
}

async function sendWithResend(email: EmailRow): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: email.to_email,
      subject: email.subject,
      html: email.html_body,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data?.message || JSON.stringify(data) };
  }

  return { success: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if a specific email ID was passed (for immediate sending)
    let emailIdFilter: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        emailIdFilter = body?.emailId || null;
      } catch {
        // No body, process all pending
      }
    }

    // Fetch pending emails (max 10 per run)
    let query = supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("retry_count", 3)
      .order("created_at", { ascending: true })
      .limit(10);

    if (emailIdFilter) {
      query = supabase
        .from("email_queue")
        .select("*")
        .eq("id", emailIdFilter)
        .eq("status", "pending");
    }

    const { data: emails, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching email queue:", fetchError);
      return new Response(
        JSON.stringify({ error: "Error al obtener la cola de emails" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No hay emails pendientes", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${emails.length} pending email(s) via Resend...`);

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const email of emails as EmailRow[]) {
      // Mark as sending
      await supabase
        .from("email_queue")
        .update({ status: "sending" })
        .eq("id", email.id);

      const { success, error } = await sendWithResend(email);

      if (success) {
        await supabase
          .from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", email.id);

        results.sent++;
        console.log(`✅ Email sent to ${email.to_email} (${email.type})`);
      } else {
        await supabase
          .from("email_queue")
          .update({
            status: email.retry_count >= 2 ? "failed" : "pending",
            retry_count: email.retry_count + 1,
            error_message: error,
          })
          .eq("id", email.id);

        results.failed++;
        results.errors.push(`${email.to_email}: ${error}`);
        console.error(`❌ Failed: ${email.to_email} - ${error}`);
      }
    }

    return new Response(
      JSON.stringify({ message: `Procesados ${emails.length} email(s)`, ...results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
