import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { DownloadCloud, X } from "lucide-react";
import { checkForUpdate, type UpdateInfo } from "../lib/appUpdate";
import { useI18n } from "../lib/i18n";

/** Montado una sola vez en main.tsx, fuera de <App /> — así se ve encima de
 *  cualquier pantalla (incluida la de login, que es la más probable que
 *  alguien tenga abierta un buen rato sin recargar). No hace nada en la
 *  web: checkForUpdate() ya devuelve null ahí. Tocar "Actualizar" abre la
 *  APK nueva en el navegador del sistema — Android la descarga y al tocar
 *  la notificación de descarga completa, instala. No hay forma de
 *  instalar en un solo toque sin pasar por Google Play (ver ANDROID.md). */
export function AppUpdateBanner() {
  const t = useI18n((s) => s.t);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const run = () => {
      checkForUpdate().then((info) => {
        if (info) setUpdate(info);
      });
    };
    run();

    // También al volver del segundo plano — es el momento más común en que
    // alguien reabre la app después de que salió un build nuevo.
    let handle: { remove: () => void } | undefined;
    CapacitorApp.addListener("resume", run).then((h) => {
      handle = h;
    });
    return () => handle?.remove();
  }, []);

  if (!update || dismissed) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-3 pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/30 backdrop-blur px-4 py-3 text-sm text-text shadow-lg">
        <DownloadCloud className="w-5 h-5 text-primary flex-shrink-0" />
        <span className="flex-1">{t("app_update_available")}</span>
        <a
          href={update.downloadUrl}
          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold whitespace-nowrap"
        >
          {t("app_update_button")}
        </a>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t("app_update_dismiss")}
          className="text-muted hover:text-text flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
