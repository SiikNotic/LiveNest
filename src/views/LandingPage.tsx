import { useI18n, type Lang } from "../lib/i18n";
import { MEMBERSHIP_PRICE_LABEL } from "../lib/stripeConfig";
import {
  Mic, Bell, Music, Shield, Globe, SlidersHorizontal, Zap, ThumbsUp, ShieldCheck,
  Headphones, Gift, UserPlus, Crown, Check, Download, Smartphone,
} from "lucide-react";

// Página de bienvenida para quien todavía no inició sesión — antes se iba
// derecho a AuthView, sin nada que explique qué es LiveNest antes de
// pedir email/contraseña. Solo se ve en la web (livenest.net); la app
// nativa de Android salta directo al login (ver App.tsx) — nadie necesita
// que le vendan la app una vez que ya la instaló.
export function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const { t, lang, setLang } = useI18n();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <Nav onLaunch={onLaunch} lang={lang} setLang={setLang} scrollTo={scrollTo} />
      <Hero onLaunch={onLaunch} scrollTo={scrollTo} />
      <ValuesBar />
      <Features />
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
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="" className="w-9 h-9 rounded-xl glow-primary" />
            <span className="text-base font-extrabold tracking-tight">
              Live<span className="text-gradient">Nest</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-text-soft">
            <button onClick={() => scrollTo("features")} className="hover:text-text transition-colors">{t("landing_nav_features")}</button>
            <button onClick={() => scrollTo("how")} className="hover:text-text transition-colors">{t("landing_nav_how")}</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-text transition-colors">{t("landing_nav_pricing")}</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-text transition-colors">{t("landing_nav_faq")}</button>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:inline-flex rounded-xl border border-border bg-bg-soft p-1 gap-1">
              {(["es", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                    lang === l ? "bg-primary/15 text-primary" : "text-muted hover:text-text"
                  }`}
                >
                  {l === "es" ? "🇪🇸" : "🇬🇧"}
                </button>
              ))}
            </div>
            <button onClick={onLaunch} className="btn-primary text-sm">{t("landing_nav_launch")}</button>
          </div>
        </div>
      </header>
    );
  }

  function Hero({ onLaunch, scrollTo }: { onLaunch: () => void; scrollTo: (id: string) => void }) {
    return (
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(60% 50% at 50% 0%, var(--c-bg-gradient1), transparent), radial-gradient(40% 40% at 90% 20%, var(--c-bg-gradient2), transparent)" }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
              <span className="block">{t("landing_hero_title_1")}</span>
              {t("landing_hero_title_2") && <span className="block">{t("landing_hero_title_2")}</span>}
              <span className="block text-gradient">{t("landing_hero_title_3")}</span>
            </h1>
            <p className="mt-5 text-base text-text-soft max-w-md">{t("landing_hero_subtitle")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={onLaunch} className="btn-primary text-sm px-5 py-3">{t("landing_hero_cta_primary")}</button>
              <button onClick={() => scrollTo("features")} className="btn-ghost text-sm px-5 py-3">{t("landing_hero_cta_secondary")}</button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
              {[t("landing_hero_trust_1"), t("landing_hero_trust_2"), t("landing_hero_trust_3")].map((txt) => (
                <span key={txt} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-success-400" /> {txt}
                </span>
              ))}
            </div>
          </div>
          <HeroMock />
        </div>
      </section>
    );
  }

  function HeroMock() {
    const chatLines = [
      { name: "maria_23", msg: "Hola! Saludos desde México 🇲🇽" },
      { name: "andree21", msg: "Great stream! 🔥" },
      { name: "lucas99", msg: "Me encanta este contenido" },
      { name: "sofia_12", msg: "Nuevo seguidor! 🎉" },
    ];
    const alerts = [
      { icon: Gift, color: "text-amber-400", bg: "bg-amber-500/10", labelKey: "landing_mock_alert_gift" as const },
      { icon: UserPlus, color: "text-primary", bg: "bg-primary/10", labelKey: "landing_mock_alert_follow" as const },
      { icon: Crown, color: "text-accent", bg: "bg-accent/10", labelKey: "landing_mock_alert_sub" as const },
    ];
    return (
      <div className="relative">
        <div className="card p-0 overflow-hidden glow-primary">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="" className="w-7 h-7 rounded-lg" />
              <span className="text-sm font-extrabold">Live<span className="text-gradient">Nest</span></span>
            </div>
            <span className="badge-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse-soft" /> {t("landing_mock_status")}
            </span>
          </div>
          <div className="p-4 grid sm:grid-cols-5 gap-4">
            <div className="sm:col-span-3">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">{t("landing_mock_chat_title")}</p>
              <div className="space-y-1.5">
                {chatLines.map((c) => (
                  <div key={c.name} className="text-xs bg-bg-soft rounded-lg px-2.5 py-1.5">
                    <span className="font-bold text-primary">@{c.name}</span>{" "}
                    <span className="text-text-soft">{c.msg}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">{t("landing_mock_alerts_title")}</p>
              <div className="space-y-1.5">
                {alerts.map((a) => (
                  <div key={a.labelKey} className="flex items-center gap-2 bg-bg-soft rounded-lg px-2.5 py-2">
                    <div className={`w-6 h-6 rounded-md ${a.bg} flex items-center justify-center flex-shrink-0`}>
                      <a.icon className={`w-3.5 h-3.5 ${a.color}`} />
                    </div>
                    <span className="text-[11px] font-semibold text-text-soft">{t(a.labelKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ValuesBar() {
    const values = [
      { icon: Zap, titleKey: "landing_values_1_title" as const, descKey: "landing_values_1_desc" as const },
      { icon: ThumbsUp, titleKey: "landing_values_2_title" as const, descKey: "landing_values_2_desc" as const },
      { icon: ShieldCheck, titleKey: "landing_values_3_title" as const, descKey: "landing_values_3_desc" as const },
      { icon: Headphones, titleKey: "landing_values_4_title" as const, descKey: "landing_values_4_desc" as const },
    ];
    return (
      <section className="border-y border-border bg-bg-soft/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {values.map((v) => (
            <div key={v.titleKey} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <v.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{t(v.titleKey)}</p>
                <p className="text-xs text-muted leading-tight">{t(v.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function Features() {
    const items = [
      { icon: Mic, titleKey: "landing_feature_1_title" as const, descKey: "landing_feature_1_desc" as const },
      { icon: Bell, titleKey: "landing_feature_2_title" as const, descKey: "landing_feature_2_desc" as const },
      { icon: Music, titleKey: "landing_feature_3_title" as const, descKey: "landing_feature_3_desc" as const },
      { icon: Shield, titleKey: "landing_feature_4_title" as const, descKey: "landing_feature_4_desc" as const },
      { icon: Globe, titleKey: "landing_feature_5_title" as const, descKey: "landing_feature_5_desc" as const },
      { icon: SlidersHorizontal, titleKey: "landing_feature_6_title" as const, descKey: "landing_feature_6_desc" as const },
    ];
    return (
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-16">
        <div className="text-center max-w-lg mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("landing_features_title").split(" ").slice(0, -2).join(" ")}{" "}
            <span className="text-gradient">{t("landing_features_title").split(" ").slice(-2).join(" ")}</span>
          </h2>
          <p className="mt-3 text-sm text-text-soft">{t("landing_features_subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f) => (
            <div key={f.titleKey} className="card card-hover">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold mb-1">{t(f.titleKey)}</h3>
              <p className="text-xs text-text-soft leading-relaxed">{t(f.descKey)}</p>
            </div>
          ))}
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
      <section id="how" className="bg-bg-soft/50 border-y border-border scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center mb-12">{t("landing_how_title")}</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.titleKey} className="relative">
                <div className="w-10 h-10 rounded-full bg-primary text-white font-extrabold flex items-center justify-center mb-4">
                  {i + 1}
                </div>
                <h3 className="text-sm font-bold mb-1.5">{t(s.titleKey)}</h3>
                <p className="text-xs text-text-soft leading-relaxed">{t(s.descKey)}</p>
              </div>
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
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-16">
        <div className="text-center max-w-lg mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t("landing_pricing_title")}</h2>
          <p className="mt-3 text-sm text-text-soft">{t("landing_pricing_subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="card">
            <h3 className="text-sm font-bold text-text-soft">{t("landing_pricing_free_title")}</h3>
            <p className="text-3xl font-extrabold mt-1">{t("landing_pricing_free_price")}</p>
            <p className="text-xs text-muted mb-4">{t("landing_pricing_free_desc")}</p>
            <ul className="space-y-2 mb-5">
              {freeItems.map((k) => (
                <li key={k} className="flex items-start gap-2 text-xs text-text-soft">
                  <Check className="w-3.5 h-3.5 text-success-400 flex-shrink-0 mt-0.5" /> {t(k)}
                </li>
              ))}
            </ul>
            <button onClick={onLaunch} className="btn-ghost w-full text-sm">{t("landing_hero_cta_primary")}</button>
          </div>
          <div className="card border-primary/40 relative">
            <span className="badge-primary absolute -top-3 left-4">{t("landing_pricing_premium_badge")}</span>
            <h3 className="text-sm font-bold text-text-soft">{t("landing_pricing_premium_title")}</h3>
            <p className="text-3xl font-extrabold mt-1">
              {MEMBERSHIP_PRICE_LABEL.split(" / ")[0]}
              <span className="text-sm font-semibold text-muted"> {t("landing_pricing_period")}</span>
            </p>
            <p className="text-xs text-muted mb-4">{t("landing_pricing_premium_desc")}</p>
            <ul className="space-y-2 mb-5">
              {premiumItems.map((k) => (
                <li key={k} className="flex items-start gap-2 text-xs text-text-soft">
                  <Check className="w-3.5 h-3.5 text-success-400 flex-shrink-0 mt-0.5" /> {t(k)}
                </li>
              ))}
            </ul>
            <button onClick={onLaunch} className="btn-primary w-full text-sm">{t("landing_hero_cta_primary")}</button>
          </div>
        </div>
      </section>
    );
  }

  function AndroidSection() {
    return (
      <section className="bg-bg-soft/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <span className="badge-accent mb-3">{t("landing_android_badge")}</span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" /> {t("landing_android_title")}
            </h2>
            <p className="mt-2 text-sm text-text-soft max-w-lg">{t("landing_android_desc")}</p>
            <p className="mt-2 text-[11px] text-muted max-w-lg">{t("landing_android_note")}</p>
          </div>
          <a
            href="https://github.com/SiikNotic/LiveNest/releases/latest"
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-sm px-5 py-3 whitespace-nowrap"
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
    return (
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-20 scroll-mt-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center mb-10">{t("landing_faq_title")}</h2>
        <div className="space-y-3">
          {items.map(([qKey, aKey]) => (
            <div key={qKey} className="card">
              <h3 className="text-sm font-bold mb-1.5">{t(qKey)}</h3>
              <p className="text-xs text-text-soft leading-relaxed">
                {aKey === "landing_faq_3_a" ? t(aKey, { price: MEMBERSHIP_PRICE_LABEL }) : t(aKey)}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function FinalCta({ onLaunch }: { onLaunch: () => void }) {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-600 px-6 py-12 sm:px-14 sm:py-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-extrabold text-white">{t("landing_final_title")}</h2>
            <p className="text-sm text-white/85 mt-1.5 max-w-md">{t("landing_final_subtitle")}</p>
          </div>
          <button onClick={onLaunch} className="bg-white text-primary-700 font-bold text-sm rounded-xl px-6 py-3 whitespace-nowrap card-press">
            {t("landing_final_cta")}
          </button>
        </div>
      </section>
    );
  }

  function Footer() {
    return (
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-[1.5fr_1fr_1fr] gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <img src="/logo.png" alt="" className="w-7 h-7 rounded-lg" />
              <span className="text-sm font-extrabold">Live<span className="text-gradient">Nest</span></span>
            </div>
            <p className="text-xs text-muted max-w-xs">{t("landing_footer_tagline")}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{t("landing_footer_legal")}</p>
            <div className="flex flex-col gap-1.5 text-xs text-text-soft">
              <a href="/terms.html" className="hover:text-primary transition-colors">{t("landing_footer_terms")}</a>
              <a href="/privacy.html" className="hover:text-primary transition-colors">{t("landing_footer_privacy")}</a>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{t("landing_footer_contact")}</p>
            <a href="mailto:livenestapp@gmail.com" className="text-xs text-text-soft hover:text-primary transition-colors">
              livenestapp@gmail.com
            </a>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-[11px] text-muted">
          © {new Date().getFullYear()} LiveNest
        </div>
      </footer>
    );
  }
}
