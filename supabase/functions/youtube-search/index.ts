const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/*
# YouTube Search Proxy

Endpoint: POST /youtube-search
Body: { "query": "bad bunny tití me preguntó" }

Busca canciones en YouTube desde el servidor para evitar el bloqueo CORS del navegador.
Devuelve { videoId, title, channel } de la primera coincidencia, o { not_found: true }.
*/

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método no permitido. Usa POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const query = String(body?.query ?? "").trim();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Falta el parámetro 'query'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `YouTube devolvió HTTP ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await res.text();

    const videoMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (!videoMatch) {
      return new Response(
        JSON.stringify({ not_found: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = videoMatch[1];
    const titleMatch = html.match(/"title":{"runs":\[{"text":"([^"]+)"/);
    const channelMatch = html.match(/"ownerText":\{"runs":\[\{"text":"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : query;
    const channel = channelMatch ? channelMatch[1] : "";

    return new Response(
      JSON.stringify({ videoId, title, channel }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
