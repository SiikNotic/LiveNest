import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useI18n, type Lang, type TranslationKey } from "../lib/i18n";
import { MEMBERSHIP_PRICE_LABEL } from "../lib/stripeConfig";
import {
  Mic, Bell, Music, Shield, Globe, SlidersHorizontal,
  Check, Download, Smartphone, ChevronDown,
} from "lucide-react";

// Página de bienvenida para quien todavía no inició sesión — antes se iba
// derecho a AuthView, sin nada que explique qué es LiveNest antes de
// pedir email/contraseña. Solo se ve en la web (livenest.net); la app
// nativa de Android salta directo al login (ver App.tsx) — nadie necesita
// que le vendan la app una vez que ya la instaló.
//
// v5: identidad clara "Vital" — referencia de estilo que el usuario pidió
// igualar explícitamente (un video de mockup de landing fintech: canvas
// gris clarísimo, un solo acento de color, tarjetas blancas con sombra
// suave convencional, botón lleno negro, mockup de producto flotando en
// 3D). Adaptado a la marca propia — oro en vez del lima literal de la
// referencia, mockup de browser con el dashboard real de LiveNest en vez
// de una tarjeta de crédito, nunca copiado literal (ni el acento, ni el
// wordmark, ni el contenido). Convive con el sistema .ln oscuro original
// (ver .ln-vital en index.css: mismos nombres de token, invertidos) — la
// pantalla de login (AuthView) sigue usando el .ln oscuro sin tocar.
// El cierre (FinalCta) vuelve a ese oscuro a propósito, como contraste
// final antes del footer — igual que hace la referencia.

// Revela `children` con un fade-up cuando entran en el viewport (o de
// inmediato, si el navegador no soporta IntersectionObserver — nunca se
// queda escondido). El hero usa esto mismo para su animación de entrada:
// como ya está a la vista al cargar, el observer dispara enseguida.
function Reveal({ children, delay = 0, className = "", style }: { children: ReactNode; delay?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

export function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const { t, lang, setLang } = useI18n();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="ln ln-vital min-h-screen overflow-x-clip">
      <Nav onLaunch={onLaunch} lang={lang} setLang={setLang} scrollTo={scrollTo} />
      <Hero onLaunch={onLaunch} scrollTo={scrollTo} />
      <StatStrip />
      <Features />
      <ThemesFan />
      <HowItWorks />
      <Pricing onLaunch={onLaunch} />
      <AndroidSection />
      <Faq />
      <FinalCta onLaunch={onLaunch} />
      <Footer />
    </div>
  );

  function Nav({ onLaunch, lang, setLang, scrollTo }: {
    onLaunch: () => void; lang: Lang; setLang: (l: Lang) => void; scrollTo: (id: string) => void;
  }) {
    return (
      <header className="sticky top-3 sm:top-4 z-30 px-3 sm:px-4">
        <div className="ln-nav-pill max-w-5xl mx-auto h-14 flex items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg" />
            <span className="text-[13px] font-medium" style={{ color: "var(--ln-white)" }}>
              Live<span style={{ color: "var(--ln-gold)" }}>Nest</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium" style={{ color: "var(--ln-ash)" }}>
            <button onClick={() => scrollTo("features")} className="hover:opacity-100 transition-opacity" style={{ color: "inherit" }}>{t("landing_nav_features")}</button>
            <button onClick={() => scrollTo("how")} className="hover:opacity-100 transition-opacity">{t("landing_nav_how")}</button>
            <button onClick={() => scrollTo("pricing")} className="hover:opacity-100 transition-opacity">{t("landing_nav_pricing")}</button>
            <button onClick={() => scrollTo("faq")} className="hover:opacity-100 transition-opacity">{t("landing_nav_faq")}</button>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:inline-flex rounded-lg p-0.5 gap-0.5" style={{ background: "var(--ln-chip-bg)" }}>
              {(["es", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-1.5 py-1 rounded text-xs font-bold transition-colors"
                  style={{ opacity: lang === l ? 1 : 0.45 }}
                >
                  {l === "es" ? "🇪🇸" : "🇬🇧"}
                </button>
              ))}
            </div>
            <button onClick={onLaunch} className="ln-btn ln-btn-primary">{t("landing_nav_launch")}</button>
          </div>
        </div>
      </header>
    );
  }

  function Hero({ onLaunch, scrollTo }: { onLaunch: () => void; scrollTo: (id: string) => void }) {
    return (
      <section className="relative border-b overflow-hidden" style={{ borderColor: "var(--ln-border)" }}>
        {/* Composición atmosférica — el único lugar del sistema donde el
            oro se cranquea al máximo (blur, escala) antes de que la
            página vuelva a la austeridad de abajo. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(185,129,15,0.14), transparent 60%)",
              filter: "blur(40px)",
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-24 sm:pt-28 sm:pb-28 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal>
              <span className="ln-badge ln-badge-gold mb-6">LiveNest</span>
            </Reveal>
            <Reveal delay={80}>
              {/* Contraste de peso tipográfico (línea 1 marcada, línea 2
                  liviana y más clara) — el mismo truco que usa la
                  referencia para separar el titular del subtitular sin
                  cambiar de tamaño de fuente. */}
              <h1 className="text-[42px] sm:text-[56px] leading-[1.08]" style={{ letterSpacing: "0.22px" }}>
                <span className="block font-semibold" style={{ color: "var(--ln-white)" }}>{t("landing_hero_title_1")}</span>
                {t("landing_hero_title_2") && (
                  <span className="block font-normal" style={{ color: "var(--ln-ash)" }}>{t("landing_hero_title_2")}</span>
                )}
                <span className="block font-semibold" style={{ color: "var(--ln-gold)" }}>{t("landing_hero_title_3")}</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 text-base max-w-md leading-relaxed" style={{ color: "var(--ln-ash)" }}>
                {t("landing_hero_subtitle")}
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap gap-3">
                <button onClick={onLaunch} className="ln-btn ln-btn-primary px-6 py-3 text-sm">{t("landing_hero_cta_primary")}</button>
                <button onClick={() => scrollTo("features")} className="ln-btn ln-btn-ghost px-6 py-3 text-sm">{t("landing_hero_cta_secondary")}</button>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs" style={{ color: "var(--ln-smoke)", fontFamily: "var(--font-geist-mono)" }}>
                {[t("landing_hero_trust_1"), t("landing_hero_trust_2"), t("landing_hero_trust_3")].map((txt, i) => (
                  <span key={txt} className="flex items-center gap-3">
                    {i > 0 && <span style={{ opacity: 0.4 }}>|</span>}
                    {txt}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={160}>
            <BrowserMock />
          </Reveal>
        </div>
      </section>
    );
  }

  // Mockup de navegador con el dashboard real de LiveNest adentro,
  // flotando en 3D con sombra suave — es la pieza central de la
  // referencia (un "producto" presentado como mockup de 3D, no una
  // ilustración genérica). LiveNest es, antes que nada, un producto web
  // (livenest.net), así que mostrarlo como ventana de navegador es más
  // honesto que forzar la metáfora de "tarjeta" de la referencia.
  function BrowserMock() {
    const chatLines = [
      { name: "maria_23", msg: "Hola! Saludos desde México 🇲🇽" },
      { name: "andree21", msg: "Great stream! 🔥" },
      { name: "lucas99", msg: "Me encanta este contenido" },
    ];
    // Anillo de progreso con el tiempo de transmisión — un dato real que
    // el dashboard sí muestra (duración de la sesión en vivo), no una
    // métrica de negocio inventada.
    const radius = 27;
    const circumference = 2 * Math.PI * radius;
    const progress = 0.62;

    return (
      <div className="flex justify-center lg:justify-end">
        <div className="relative w-full max-w-[460px] animate-float" style={{ animationDuration: "7s" }}>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              borderColor: "var(--ln-border)",
              background: "var(--ln-ink)",
              boxShadow: "0 2px 8px rgba(17,17,20,0.06), 0 48px 90px -24px rgba(17,17,20,0.3)",
              transform: "perspective(1600px) rotateY(-7deg) rotateX(3deg)",
            }}
          >
            {/* Barra de navegador falsa — semáforo de macOS + pill de URL,
                refuerza que esto es "la web real", igual que la
                referencia. */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--ln-border)" }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
              <div className="flex-1 flex justify-center">
                <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: "var(--ln-graphite)", color: "var(--ln-smoke)" }}>
                  livenest.net
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="" className="w-7 h-7 rounded-lg" />
                  <span className="text-sm font-semibold" style={{ color: "var(--ln-white)" }}>LiveNest</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-soft" />
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">{t("landing_mock_status")}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-5 pb-5 border-b" style={{ borderColor: "var(--ln-border)" }}>
                <svg width="64" height="64" viewBox="0 0 64 64" className="flex-shrink-0">
                  <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--ln-border)" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r={radius} fill="none" stroke="var(--ln-gold)" strokeWidth="5"
                    strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
                    strokeLinecap="round" transform="rotate(-90 32 32)"
                  />
                </svg>
                <div>
                  <p className="text-xl font-semibold tabular-nums" style={{ color: "var(--ln-white)" }}>00:42:18</p>
                  <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>{t("landing_mock_live_duration")}</p>
                </div>
              </div>

              <div className="space-y-2">
                {chatLines.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-2" style={{ background: "var(--ln-obsidian)" }}>
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                      style={{ background: "var(--ln-gold-tint)", color: "var(--ln-gold-bright)" }}
                    >
                      {c.name[0].toUpperCase()}
                    </span>
                    <span className="font-semibold flex-shrink-0" style={{ color: "var(--ln-white)" }}>@{c.name}</span>
                    <span className="truncate" style={{ color: "var(--ln-ash)" }}>{c.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function StatStrip() {
    const stats: [string, string][] = [
      ["2", t("landing_stat_langs")],
      ["200", t("landing_stat_free")],
      [MEMBERSHIP_PRICE_LABEL.split(" / ")[0], t("landing_stat_premium")],
      ["100%", t("landing_stat_browser")],
    ];
    return (
      <section className="border-b" style={{ borderColor: "var(--ln-border)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--ln-border)]">
          {stats.map(([n, label], i) => (
            <Reveal key={label} delay={i * 80} className="px-4 first:pl-0 text-center sm:text-left">
              <p className="text-2xl sm:text-3xl font-semibold" style={{ color: "var(--ln-white)" }}>{n}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>{label}</p>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  function Features() {
    const items: { icon: typeof Mic; titleKey: TranslationKey; descKey: TranslationKey }[] = [
      { icon: Mic, titleKey: "landing_feature_1_title", descKey: "landing_feature_1_desc" },
      { icon: Bell, titleKey: "landing_feature_2_title", descKey: "landing_feature_2_desc" },
      { icon: Music, titleKey: "landing_feature_3_title", descKey: "landing_feature_3_desc" },
      { icon: Shield, titleKey: "landing_feature_4_title", descKey: "landing_feature_4_desc" },
      { icon: Globe, titleKey: "landing_feature_5_title", descKey: "landing_feature_5_desc" },
      { icon: SlidersHorizontal, titleKey: "landing_feature_6_title", descKey: "landing_feature_6_desc" },
    ];
    return (
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-28 scroll-mt-20">
        <div className="max-w-lg mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>{t("landing_nav_features")}</span>
          <h2 className="mt-3 text-[32px] font-semibold tracking-tight" style={{ color: "var(--ln-white)" }}>{t("landing_features_title")}</h2>
          <p className="mt-4 text-base" style={{ color: "var(--ln-ash)" }}>{t("landing_features_subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f, i) => (
            <Reveal key={f.titleKey} delay={(i % 3) * 90} className="ln-key ln-key-hover p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="ln-icon-circle w-10 h-10">
                  <f.icon className="w-4.5 h-4.5" style={{ color: "var(--ln-mist)" }} />
                </div>
                <span className="text-[11px] font-bold" style={{ color: "var(--ln-smoke)", fontFamily: "var(--font-geist-mono)" }}>0{i + 1}</span>
              </div>
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--ln-white)" }}>{t(f.titleKey)}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ln-ash)" }}>{t(f.descKey)}</p>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  // Stack de temas en abanico — equivalente propio del "fan de tarjetas
  // en distintos acabados" de la referencia, pero con contenido real: los
  // 13 temas seleccionables de la app (mismos --c-primary que index.css),
  // no un producto inventado.
  function ThemesFan() {
    const featured = [
      { name: "Ocean", color: "#0ea5e9" },
      { name: "Forest", color: "#10b981" },
      { name: "Gold", color: "#d89a16" },
      { name: "Candy", color: "#ec4899" },
      { name: "iOS", color: "#007aff" },
    ];
    const rotations = [-16, -8, 0, 8, 16];
    // Desplazamiento horizontal por carta además de la rotación — sin esto,
    // una rotación sola alrededor del centro no alcanza a destrabar cartas
    // del mismo tamaño de atrás del todo de la de adelante, y el abanico
    // se ve como una sola carta con apenas un filo de las demás asomando.
    const offsets = [-108, -54, 0, 54, 108];
    const rest = ["#06b6d4", "#e5e5e5", "#d946ef", "#d0bcff", "#a855f7", "#fb923c", "#8b5cf6", "#ef4444"];

    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-28 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <span className="ln-badge ln-badge-gold mb-6">{t("landing_themes_badge")}</span>
            <h2 className="text-[32px] font-semibold tracking-tight" style={{ color: "var(--ln-white)" }}>{t("landing_themes_title")}</h2>
            <p className="mt-4 text-base max-w-md" style={{ color: "var(--ln-ash)" }}>{t("landing_themes_subtitle")}</p>
            <div className="mt-7 flex items-center gap-1.5 flex-wrap max-w-xs">
              {rest.map((c) => (
                <span key={c} className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }} />
              ))}
              <span className="text-xs ml-1" style={{ color: "var(--ln-smoke)" }}>+8</span>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative h-[300px] flex items-center justify-center" style={{ perspective: 1200 }}>
              {featured.map((f, i) => (
                <div
                  key={f.name}
                  className="absolute top-1/2 left-1/2 w-[120px] h-[170px] rounded-2xl border flex flex-col justify-between p-3.5"
                  style={{
                    background: `linear-gradient(160deg, ${f.color}, ${f.color}cc)`,
                    borderColor: "rgba(255,255,255,0.3)",
                    transform: `translate(-50%, -50%) translateX(${offsets[i]}px) translateY(${Math.abs(rotations[i]) * 1.1}px) rotate(${rotations[i]}deg)`,
                    boxShadow: "0 24px 48px -16px rgba(17,17,20,0.3)",
                    zIndex: 10 - Math.abs(rotations[i]),
                  }}
                >
                  <div className="w-6 h-6 rounded-lg" style={{ background: "rgba(255,255,255,0.3)" }} />
                  <span className="text-[11px] font-bold text-white">{f.name}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    );
  }

  function HowItWorks() {
    const steps = [
      { titleKey: "landing_how_1_title" as const, descKey: "landing_how_1_desc" as const },
      { titleKey: "landing_how_2_title" as const, descKey: "landing_how_2_desc" as const },
      { titleKey: "landing_how_3_title" as const, descKey: "landing_how_3_desc" as const },
    ];
    return (
      <section id="how" className="border-y scroll-mt-20" style={{ borderColor: "var(--ln-border)", background: "var(--ln-ink)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-28">
          <h2 className="text-[32px] font-semibold tracking-tight text-center mb-16" style={{ color: "var(--ln-white)" }}>{t("landing_how_title")}</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <Reveal key={s.titleKey} delay={i * 120} className="text-center sm:text-left">
                <p className="text-4xl font-semibold mb-3" style={{ color: "var(--ln-gold)", opacity: 0.35, fontFamily: "var(--font-geist-mono)" }}>0{i + 1}</p>
                <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--ln-white)" }}>{t(s.titleKey)}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--ln-ash)" }}>{t(s.descKey)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function Pricing({ onLaunch }: { onLaunch: () => void }) {
    const freeItems = ["landing_pricing_free_item_1", "landing_pricing_free_item_2", "landing_pricing_free_item_3"] as const;
    const premiumItems = ["landing_pricing_premium_item_1", "landing_pricing_premium_item_2", "landing_pricing_premium_item_3"] as const;
    return (
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-28 scroll-mt-20">
        <div className="text-center max-w-lg mx-auto mb-16">
          <h2 className="text-[32px] font-semibold tracking-tight" style={{ color: "var(--ln-white)" }}>{t("landing_pricing_title")}</h2>
          <p className="mt-4 text-base" style={{ color: "var(--ln-ash)" }}>{t("landing_pricing_subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Reveal className="ln-key p-6">
            <h3 className="text-sm font-semibold" style={{ color: "var(--ln-ash)" }}>{t("landing_pricing_free_title")}</h3>
            <p className="text-4xl font-semibold mt-2" style={{ color: "var(--ln-white)" }}>{t("landing_pricing_free_price")}</p>
            <p className="text-xs mb-5" style={{ color: "var(--ln-smoke)" }}>{t("landing_pricing_free_desc")}</p>
            <ul className="space-y-2.5 mb-6">
              {freeItems.map((k) => (
                <li key={k} className="flex items-start gap-2 text-xs" style={{ color: "var(--ln-ash)" }}>
                  <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--ln-gold)" }} /> {t(k)}
                </li>
              ))}
            </ul>
            <button onClick={onLaunch} className="ln-btn ln-btn-ghost w-full text-sm">{t("landing_hero_cta_primary")}</button>
          </Reveal>
          <Reveal
            delay={120}
            className="ln-key p-6 relative"
            style={{ boxShadow: "0 1px 2px rgba(17,17,20,0.04), 0 20px 40px rgba(17,17,20,0.08), rgba(185,129,15,0.5) 0px 0px 0px 1.5px" }}
          >
            <span className="ln-badge ln-badge-gold absolute -top-3 left-5">{t("landing_pricing_premium_badge")}</span>
            <h3 className="text-sm font-semibold" style={{ color: "var(--ln-ash)" }}>{t("landing_pricing_premium_title")}</h3>
            <p className="text-4xl font-semibold mt-2" style={{ color: "var(--ln-white)" }}>
              {MEMBERSHIP_PRICE_LABEL.split(" / ")[0]}
              <span className="text-sm font-medium" style={{ color: "var(--ln-smoke)" }}> {t("landing_pricing_period")}</span>
            </p>
            <p className="text-xs mb-5" style={{ color: "var(--ln-smoke)" }}>{t("landing_pricing_premium_desc")}</p>
            <ul className="space-y-2.5 mb-6">
              {premiumItems.map((k) => (
                <li key={k} className="flex items-start gap-2 text-xs" style={{ color: "var(--ln-ash)" }}>
                  <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--ln-gold)" }} /> {t(k)}
                </li>
              ))}
            </ul>
            <button onClick={onLaunch} className="ln-btn ln-btn-primary w-full text-sm">{t("landing_hero_cta_primary")}</button>
          </Reveal>
        </div>
      </section>
    );
  }

  function AndroidSection() {
    return (
      <section className="border-y" style={{ borderColor: "var(--ln-border)", background: "var(--ln-ink)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <span className="ln-badge mb-3">{t("landing_android_badge")}</span>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2" style={{ color: "var(--ln-white)" }}>
              <Smartphone className="w-5 h-5" style={{ color: "var(--ln-gold)" }} /> {t("landing_android_title")}
            </h2>
            <p className="mt-2 text-sm max-w-lg" style={{ color: "var(--ln-ash)" }}>{t("landing_android_desc")}</p>
            <p className="mt-2 text-[11px] max-w-lg" style={{ color: "var(--ln-smoke)" }}>{t("landing_android_note")}</p>
          </div>
          <a
            href="https://github.com/SiikNotic/LiveNest/releases/latest"
            target="_blank"
            rel="noreferrer"
            className="ln-btn ln-btn-primary px-5 py-3 text-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> {t("landing_android_download")}
          </a>
        </div>
      </section>
    );
  }

  function Faq() {
    const items = [
      ["landing_faq_1_q", "landing_faq_1_a"],
      ["landing_faq_2_q", "landing_faq_2_a"],
      ["landing_faq_3_q", "landing_faq_3_a"],
      ["landing_faq_4_q", "landing_faq_4_a"],
      ["landing_faq_5_q", "landing_faq_5_a"],
    ] as const;
    const [open, setOpen] = useState<string | null>(items[0][0]);
    return (
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-28 scroll-mt-20">
        <h2 className="text-[32px] font-semibold tracking-tight text-center mb-12" style={{ color: "var(--ln-white)" }}>{t("landing_faq_title")}</h2>
        <div className="space-y-3">
          {items.map(([qKey, aKey], i) => {
            const isOpen = open === qKey;
            return (
              <Reveal key={qKey} delay={i * 60}>
                <div className="ln-key ln-key-hover p-6 cursor-pointer" onClick={() => setOpen(isOpen ? null : qKey)}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--ln-white)" }}>{t(qKey)}</h3>
                    <ChevronDown
                      className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      style={{ color: "var(--ln-smoke)" }}
                    />
                  </div>
                  {isOpen && (
                    <p className="text-xs leading-relaxed mt-2.5 animate-slide-down" style={{ color: "var(--ln-ash)" }}>
                      {aKey === "landing_faq_3_a" ? t(aKey, { price: MEMBERSHIP_PRICE_LABEL }) : t(aKey)}
                    </p>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    );
  }

  // Cierre oscuro de contraste — como hace la referencia (termina en un
  // panel oscuro antes del footer claro). En vez de inventar colores
  // nuevos, reaparece acá el sistema .ln oscuro original (anidado: la
  // misma clase .ln redeclara sus variables, pisando a .ln-vital solo
  // para este subárbol), así .ln-key/.ln-badge/.ln-btn-primary quedan
  // gratis sin duplicar ningún valor hexadecimal nuevo.
  function FinalCta({ onLaunch }: { onLaunch: () => void }) {
    return (
      <div className="ln">
        <section className="py-16 sm:py-20" style={{ background: "var(--ln-canvas)" }}>
          <Reveal className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <span className="ln-badge ln-badge-gold mb-5">LiveNest</span>
            <h2 className="text-[32px] sm:text-[40px] font-semibold tracking-tight" style={{ color: "var(--ln-white)" }}>{t("landing_final_title")}</h2>
            <p className="text-sm mt-3 max-w-md mx-auto" style={{ color: "var(--ln-ash)" }}>{t("landing_final_subtitle")}</p>
            <button onClick={onLaunch} className="ln-btn ln-btn-primary mt-8 px-7 py-3 text-sm">
              {t("landing_final_cta")}
            </button>
          </Reveal>
        </section>
      </div>
    );
  }

  function Footer() {
    return (
      <footer className="border-t" style={{ borderColor: "var(--ln-border)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-[1.5fr_1fr_1fr] gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <img src="/logo.png" alt="" className="w-7 h-7 rounded-lg" />
              <span className="text-sm font-medium" style={{ color: "var(--ln-white)" }}>Live<span style={{ color: "var(--ln-gold)" }}>Nest</span></span>
            </div>
            <p className="text-xs max-w-xs" style={{ color: "var(--ln-smoke)" }}>{t("landing_footer_tagline")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--ln-smoke)" }}>{t("landing_footer_legal")}</p>
            <div className="flex flex-col gap-1.5 text-xs" style={{ color: "var(--ln-ash)" }}>
              <a href="/terms.html" className="hover:opacity-70 transition-opacity">{t("landing_footer_terms")}</a>
              {/* Páginas estáticas crawleables para SEO de cola larga
                  (fuera del bundle de la SPA, viven en /es//en/ en
                  livenest2) — recuperadas de un commit que se había
                  pusheado directo a livenest2 sin pasar por acá. */}
              <a href="/es/lector-voz-tiktok-live/" className="hover:opacity-70 transition-opacity">Lector de voz TikTok Live</a>
              <a href="/es/como-leer-comentarios-tiktok-live/" className="hover:opacity-70 transition-opacity">Guía TikTok Live</a>
              <a href="/es/tiktok-live-text-to-speech/" className="hover:opacity-70 transition-opacity">TikTok Live TTS</a>
              <a href="/es/alertas-tiktok-live/" className="hover:opacity-70 transition-opacity">Alertas TikTok Live</a>
              <a href="/privacy.html" className="hover:opacity-70 transition-opacity">{t("landing_footer_privacy")}</a>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--ln-smoke)" }}>{t("landing_footer_contact")}</p>
            <a href="mailto:livenestapp@gmail.com" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--ln-ash)" }}>
              livenestapp@gmail.com
            </a>
          </div>
        </div>
        <div
          className="border-t py-4 text-center text-[11px]"
          style={{ borderColor: "var(--ln-border)", color: "var(--ln-smoke)", fontFamily: "var(--font-geist-mono)" }}
        >
          © {new Date().getFullYear()} LiveNest
        </div>
      </footer>
    );
  }
}
