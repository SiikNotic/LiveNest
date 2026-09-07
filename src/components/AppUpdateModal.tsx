import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { DownloadCloud, AlertCircle } from "lucide-react";
import { checkForUpdate, type UpdateInfo } from "../lib/appUpdate";
import { ApkUpdater } from "../lib/apkUpdater";
import { useI18n, type TranslationKey } from "../lib/i18n";

// GitHub siempre genera este encabezado en inglés, sea cual sea el idioma
// de la app — es el único texto fijo y predecible que produce
// generate_release_notes, así que vale la pena traducirlo a mano.
const KNOWN_HEADING_KEY: Record<string, TranslationKey> = {
  "What's Changed": "app_update_whats_changed",
};

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

type Phase = "idle" | "need-permission" | "downloading" | "installing" | "error";

/** Montado una sola vez en main.tsx, fuera de <App /> — así se ve encima de
 *  cualquier pantalla (incluida la de login). No hace nada en la web:
 *  checkForUpdate() ya devuelve null ahí.
 *
 *  El APK se descarga DENTRO de la app (ApkUpdater, un plugin nativo propio
 *  — ver android/app/src/main/java/net/livenest/app/ApkUpdaterPlugin.java),
 *  nunca abriendo el navegador del sistema. Lo único que Android NUNCA deja
 *  saltear, venga de donde venga la APK, es la confirmación de instalación
 *  una vez que la descarga termina — no hay forma de instalar en un solo
 *  toque sin pasar por Google Play (ver ANDROID.md), así que install() solo
 *  abre ese instalador nativo y de ahí en más el control es de Android. */
export function AppUpdateModal() {
  const t = useI18n((s) => s.t);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const run = () => {
      checkForUpdate().then((info) => {
        if (info) setUpdate(info);
      });
      // Red de seguridad: install() ya cierra el modal solo apenas Android
      // confirma que abrió su instalador (ver startDownload), pero si esa
      // llamada quedara colgada por lo que sea, volver a esta pantalla —
      // algo que solo pasa si la instalación NO se completó, porque una
      // instalación real mata este proceso — no debe dejar a la persona
      // mirando "abriendo el instalador..." para siempre sin poder hacer
      // nada.
      setPhase((p) => (p === "installing" ? "idle" : p));
    };
    run();

    // También al volver del segundo plano — es el momento más común en que
    // alguien reabre la app después de que salió un build nuevo (o vuelve
    // de Ajustes tras activar "instalar apps desconocidas").
    let handle: { remove: () => void } | undefined;
    CapacitorApp.addListener("resume", run).then((h) => {
      handle = h;
    });
    return () => handle?.remove();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => void } | undefined;
    ApkUpdater.addListener("downloadProgress", ({ percent }) => {
      if (percent >= 0) setProgress(percent);
    }).then((h) => {
      handle = h;
    });
    return () => handle?.remove();
  }, []);

  async function startDownload() {
    if (!update) return;
    setProgress(0);
    setPhase("downloading");
    try {
      const { path } = await ApkUpdater.download({ url: update.downloadUrl });
      setPhase("installing");
      await ApkUpdater.install({ path });
      // A partir de acá Android muestra su propio instalador de paquetes
      // encima de todo — no hay ninguna señal confiable que la app pueda
      // escuchar para saber si la persona terminó de instalar o canceló
      // (si instala de verdad, Android mata este proceso igual, así que
      // no hace falta seguir mostrando nada). Por eso el modal se cierra
      // solo acá en vez de quedarse congelado en "instalando" para
      // siempre — si canceló y vuelve a la app, se encuentra LiveNest
      // normal, y el próximo chequeo (al reabrir o volver del segundo
      // plano) le vuelve a ofrecer la actualización.
      setDismissed(true);
    } catch {
      setPhase("error");
    }
  }

  async function handleDownloadClick() {
    const { value: allowed } = await ApkUpdater.canInstallPackages();
    if (!allowed) {
      setPhase("need-permission");
      return;
    }
    await startDownload();
  }

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

          {notes.length > 0 && phase === "idle" && (
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

          {phase === "idle" && (
            <>
              <p className="text-[11px] text-muted mb-4">{t("app_update_downloading_hint")}</p>
              <div className="flex gap-2">
                <button onClick={() => setDismissed(true)} className="btn-ghost flex-1 text-sm justify-center">
                  {t("app_update_later")}
                </button>
                <button onClick={handleDownloadClick} className="btn-primary flex-1 text-sm justify-center">
                  {t("app_update_button")}
                </button>
              </div>
            </>
          )}

          {phase === "need-permission" && (
            <>
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-warning-400/10 border border-warning-400/20 text-warning-400 text-xs mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{t("app_update_need_permission_desc")}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDismissed(true)} className="btn-ghost flex-1 text-sm justify-center">
                  {t("app_update_later")}
                </button>
                <button onClick={() => ApkUpdater.openUnknownSourceSettings()} className="btn-primary flex-1 text-sm justify-center">
                  {t("app_update_open_settings")}
                </button>
              </div>
              {/* Volver de Ajustes dispara "resume", que solo vuelve a
                  chequear si hay actualización — a propósito no reintenta
                  la descarga sola (podría reabrir Ajustes en bucle si el
                  usuario canceló ahí). Hay que tocar esto de nuevo. */}
              <button
                onClick={handleDownloadClick}
                className="w-full text-center text-xs text-muted hover:text-text-soft mt-2.5 py-1"
              >
                {t("app_update_already_allowed")}
              </button>
            </>
          )}

          {phase === "downloading" && (
            <div className="mb-1">
              <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                <span>{t("app_update_progress_label")}</span>
                <span className="tabular-nums font-semibold text-text-soft">{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
                <div className="h-full bg-primary transition-all duration-150" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] text-muted-soft mt-2">{t("app_update_dont_close")}</p>
            </div>
          )}

          {phase === "installing" && <p className="text-xs text-muted text-center py-2">{t("app_update_installing")}</p>}

          {phase === "error" && (
            <>
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-error-400/10 border border-error-400/20 text-error-400 text-xs mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{t("app_update_error")}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDismissed(true)} className="btn-ghost flex-1 text-sm justify-center">
                  {t("app_update_later")}
                </button>
                <button onClick={handleDownloadClick} className="btn-primary flex-1 text-sm justify-center">
                  {t("app_update_retry")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
