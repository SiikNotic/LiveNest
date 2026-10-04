import { Capacitor } from "@capacitor/core";

// En la app nativa de Android, el foreground service propio
// (ver backgroundService.ts) ya se encarga de que la conexión y la lectura
// sigan con la app minimizada — este módulo no hace nada ahí.
//
// En la WEB no existe nada parecido: Chrome/Firefox suspenden o throttlean
// agresivamente los timers (setInterval/setTimeout) de una pestaña en
// segundo plano — el heartbeat del WebSocket, la reconexión automática, todo
// eso se enlentece o directamente se congela, y ahí es donde se corta la
// lectura sin que la persona lo note hasta que vuelve a la pestaña (ver el
// comentario de visibilityHandler en tiktokConnection.ts).
//
// El único mecanismo real que tienen los navegadores para NO aplicar ese
// throttling a una pestaña en segundo plano es que esa pestaña esté
// reproduciendo audio de verdad — así es como siguen sonando de fondo
// YouTube Music o Spotify Web aunque cambies de pestaña. Por eso, mientras
// hay una conexión activa, este módulo reproduce un tono continuo,
// prácticamente inaudible (20Hz muy grave, casi fuera del rango que el oído
// humano y la mayoría de los parlantes reproducen, a volumen mínimo) — no es
// música de fondo, es la señal mínima que necesita el navegador para tratar
// la pestaña como "activa" y no congelarla.
//
// Esto no reemplaza al foreground service nativo: si se cierra la pestaña
// del todo (no solo minimizarla o cambiar de pestaña), el navegador mata el
// proceso igual que cualquier otra página — no hay forma de evitar eso desde
// el lado del sitio. Lo que sí resuelve: que la lectura siga funcionando
// mientras el navegador sigue abierto, aunque la pestaña esté minimizada,
// en segundo plano, o la pantalla del celular bloqueada (con el navegador
// de fondo).
const isNative = Capacitor.isNativePlatform();

let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;

export function startBackgroundAudio(username?: string): void {
  if (isNative || ctx || typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    gain = ctx.createGain();
    // Suficientemente por encima de cero para que cuente como "audio real"
    // ante el navegador, suficientemente bajo para que nadie lo note.
    gain.gain.value = 0.01;
    osc = ctx.createOscillator();
    osc.frequency.value = 20;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    // Por más que connect() lo llame síncrono dentro del mismo click, un
    // navegador particularmente estricto con su política de autoplay
    // podría igual arrancar el contexto en "suspended". Si pasa eso, se
    // reintenta resumirlo en la próxima interacción de la persona con la
    // página (que sí o sí cuenta como gesto de usuario válido).
    if (ctx.state === "suspended") {
      const resumeOnInteraction = () => {
        ctx?.resume().catch(() => {});
        document.removeEventListener("click", resumeOnInteraction);
        document.removeEventListener("keydown", resumeOnInteraction);
      };
      document.addEventListener("click", resumeOnInteraction);
      document.addEventListener("keydown", resumeOnInteraction);
    }

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "LiveNest",
          artist: username ? `Leyendo el chat de @${username}` : "Leyendo el chat en vivo",
        });
        navigator.mediaSession.playbackState = "playing";
      } catch {
        // Best-effort — algunos navegadores viejos no soportan MediaMetadata.
      }
    }
  } catch {
    // Best-effort: si el navegador bloquea el audio por política de
    // autoplay o lo que sea, no vale la pena romper la conexión por esto —
    // sigue funcionando igual mientras la pestaña esté en primer plano.
    ctx = null;
    osc = null;
    gain = null;
  }
}

export function stopBackgroundAudio(): void {
  if (!ctx) return;
  try {
    osc?.stop();
    void ctx.close();
  } catch {
    // ignore
  }
  ctx = null;
  osc = null;
  gain = null;
  if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
    try {
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.metadata = null;
    } catch {
      // ignore
    }
  }
}
