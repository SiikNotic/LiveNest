import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";

// Evita que la pantalla se bloquee sola mientras la app está conectada a un
// canal y leyendo el chat. Solo tiene efecto dentro de la app nativa de
// Android (Capacitor) — en el navegador es un no-op silencioso, así que este
// módulo se puede importar y llamar tranquilamente desde store.ts sin romper
// el build web ni requerir ningún chequeo extra en cada call site.
//
// Esto NO alcanza para que la voz siga leyendo con la pantalla ya apagada o
// la app minimizada del todo — para eso hace falta un foreground service
// nativo. Lo que sí resuelve: que la pantalla no se apague sola por
// inactividad mientras la persona tiene la app abierta y conectada, que era
// el caso más común de "se cortó la voz" en el celular.
const isNative = Capacitor.isNativePlatform();

export async function enableKeepAwake(): Promise<void> {
  if (!isNative) return;
  try {
    await KeepAwake.keepAwake();
  } catch {
    // Best-effort: si el plugin no está disponible por algún motivo, no
    // vale la pena romper la conexión por esto.
  }
}

export async function disableKeepAwake(): Promise<void> {
  if (!isNative) return;
  try {
    await KeepAwake.allowSleep();
  } catch {
    // Idem — best-effort.
  }
}
