import { useEffect, useState } from "react";
import { getTrackingConsent, setTrackingConsent, initializeTracking, type TrackingConsent } from "../lib/privacyAnalytics";
import { useI18n } from "../lib/i18n";

export function TrackingConsentBanner() {
  const { lang } = useI18n();
  const [consent, setConsent] = useState<TrackingConsent | null>(() => getTrackingConsent());

  useEffect(() => {
    initializeTracking();
    const onConsent = (event: Event) => {
      const value = (event as CustomEvent<TrackingConsent>).detail;
      setConsent(value);
      if (value === "accepted") initializeTracking();
    };
    window.addEventListener("livenest:tracking-consent", onConsent);
    return () => window.removeEventListener("livenest:tracking-consent", onConsent);
  }, []);

  if (consent) return null;

  const es = lang === "es";

  return (
    <div
      role="dialog"
      aria-label={es ? "Preferencias de privacidad" : "Privacy preferences"}
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border p-4 shadow-2xl backdrop-blur-xl"
      style={{ background: "rgba(12,12,16,0.96)", borderColor: "var(--ln-border, rgba(255,255,255,0.12))" }}
    >
      <p className="text-sm font-semibold text-white">
        {es ? "Tu privacidad importa" : "Your privacy matters"}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--ln-ash, #aaa)" }}>
        {es
          ? "Usamos Google Analytics, Microsoft Clarity y Meta Pixel para entender el uso de la web y mejorar LiveNest. No los cargamos hasta que aceptes."
          : "We use Google Analytics, Microsoft Clarity, and Meta Pixel to understand website usage and improve LiveNest. They stay disabled until you accept."}
      </p>
      <p className="mt-2 text-[11px]" style={{ color: "var(--ln-smoke, #777)" }}>
        {es ? "Consulta la Política de Privacidad para más información." : "See the Privacy Policy for more information."}{" "}
        <a className="underline hover:text-white" href="/privacy.html" target="_blank" rel="noopener noreferrer">
          {es ? "Ver política" : "View policy"}
        </a>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTrackingConsent("accepted")}
          className="rounded-xl px-4 py-2 text-xs font-bold text-black"
          style={{ background: "var(--ln-gold, #d89a16)" }}
        >
          {es ? "Aceptar" : "Accept"}
        </button>
        <button
          type="button"
          onClick={() => setTrackingConsent("rejected")}
          className="rounded-xl border px-4 py-2 text-xs font-semibold text-white"
          style={{ borderColor: "var(--ln-border, rgba(255,255,255,0.12))" }}
        >
          {es ? "Rechazar" : "Reject"}
        </button>
      </div>
    </div>
  );
}
