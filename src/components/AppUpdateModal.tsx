import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { DownloadCloud } from "lucide-react";
import { checkForUpdate, type UpdateInfo } from "../lib/appUpdate";
import { useI18n, type TranslationKey } from "../lib/i18n";

// GitHub siempre genera este encabezado en inglés, sea cual sea el idioma
// de la app — es el único texto fijo y predecible que produce
// generate_release_notes, así que vale la pena traducirlo a mano.
const KNOWN_HEADING_KEY: Record<string, TranslationKey> = {
  "What's Changed": "app_update_whats_changed",
};

// Cuánto esperar antes de arrancar la descarga sola, para que la persona
// llegue a ver el modal (título + qué cambió) antes de que la navegación
// externa se dispare.
const DOWNLOAD_AUTOSTART_DELAY_MS = 900;

// build-android.yml genera el body de la release con
// `generate_release_notes: true` de GitHub — Markdown simple, solo
// encabezados "## " y viñetas "* mensaje by @usuario in <link>". Alcanza
// con este mini-parser, no hace falta una librería de Markdown completa
// para mostrarlo bien.
function parseReleaseNotes(raw: string): { heading: boolean; text: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("**Full Changelog**"))
    .map((line) => {
      if (line.startsWith("## ")) return { heading: true, text: line.slice(3) };
      const bulletText = line.replace(/^[*-]\s*/, "");
      // "mensaje de commit by @usuario in https://github.com/.../commit/sha"
      // → se queda solo con el mensaje, sin el link ni el autor.
      const clean = bulletText.replace(/\s+by\s+@[\w-]+\s+in\s+https?:\/\/\S+$/i, "");
      return { heading: false, text: clean };
    });
}

/** Montado una sola vez en main.tsx, fuera de <App /> — así se ve encima de
 *  cualquier pantalla (incluida la de login). No hace nada en la web:
 *  checkForUpdate() ya devuelve null ahí.
 *
 *  La descarga arranca sola (navegación a un dominio externo que Capacitor
 *  le pasa al navegador del sistema) apenas se detecta la actualización —
 *  no hace falta tocar nada para que empiece. Lo único que Android NUNCA
 *  deja saltear, venga de donde venga la APK, es la confirmación de
 *  instalación una vez que la descarga termina — no hay forma de instalar
 *  en un solo toque sin pasar por Google Play (ver ANDROID.md), así que el
 *  botón de abajo es un respaldo por si la navegación automática no llegó
 *  a dispararse (algún WebView más viejo, por ejemplo), no un segundo paso
 *  obligatorio. */
export function AppUpdateModal() {
  const t = useI18n((s) => s.t);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const autoStarted = useRef(false);

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

  useEffect(() => {
    if (!update || autoStarted.current) return;
    autoStarted.current = true;
    const timer = setTimeout(() => {
      window.location.href = update.downloadUrl;
    }, DOWNLOAD_AUTOSTART_DELAY_MS);
    return () => clearTimeout(timer);
  }, [update]);

  if (!update || dismissed) return null;

  const notes = parseReleaseNotes(update.notes);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card max-w-sm w-full !p-0 overflow-hidden shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <DownloadCloud className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold">{t("app_update_title")}</h2>
              <p className="text-xs text-muted">{t("app_update_build_label", { build: update.build })}</p>
            </div>
          </div>

          {notes.length > 0 && (
            <div className="max-h-48 overflow-y-auto scrollbar-thin rounded-xl bg-bg-soft border border-border p-3 mb-4 space-y-1.5">
              {notes.map((line, i) =>
                line.heading ? (
                  <p key={i} className="text-[11px] font-bold text-primary uppercase tracking-wide pt-1 first:pt-0">
                    {KNOWN_HEADING_KEY[line.text] ? t(KNOWN_HEADING_KEY[line.text]) : line.text}
                  </p>
                ) : (
                  <p key={i} className="text-xs text-text-soft flex gap-1.5">
                    <span className="text-muted">•</span> <span className="flex-1">{line.text}</span>
                  </p>
                )
              )}
            </div>
          )}

          <p className="text-[11px] text-muted mb-4">{t("app_update_downloading_hint")}</p>

          <div className="flex gap-2">
            <button onClick={() => setDismissed(true)} className="btn-ghost flex-1 text-sm justify-center">
              {t("app_update_later")}
            </button>
            <a href={update.downloadUrl} className="btn-primary flex-1 text-sm justify-center">
              {t("app_update_button")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
