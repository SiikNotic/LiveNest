import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface DownloadProgress {
  bytesRead: number;
  totalBytes: number;
  // -1 si el servidor no mandó Content-Length (no debería pasar con los
  // assets de una GitHub Release, pero por las dudas).
  percent: number;
}

export interface ApkUpdaterPlugin {
  /** true si LiveNest ya tiene permiso para instalar APKs (siempre true en
   *  Android <8, que no tenía este permiso por-app — ver ApkUpdaterPlugin.java). */
  canInstallPackages(): Promise<{ value: boolean }>;
  /** Abre la pantalla de Ajustes de Android donde el usuario activa
   *  "Instalar apps desconocidas" para LiveNest — no existe forma de
   *  otorgar ese permiso por código, hay que llevarlo ahí. */
  openUnknownSourceSettings(): Promise<void>;
  /** Descarga el APK a la carpeta de caché privada de la app (nunca al
   *  navegador). Emite eventos "downloadProgress" mientras dura. */
  download(options: { url: string }): Promise<{ path: string }>;
  /** Abre el instalador de paquetes del sistema para el APK ya descargado
   *  — Android sigue pidiendo la confirmación final de instalar/
   *  actualizar, eso nunca se puede saltear (ni se intenta acá). */
  install(options: { path: string }): Promise<void>;
  addListener(eventName: "downloadProgress", listenerFunc: (progress: DownloadProgress) => void): Promise<PluginListenerHandle>;
}

// Plugin nativo propio (ver android/app/src/main/java/net/livenest/app/ApkUpdaterPlugin.java)
// — sin implementación web: solo lo usa AppUpdateModal, que ya únicamente
// se activa dentro de la app nativa de Android (ver Capacitor.isNativePlatform()
// en checkForUpdate(), en este mismo directorio).
export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>("ApkUpdater");
