import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useStore } from "../lib/store";
import { useI18n, type TranslationKey } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { voiceManager, type VoiceInfo, type VoiceProvider } from "../lib/voiceManager";
import type { Settings } from "../lib/supabase";
import {
  Volume2, VolumeX, Mic, Check, AlertCircle, User, UserRound,
  Headphones, Settings2, ChevronDown, ChevronUp, Shuffle,
  Globe, Sparkles, Crown, Lock, Search, Gauge, Timer, SlidersHorizontal,
  RotateCcw, Play, Pause,
} from "lucide-react";
type TFunc = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type GenderFilter = "all" | "male" | "female";

const PROVIDERS: { id: VoiceProvider; labelKey: import("../lib/i18n").TranslationKey; descKey: import("../lib/i18n").TranslationKey; icon: typeof Globe; memberOnly?: boolean }[] = [
  { id: "browser", labelKey: "voices_browser", descKey: "voices_browser_desc", icon: Globe },
  { id: "google", labelKey: "voices_google", descKey: "voices_google_desc", icon: Sparkles, memberOnly: true },
  { id: "inworld", labelKey: "voices_inworld", descKey: "voices_inworld_desc", icon: Mic, memberOnly: true },
  { id: "elevenlabs", labelKey: "voices_elevenlabs", descKey: "voices_elevenlabs_desc", icon: Crown, memberOnly: true },
];

const LANG_FILTERS = [
  { code: "es", labelKey: "tab_chat" as const, flag: "🇪🇸" },
  { code: "en", labelKey: "tab_chat" as const, flag: "🇺🇸" },
] as const;

// Qué controles de audio respeta cada motor de verdad, verificado contra
// voiceManager.ts y supabase/functions/tts-proxy/index.ts (no una
// suposición): "Navegador" aplica rate/pitch directamente en el
// SpeechSynthesisUtterance; "Voz gratuita" (Google TTS) no tiene control de
// tono en el servidor (queda fijo) aunque sí aproxima la velocidad vía
// audio.playbackRate; "Inworld" no manda ni rate ni pitch en absoluto a su
// API; "ElevenLabs" sí aplica rate (mapeado a su parámetro "speed") pero su
// voice_settings no acepta pitch (el backend lo ignora a propósito, ver el
// comentario en tts-proxy). No existe ningún ajuste de "pausa entre
// mensajes" en la app — por eso ese control se muestra siempre inactivo.
function engineSupportsRate(p: VoiceProvider): boolean {
  return p !== "inworld";
}
function engineSupportsPitch(p: VoiceProvider): boolean {
  return p === "browser";
}

function matchLang(v: VoiceInfo, code: string): boolean {
  // ElevenLabs voices work with any language via the multilingual model —
  // their account "language" label is just where the voice was recorded,
  // not a limitation. So show them under every language filter.
  if (v.source === "elevenlabs") return true;
  const vl = v.lang.toLowerCase();
  if (vl === "multi") return true;
  if (code === "es") return vl.startsWith("es");
  if (code === "en") return vl.startsWith("en");
  return true;
}

// Motor "Navegador" (Web Speech API, window.speechSynthesis) — se oculta en
// la app nativa de Android: además de que "el navegador" no tiene sentido
// mencionarlo estando ya dentro de la app, el WebView de Android no trae
// voces propias en la mayoría de los dispositivos, así que ofrecerlo ahí
// era una opción que en la práctica no sonaba.
//
// "Google" (Google Translate TTS — gratis, sin API key, ver tts-proxy) pasa
// a ser libre para no-miembros en la app: sin "Navegador", era el único
// motor que le quedaba a un usuario sin membresía, y quedaba bloqueado
// detrás de un candado de "solo miembros" que no tenía sentido para algo
// gratis. En la web sigue siendo solo para miembros porque ahí "Navegador"
// ya cumple ese rol de opción gratis. voiceManager manda la plataforma en
// cada pedido a tts-proxy, que es quien de verdad aplica esta excepción.
const isNative = Capacitor.isNativePlatform();
const VISIBLE_PROVIDERS = isNative
  ? PROVIDERS.filter((p) => p.id !== "browser").map((p) => (p.id === "google" ? { ...p, memberOnly: false } : p))
  : PROVIDERS;

export function VoicesView() {
  const { hasActiveLicense } = useAuth();
  const settings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);
  const { t } = useI18n();
  const [browserVoices, setBrowserVoices] = useState<VoiceInfo[]>([]);
  const [filterLang, setFilterLang] = useState<string>("es");
  const [filterGender, setFilterGender] = useState<GenderFilter>("all");
  const [speaking, setSpeaking] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [, forceUpdate] = useState(0);
  // Solo para la variante de escritorio/tablet de más abajo — mobile no usa
  // ninguno de estos dos.
  const [desktopSearch, setDesktopSearch] = useState("");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const provider = settings?.voice_provider ?? "browser";

  useEffect(() => {
    const update = () => {
      setBrowserVoices(voiceManager.getBrowserVoices());
      forceUpdate((n) => n + 1);
    };
    update();
    return voiceManager.subscribe(update);
  }, []);

  useEffect(() => {
    if (provider === "elevenlabs" && hasActiveLicense) {
      voiceManager.refreshElevenLabsVoices();
    } else if (provider === "inworld" && hasActiveLicense) {
      voiceManager.refreshInworldVoices();
    }
  }, [provider, hasActiveLicense]);

  if (!settings) return <div className="card animate-pulse h-48" />;

  // A saved provider that requires membership but the user no longer has one
  // (e.g. license just expired) — behave as "browser" until it's re-saved.
  // "google" queda afuera de este candado en la app nativa (ver
  // VISIBLE_PROVIDERS más arriba) — es el motor gratis que le queda a un
  // usuario sin membresía ahí.
  const isProviderLocked = (p: VoiceProvider) =>
    (p === "elevenlabs" || p === "inworld" || (p === "google" && !isNative)) && !hasActiveLicense;
  const effectiveProvider: VoiceProvider = isProviderLocked(provider) ? "browser" : provider;

  const allVoices =
    effectiveProvider === "browser" ? browserVoices
    : effectiveProvider === "google" ? voiceManager.getGoogleVoices()
    : effectiveProvider === "inworld" ? voiceManager.getInworldVoices()
    : voiceManager.getElevenLabsVoices();

  const byLang = allVoices.filter((v) => matchLang(v, filterLang));
  const filteredVoices = filterGender === "all" ? byLang : byLang.filter((v) => v.gender === filterGender);

  const preview = async () => {
    setSpeaking(true);
    setPreviewError(null);
    const sample = filterLang === "en" ? t("voices_test_text_en") : t("voices_test_text_es");
    try {
      const voiceId = settings.voice_random
        ? voiceManager.getRandomVoiceId(effectiveProvider, filterLang) ?? settings.voice_id
        : settings.voice_id;
      await voiceManager.speak(sample, {
        voiceId,
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume,
        provider: effectiveProvider,
      });
    } catch (err: any) {
      setPreviewError(err?.message ?? t("voices_preview_error"));
    }
    setSpeaking(false);
  };

  const stop = () => {
    voiceManager.stop();
    setSpeaking(false);
  };

  // Preview por fila (solo escritorio/tablet) — escucha una voz puntual sin
  // tocar settings.voice_id, a diferencia de "Seleccionar". Reusa el mismo
  // voiceManager.speak() de siempre; voiceManager.stop() ya corta cualquier
  // reproducción anterior (la de otra fila o la de la barra "Probar voz" de
  // abajo) antes de empezar una nueva, así nunca suenan dos a la vez.
  const previewVoiceRow = async (v: VoiceInfo) => {
    if (previewingId === v.id) {
      voiceManager.stop();
      setPreviewingId(null);
      return;
    }
    setPreviewingId(v.id);
    setPreviewError(null);
    const sample = filterLang === "en" ? t("voices_test_text_en") : t("voices_test_text_es");
    try {
      await voiceManager.speak(sample, {
        voiceId: v.id,
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume,
        provider: effectiveProvider,
      });
    } catch (err: any) {
      setPreviewError(err?.message ?? t("voices_preview_error"));
    }
    setPreviewingId((cur) => (cur === v.id ? null : cur));
  };

  return (
    <>
    {/* ============== MOBILE (<md) — sin tocar, igual que siempre ============== */}
    <div className="md:hidden space-y-4 animate-fade-in">
      <div className="card relative overflow-hidden p-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        <div className="relative p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center glow-primary">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">{t("voices_title")}</h2>
              <p className="text-xs text-muted">{t("voices_subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <label className="label">{t("voices_engine")}</label>
        <div className="grid grid-cols-3 gap-2">
          {VISIBLE_PROVIDERS.map((p) => {
            const Icon = p.icon;
            const isActive = provider === p.id;
            const locked = p.memberOnly && !hasActiveLicense;
            return (
              <button
                key={p.id}
                onClick={() => !locked && saveSettings({ voice_provider: p.id })}
                disabled={locked}
                title={locked ? t("members_only_tooltip") : undefined}
                className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all duration-200 card-press ${
                  locked
                    ? "bg-bg-soft text-muted opacity-50 cursor-not-allowed border border-border"
                    : isActive
                    ? "bg-primary text-bg"
                    : "bg-bg-soft text-muted hover:text-text border border-border"
                }`}
              >
                {locked && (
                  <span className="absolute top-1.5 right-1.5">
                    <Lock className="w-3 h-3" />
                  </span>
                )}
                <Icon className="w-5 h-5" />
                <span className="text-xs font-bold">{t(p.labelKey)}</span>
                <span className={`text-[10px] leading-tight text-center ${isActive ? "opacity-80" : "opacity-60"}`}>
                  {locked ? t("voices_locked_short") : t(p.descKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shuffle className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{t("voices_random")}</h3>
            <p className="text-xs text-muted">{t("voices_random_desc")}</p>
          </div>
        </div>
        <Switch
          checked={settings.voice_random}
          onChange={() => saveSettings({ voice_random: !settings.voice_random })}
        />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Headphones className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold">{t("voices_language")}</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LANG_FILTERS.map((l) => {
            const isActive = filterLang === l.code;
            return (
              <button
                key={l.code}
                onClick={() => setFilterLang(l.code)}
                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all duration-200 card-press ${
                  isActive
                    ? "bg-primary text-bg"
                    : "bg-bg-soft text-muted hover:text-text border border-border"
                }`}
              >
                <span className="text-2xl leading-none">{l.flag}</span>
                <span className="text-[11px] font-semibold">{l.code === "es" ? "Español" : "English"}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mt-3">
          <GenderChip active={filterGender === "all"} onClick={() => setFilterGender("all")}>{t("voices_all")}</GenderChip>
          <GenderChip active={filterGender === "female"} onClick={() => setFilterGender("female")} icon={<UserRound className="w-3.5 h-3.5" />}>{t("voices_female")}</GenderChip>
          <GenderChip active={filterGender === "male"} onClick={() => setFilterGender("male")} icon={<User className="w-3.5 h-3.5" />}>{t("voices_male")}</GenderChip>
        </div>
      </div>

      {isProviderLocked(provider) && (
        <div className="card border-primary/30 bg-primary/5">
          <div className="flex items-start gap-2">
            <Crown className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-soft">
              {t("voices_provider_members_only", { provider: t(PROVIDERS.find((p) => p.id === provider)!.labelKey) })}
            </p>
          </div>
        </div>
      )}

      {effectiveProvider === "elevenlabs" && voiceManager.elevenlabsVoicesError && (
        <div className="card border-error/40 bg-error/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-error-400">
              {t("voices_err_load_list_elevenlabs", { error: voiceManager.elevenlabsVoicesError ?? "" })}
            </p>
          </div>
        </div>
      )}

      {effectiveProvider === "inworld" && voiceManager.inworldVoicesError && (
        <div className="card border-error/40 bg-error/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-error-400">
              {t("voices_err_load_list_inworld", { error: voiceManager.inworldVoicesError ?? "" })}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <label className="label">
          {effectiveProvider === "elevenlabs" && voiceManager.elevenlabsVoicesLoading
            ? t("voices_loading_account_voices")
            : effectiveProvider === "inworld" && voiceManager.inworldVoicesLoading
            ? t("voices_loading_account_voices")
            : t("voices_count", { n: filteredVoices.length })}
        </label>
        <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin -mr-2 pr-2">
          {filteredVoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted">{t("voices_no_voices")}</p>
              {effectiveProvider === "browser" && !isNative && (
                <p className="text-xs text-muted-soft mt-1">{t("voices_browser_hint")}</p>
              )}
            </div>
          ) : (
            filteredVoices.map((v) => {
              const isSelected = settings.voice_id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => saveSettings({ voice_id: v.id })}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-150 flex items-center justify-between ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-bg-soft hover:bg-bg-hover"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{v.name}</p>
                      {v.gender === "female" && <span className="badge-pink text-[10px] flex-shrink-0">M</span>}
                      {v.gender === "male" && <span className="badge-blue text-[10px] flex-shrink-0">H</span>}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">{v.lang}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" strokeWidth={2.5} />}
                </button>
              );
            })
          )}
        </div>
      </div>

      <button
        onClick={() => setShowSettings(!showSettings)}
        className="card w-full flex items-center justify-between card-hover"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted" />
          <span className="text-sm font-bold text-text-soft">{t("voices_audio_settings")}</span>
        </div>
        {showSettings ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>

      {showSettings && (
        <div className="card space-y-4 animate-slide-down">
          <Slider label={t("voices_rate")} value={settings.rate} min={0.5} max={2} step={0.1} display={`${settings.rate.toFixed(1)}x`} onChange={(v) => saveSettings({ rate: v })} />
          <Slider label={t("voices_pitch")} value={settings.pitch} min={0} max={2} step={0.1} display={settings.pitch.toFixed(1)} onChange={(v) => saveSettings({ pitch: v })} />
          <Slider label={t("voices_volume")} value={settings.volume} min={0} max={1} step={0.1} display={`${Math.round(settings.volume * 100)}%`} onChange={(v) => saveSettings({ volume: v })} />
        </div>
      )}

      <div className="card flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">{t("voices_test")}</h3>
          <p className="text-xs text-muted mt-0.5">{t("voices_test_desc")}</p>
        </div>
        {speaking ? (
          <button onClick={stop} className="btn-ghost text-error-400">
            <VolumeX className="w-4 h-4" /> {t("voices_stop")}
          </button>
        ) : (
          <button onClick={preview} className="btn-primary">
            <Volume2 className="w-4 h-4" /> {t("voices_play")}
          </button>
        )}
      </div>

      {previewError && (
        <div className="card border-error/40 bg-error/10 animate-slide-down">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-error-400">{previewError}</p>
          </div>
        </div>
      )}

      {!voiceManager.available && effectiveProvider === "browser" && (
        <div className="card text-center py-12 animate-slide-up">
          <AlertCircle className="w-10 h-10 text-warning-400 mx-auto mb-3" />
          <h3 className="text-base font-bold mb-1">{t("voices_unavailable_title")}</h3>
          <p className="text-sm text-muted">{t("voices_unavailable_desc")}</p>
        </div>
      )}
    </div>

    {/* ============== DESKTOP / TABLET (md+) — rediseño ============== */}
    <div className="hidden md:block space-y-4">
      <div className="card relative overflow-hidden p-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        <div className="relative p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center glow-primary flex-shrink-0">
            <Mic className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold">{t("voices_title")}</h2>
            <p className="text-xs text-muted">{t("voices_subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <label className="label">{t("voices_engine")}</label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {VISIBLE_PROVIDERS.map((p) => (
            <DesktopEngineCard
              key={p.id}
              icon={p.icon}
              label={t(p.labelKey)}
              desc={isEngineLocked(p) ? t("voices_locked_short") : t(p.descKey)}
              isActive={provider === p.id}
              locked={isEngineLocked(p)}
              onClick={() => !isEngineLocked(p) && saveSettings({ voice_provider: p.id })}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Shuffle className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold">{t("voices_random")}</h3>
              <p className="text-xs text-muted">{t("voices_random_desc")}</p>
            </div>
          </div>
          <Switch checked={settings.voice_random} onChange={() => saveSettings({ voice_random: !settings.voice_random })} />
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Headphones className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">{t("voices_language")}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-2">
              {LANG_FILTERS.map((l) => {
                const isActive = filterLang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => setFilterLang(l.code)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 card-press ${
                      isActive ? "bg-primary text-bg" : "bg-bg-soft text-muted hover:text-text border border-border"
                    }`}
                  >
                    <span className="text-base leading-none">{l.flag}</span>
                    {l.code === "es" ? "Español" : "English"}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 ml-auto">
              <GenderChip active={filterGender === "all"} onClick={() => setFilterGender("all")}>{t("voices_all")}</GenderChip>
              <GenderChip active={filterGender === "female"} onClick={() => setFilterGender("female")} icon={<UserRound className="w-3.5 h-3.5" />}>{t("voices_female")}</GenderChip>
              <GenderChip active={filterGender === "male"} onClick={() => setFilterGender("male")} icon={<User className="w-3.5 h-3.5" />}>{t("voices_male")}</GenderChip>
            </div>
          </div>
        </div>
      </div>

      {isProviderLocked(provider) && (
        <div className="card border-primary/30 bg-primary/5">
          <div className="flex items-start gap-2">
            <Crown className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-soft">
              {t("voices_provider_members_only", { provider: t(PROVIDERS.find((p) => p.id === provider)!.labelKey) })}
            </p>
          </div>
        </div>
      )}

      {effectiveProvider === "elevenlabs" && voiceManager.elevenlabsVoicesError && (
        <div className="card border-error/40 bg-error/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-error-400">{t("voices_err_load_list_elevenlabs", { error: voiceManager.elevenlabsVoicesError ?? "" })}</p>
          </div>
        </div>
      )}
      {effectiveProvider === "inworld" && voiceManager.inworldVoicesError && (
        <div className="card border-error/40 bg-error/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-error-400">{t("voices_err_load_list_inworld", { error: voiceManager.inworldVoicesError ?? "" })}</p>
          </div>
        </div>
      )}

      <DesktopVoicesMain
        voices={filteredVoices}
        search={desktopSearch}
        setSearch={setDesktopSearch}
        settings={settings}
        saveSettings={saveSettings}
        previewingId={previewingId}
        onPreview={previewVoiceRow}
        loading={
          (effectiveProvider === "elevenlabs" && voiceManager.elevenlabsVoicesLoading) ||
          (effectiveProvider === "inworld" && voiceManager.inworldVoicesLoading)
        }
        effectiveProvider={effectiveProvider}
        isNative={isNative}
        t={t}
      />

      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold">{t("voices_test")}</h3>
            <p className="text-xs text-muted mt-0.5">{t("voices_test_desc_long")}</p>
          </div>
        </div>
        {speaking ? (
          <button onClick={stop} className="btn-ghost text-error-400 flex-shrink-0">
            <VolumeX className="w-4 h-4" /> {t("voices_stop")}
          </button>
        ) : (
          <button onClick={preview} className="btn-primary flex-shrink-0">
            <Volume2 className="w-4 h-4" /> {t("voices_play")}
          </button>
        )}
      </div>

      {previewError && (
        <div className="card border-error/40 bg-error/10 animate-slide-down">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-error-400">{previewError}</p>
          </div>
        </div>
      )}

      {!voiceManager.available && effectiveProvider === "browser" && (
        <div className="card text-center py-12">
          <AlertCircle className="w-10 h-10 text-warning-400 mx-auto mb-3" />
          <h3 className="text-base font-bold mb-1">{t("voices_unavailable_title")}</h3>
          <p className="text-sm text-muted">{t("voices_unavailable_desc")}</p>
        </div>
      )}
    </div>
    </>
  );

  function isEngineLocked(p: { memberOnly?: boolean }): boolean {
    return !!p.memberOnly && !hasActiveLicense;
  }
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={`switch-track ${checked ? "switch-on" : ""}`}
    >
      <span className={`switch-thumb ${checked ? "switch-thumb-on" : ""}`} />
    </button>
  );
}

function GenderChip({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 card-press ${
        active ? "bg-primary text-bg" : "bg-bg-soft text-muted hover:text-text border border-border"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-soft">{label}</span>
        <span className="text-sm font-bold text-primary tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-bg-soft cursor-pointer accent-primary"
      />
    </div>
  );
}

// ============================================================
// Variante de escritorio/tablet (md+) — mismo estado y motor de voz que
// arriba, solo cambia la presentación. Nada de esto se renderiza en mobile.
// ============================================================

function DesktopEngineCard({ icon: Icon, label, desc, isActive, locked, onClick }: {
  icon: typeof Globe; label: string; desc: string; isActive: boolean; locked: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 card-press ${
        locked
          ? "border-border bg-bg-soft opacity-50 cursor-not-allowed"
          : isActive
          ? "border-primary bg-gradient-to-br from-primary/15 to-accent/10 shadow-lg shadow-primary/10"
          : "border-border bg-bg-soft hover:border-primary/30 hover:bg-bg-hover"
      }`}
    >
      {isActive && (
        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-bg" strokeWidth={3} />
        </span>
      )}
      {locked && (
        <span className="absolute top-2.5 right-2.5">
          <Lock className="w-3.5 h-3.5 text-muted" />
        </span>
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "bg-primary/20 text-primary" : "bg-bg-hover text-muted"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-sm font-bold">{label}</span>
      <span className="text-[11px] text-muted text-center leading-tight">{desc}</span>
    </button>
  );
}

function DesktopVoicesMain({
  voices, search, setSearch, settings, saveSettings, previewingId, onPreview, loading, effectiveProvider, isNative, t,
}: {
  voices: VoiceInfo[];
  search: string;
  setSearch: (v: string) => void;
  settings: Settings;
  saveSettings: (patch: Partial<Settings>) => void;
  previewingId: string | null;
  onPreview: (v: VoiceInfo) => void;
  loading: boolean;
  effectiveProvider: VoiceProvider;
  isNative: boolean;
  t: TFunc;
}) {
  // Búsqueda por nombre — client-side sobre la lista real ya filtrada por
  // idioma/género más arriba, no un catálogo aparte.
  const q = search.trim().toLowerCase();
  const visible = q ? voices.filter((v) => v.name.toLowerCase().includes(q)) : voices;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-center">
      <div className="card p-0 overflow-hidden flex flex-col h-[520px]">
        <div className="flex-shrink-0 flex items-center justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">{loading ? t("voices_loading_account_voices") : t("voices_count", { n: visible.length })}</h3>
              <p className="text-[11px] text-muted truncate">{t("voices_list_desc")}</p>
            </div>
          </div>
          <div className="relative w-52 flex-shrink-0">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("voices_search_placeholder")}
              className="input pl-8 text-xs py-2"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin divide-y divide-border">
          {visible.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-muted">{t("voices_no_voices")}</p>
              {effectiveProvider === "browser" && !isNative && (
                <p className="text-xs text-muted-soft mt-1">{t("voices_browser_hint")}</p>
              )}
            </div>
          ) : (
            visible.map((v) => (
              <DesktopVoiceRow
                key={v.id}
                voice={v}
                isSelected={settings.voice_id === v.id}
                isPreviewing={previewingId === v.id}
                onSelect={() => saveSettings({ voice_id: v.id })}
                onPreview={() => onPreview(v)}
                t={t}
              />
            ))
          )}
        </div>
      </div>

      <DesktopAudioSettings settings={settings} saveSettings={saveSettings} effectiveProvider={effectiveProvider} t={t} />
    </div>
  );
}

function DesktopVoiceRow({ voice, isSelected, isPreviewing, onSelect, onPreview, t }: {
  voice: VoiceInfo;
  isSelected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onPreview: () => void;
  t: TFunc;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-bg-hover/60"}`}>
      <button
        onClick={onPreview}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isPreviewing ? "bg-primary text-bg" : "bg-bg-soft text-muted hover:text-primary border border-border"
        }`}
        title={t("voices_preview_sample_aria")}
        aria-label={t("voices_preview_sample_aria")}
      >
        {isPreviewing ? <Pause className="w-3.5 h-3.5" fill="currentColor" /> : <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />}
      </button>

      {/* Ningún motor (Navegador/Google/Inworld/ElevenLabs) da una foto por
          voz — ícono consistente en vez de inventar un avatar personal. */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/25 to-accent/25 flex items-center justify-center flex-shrink-0 border border-border">
        <Mic className="w-4 h-4 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{voice.name}</p>
          {voice.gender === "female" && <span className="badge-pink text-[10px] flex-shrink-0">M</span>}
          {voice.gender === "male" && <span className="badge-blue text-[10px] flex-shrink-0">H</span>}
        </div>
        <p className="text-[11px] text-muted truncate">{voice.lang === "multi" ? "Multi" : voice.lang}</p>
      </div>

      <button
        onClick={onSelect}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
          isSelected ? "bg-primary/15 text-primary border border-primary/40" : "bg-bg-soft text-muted hover:text-text border border-border"
        }`}
      >
        {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
        {t("voices_select")}
      </button>
    </div>
  );
}

function DesktopAudioSettings({ settings, saveSettings, effectiveProvider, t }: {
  settings: Settings;
  saveSettings: (patch: Partial<Settings>) => void;
  effectiveProvider: VoiceProvider;
  t: TFunc;
}) {
  const rateOk = engineSupportsRate(effectiveProvider);
  const pitchOk = engineSupportsPitch(effectiveProvider);
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-accent" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold">{t("voices_audio_settings")}</h3>
          <p className="text-[11px] text-muted">{t("voices_audio_desc")}</p>
        </div>
      </div>

      <IconSlider
        icon={Volume2}
        label={t("voices_volume_general")}
        value={settings.volume}
        min={0} max={1} step={0.1}
        display={`${Math.round(settings.volume * 100)}%`}
        onChange={(v) => saveSettings({ volume: v })}
      />
      <IconSlider
        icon={Gauge}
        label={t("voices_rate_label")}
        value={settings.rate}
        min={0.5} max={2} step={0.1}
        display={`${settings.rate.toFixed(1)}x`}
        onChange={(v) => saveSettings({ rate: v })}
        disabled={!rateOk}
        disabledReason={t("voices_not_supported")}
      />
      <IconSlider
        icon={Settings2}
        label={t("voices_pitch_label")}
        value={settings.pitch}
        min={0} max={2} step={0.1}
        display={settings.pitch.toFixed(1)}
        onChange={(v) => saveSettings({ pitch: v })}
        disabled={!pitchOk}
        disabledReason={t("voices_not_supported")}
      />
      {/* No existe ningún ajuste de "pausa entre mensajes" en LiveNest hoy
          (ni en Settings, ni en voiceManager, ni en el backend) — se
          muestra para calzar con la referencia visual, pero siempre
          inactivo en vez de fingir un control que no hace nada. */}
      <IconSlider
        icon={Timer}
        label={t("voices_pause_label")}
        value={0.5}
        min={0} max={2} step={0.1}
        display="0.5s"
        onChange={() => {}}
        disabled
        disabledReason={t("voices_feature_unavailable")}
      />

      <button
        onClick={() => saveSettings({ rate: 1, pitch: 1, volume: 1 })}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-soft border border-border text-xs font-bold text-muted hover:text-text transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        {t("voices_reset_settings")}
      </button>
    </div>
  );
}

function IconSlider({ icon: Icon, label, value, min, max, step, display, onChange, disabled, disabledReason }: {
  icon: typeof Volume2;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <div className={disabled ? "opacity-40" : undefined} title={disabled ? disabledReason : undefined}>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-sm text-text-soft">
          <Icon className="w-3.5 h-3.5 text-muted flex-shrink-0" />
          {label}
        </span>
        <span className="text-sm font-bold text-primary tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-bg-soft cursor-pointer accent-primary disabled:cursor-not-allowed"
      />
    </div>
  );
}
