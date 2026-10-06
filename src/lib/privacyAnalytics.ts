export type TrackingConsent = "accepted" | "rejected";

const CONSENT_KEY = "livenest-tracking-consent";

function isNativeLike(): boolean {
  return typeof window !== "undefined" && (window.location.protocol === "capacitor:" || window.location.protocol === "file:");
}

export function getTrackingConsent(): TrackingConsent | null {
  if (typeof window === "undefined" || isNativeLike()) return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch { return null; }
}

export function setTrackingConsent(value: TrackingConsent): void {
  if (typeof window === "undefined" || isNativeLike()) return;
  try { window.localStorage.setItem(CONSENT_KEY, value); } catch {}
  window.dispatchEvent(new CustomEvent("livenest:tracking-consent", { detail: value }));
}

export function isTrackingAllowed(): boolean { return getTrackingConsent() === "accepted"; }

function injectScript(src: string, id: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function loadGoogleAnalytics(measurementId: string): void {
  if (!measurementId) return;
  const w = window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = w.gtag || ((...args: unknown[]) => { w.dataLayer!.push(args); });
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`, "livenest-ga-script");
  w.gtag("js", new Date());
  w.gtag("config", measurementId, { anonymize_ip: true });
}

function loadMicrosoftClarity(projectId: string): void {
  if (!projectId || document.getElementById("livenest-clarity-script")) return;
  const script = document.createElement("script");
  script.id = "livenest-clarity-script";
  script.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(projectId)});`;
  document.head.appendChild(script);
}

function loadMetaPixel(pixelId: string): void {
  if (!pixelId || (window as typeof window & { fbq?: unknown }).fbq) return;
  const w = window as typeof window & { fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string }; _fbq?: unknown };
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  }) as typeof w.fbq & { callMethod?: (...args: unknown[]) => void };
  fbq!.queue = []; fbq!.loaded = true; fbq!.version = "2.0";
  w.fbq = fbq; w._fbq = fbq;
  injectScript("https://connect.facebook.net/en_US/fbevents.js", "livenest-meta-script");
  fbq!("init", pixelId); fbq!("track", "PageView");
}

export function initializeTracking(): void {
  if (!isTrackingAllowed() || typeof window === "undefined" || isNativeLike()) return;
  loadGoogleAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID || "");
  loadMicrosoftClarity(import.meta.env.VITE_CLARITY_PROJECT_ID || "");
  loadMetaPixel(import.meta.env.VITE_META_PIXEL_ID || "");
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!isTrackingAllowed() || typeof window === "undefined") return;
  const w = window as typeof window & { gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void };
  w.gtag?.("event", name, params ?? {});
  w.fbq?.("trackCustom", name, params ?? {});
}
