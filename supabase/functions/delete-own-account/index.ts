// Permite que un usuario autenticado borre su PROPIA cuenta al 100% —
// distinto de delete-user (que solo el Owner puede usar, para borrar la
// cuenta de otra persona). Borra el usuario de Supabase Auth, lo que
// cascada (ver la migración fix_user_data_cascade_and_trial_abuse) hacia
// profiles y absolutamente todo lo que depende de ahí: settings,
// filters, templates, live_events, song_requests, saved_channels,
// user_licenses, tts_usage, music_playlists (y sus canciones).
//
// El email NO se borra de ningún lado: used_trial_emails ya lo guardó
// desde el momento en que se le otorgó la prueba gratis (ver
// handle_new_user), no en este paso — así que evitar que la misma
// persona vuelva a registrarse para conseguir otros 7 días gratis sigue
// funcionando aunque este borrado falle a mitad de camino.
//
// Si la cuenta tiene una suscripción de Stripe activa, se cancela DE
// INMEDIATO acá (no "al final del período", como hace la cancelación
// normal desde Mi cuenta) — una vez borrada la cuenta no queda forma de
// volver a entrar para cancelarla, así que dejarla corriendo seguiría
// cobrando por un servicio que ya no existe. Si Stripe no confirma la
// cancelación, se corta todo el flujo ANTES de borrar nada — mejor una
// cuenta que sigue viva por un error transitorio de red que un cliente
// al que le siguen cobrando sin poder hacer nada al respecto.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente con el JWT del que llama — solo para confirmar quién es y
    // leer su propia licencia. Nunca recibe un userId por body: la cuenta
    // a borrar es siempre "la de quien llama", tomada del JWT.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: license } = await callerClient
      .from("user_licenses")
      .select("stripe_subscription_id, status, source")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (license?.source === "stripe" && license.stripe_subscription_id) {
      const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeSecretKey) {
        return new Response(
          JSON.stringify({ error: "No se pudo cancelar tu suscripción de Stripe (Stripe no está configurado). Cancelala desde Mi cuenta y volvé a intentar." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      try {
        const Stripe = (await import("npm:stripe@17.3.1")).default;
        const stripe = new Stripe(stripeSecretKey);
        // Cancelación inmediata (no cancel_at_period_end): la cuenta y
        // todos sus datos están a punto de desaparecer, no tiene sentido
        // seguir facturando un servicio que ya nadie puede usar ni cancelar.
        await stripe.subscriptions.cancel(license.stripe_subscription_id);
      } catch (stripeErr) {
        return new Response(
          JSON.stringify({ error: `No se pudo cancelar tu suscripción de Stripe: ${stripeErr instanceof Error ? stripeErr.message : "error desconocido"}. Tu cuenta NO fue borrada.` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Cliente con el service role — el único que puede borrar usuarios de
    // Auth. Nunca se expone al navegador.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
