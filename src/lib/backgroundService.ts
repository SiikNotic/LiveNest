import { Capacitor, registerPlugin } from "@capacitor/core";

// keepAwake.ts evita que la PANTALLA se apague sola, pero eso no alcanza
// para que el WebSocket de TikTok y la lectura por voz sigan funcionando
// con la app minimizada o la pantalla ya apagada — Android suspende el
// WebView segundos después en cualquiera de esos dos casos. Este módulo
// arranca/detiene un foreground service nativo propio (ver
// LiveNestForegroundService.java y BackgroundServicePlugin.java) que le da
// al proceso prioridad de primer plano, con un aviso persistente obligatorio
// ("LiveNest sigue conectada") mientras dura.
//
// Solo tiene efecto en la app nativa de Android — en la web es un no-op
// silencioso (un tab de navegador no puede hacer esto; cerrar/minimizar la
// pestaña corta la conexión igual, no hay forma de evitarlo desde el lado
// del sitio).
interface BackgroundServicePlugin {
  start(): Promise<{ started: boolean; notificationGranted: boolean }>;
  stop(): Promise<void>;
}

const BackgroundService = registerPlugin<BackgroundServicePlugin>("BackgroundService");
const isNative = Capacitor.isNativePlatform();

export async function startBackgroundService(): Promise<void> {
  if (!isNative) return;
  try {
    await BackgroundService.start();
  } catch {
    // Best-effort — si por lo que sea el servicio no arranca, no vale la
    // pena cortar la conexión por esto (sigue funcionando igual mientras la
    // app esté en primer plano).
  }
}

export async function stopBackgroundService(): Promise<void> {
  if (!isNative) return;
  try {
    await BackgroundService.stop();
  } catch {
    // Idem.
  }
}
