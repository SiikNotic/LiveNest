import { Capacitor } from "@capacitor/core";

// Cada build de Android en CI (.github/workflows/build-android.yml) le pone
// este número (el run number de esa corrida de Actions) al bundle vía
// VITE_APP_BUILD, y publica una GitHub Release con tag "android-build-N"
// y la APK como asset. Este módulo compara el N con el que corre ahorita
// (import.meta.env.VITE_APP_BUILD) contra el de la última release pública
// — así la app se avisa sola si hay una versión más nueva, sin necesitar
// backend propio ni Google Play.
const GITHUB_RELEASES_LATEST_URL = "https://api.github.com/repos/SiikNotic/LiveNest/releases/latest";

const currentBuild = Number(import.meta.env.VITE_APP_BUILD ?? "0");

export type UpdateInfo = { build: number; downloadUrl: string };

/** Solo tiene sentido en la app nativa — el build web (GitHub Pages) no
 *  tiene "versión instalada" de la que actualizarse, se sirve siempre al
 *  toque. Devuelve null si no hay update, si currentBuild no está seteado
 *  (build local/dev), o si falla la consulta (sin conexión, rate limit de
 *  la API de GitHub, etc. — nunca vale la pena romper nada por esto). */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!Capacitor.isNativePlatform() || !currentBuild) return null;
  try {
    const res = await fetch(GITHUB_RELEASES_LATEST_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const match = /^android-build-(\d+)$/.exec(data.tag_name ?? "");
    if (!match) return null;
    const remoteBuild = Number(match[1]);
    if (remoteBuild <= currentBuild) return null;

    const asset = (data.assets ?? []).find((a: { name: string }) => a.name.endsWith(".apk"));
    if (!asset?.browser_download_url) return null;

    return { build: remoteBuild, downloadUrl: asset.browser_download_url };
  } catch {
    return null;
  }
}
