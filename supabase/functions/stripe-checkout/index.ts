import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRICE_MAP: Record<string, { label: string; days: number | null }> = {
  "7": { label: "7", days: 7 },
  "30": { label: "30", days: 30 },
  "365": { label: "365", days: 365 },
  lifetime: { label: "lifetime", days: null },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe no está configurado. El administrador debe configurar STRIPE_SECRET_KEY en los secrets de Supabase." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { priceId, userId, duration } = await req.json();

    if (!priceId || !userId || !duration) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros: priceId, userId, duration" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = PRICE_MAP[duration];
    if (!config) {
      return new Response(
        JSON.stringify({ error: "Duración no válida. Usa: 7, 30, 365, o lifetime" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const Stripe = (await import("npm:stripe@17.3.1")).default;
    const stripe = new Stripe(stripeSecretKey);

    const origin = req.headers.get("origin") || "https://wlkzpvfkczkrvuueblfq.supabase.co";

    const session = await stripe.checkout.sessions.create({
      mode: duration === "lifetime" ? "payment" : "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: {
        user_id: userId,
        duration_label: config.label,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
