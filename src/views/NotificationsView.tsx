import { Capacitor } from "@capacitor/core";
import { useStore } from "../lib/store";
import { useI18n, type TranslationKey } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { soundManager, isCustomSoundUrl, type SoundType } from "../lib/soundManager";
import { uploadAlertSound, uploadOverlayImage, type Settings } from "../lib/supabase";
import { resolveOverlayAlert } from "../lib/alertPhrase";
import {
  normalizeOverlayConfig, OVERLAY_ANIMATIONS, OVERLAY_FONTS,
  type OverlayEventType, type OverlayEventConfig, type OverlayAnimation, type OverlayFont,
} from "../lib/overlayConfig";
import { OverlayAlertCard } from "../components/OverlayAlertCard";
import {
  Bell, Volume2, Gift, Heart, UserPlus, Share2, Crown,
  Play, Mic, ChevronDown, Upload, Loader2, RotateCcw, Lock,
  MonitorPlay, Copy, Check, RefreshCw,
} from "lucide-react";
import { useRef, useState } from "react";

// Antes esta pantalla estaba organizada por CANAL (una tarjeta de sonidos
// con los 5 eventos, después una de voz con los mismos 5, después el
// overlay con 4 más) — para configurar "regalo" del todo había que
// saltar entre tres tarjetas distintas. Ahora está organizada por EVENTO:
// una fila por tipo (regalo/seguidor/sub/compartido/like), y adentro de
// cada una están sus tres canales juntos.
type EventId = "gift" | "follow" | "sub" | "share" | "like";

const EVENT_DEFS: {
  id: EventId;
  labelKey: TranslationKey;
  icon: typeof Gift;
  color: string;
  bg: string;
  soundKey: keyof Settings;
  voiceKey: keyof Settings;
  overlayType: OverlayEventType | null;
}[] = [
  { id: "gift", labelKey: "notif_gifts", icon: Gift, color: "text-amber-400", bg: "bg-amber-500/10", soundKey: "notif_gift_sound", voiceKey: "notif_voice_gift", overlayType: "gift" },
  { id: "follow", labelKey: "notif_followers", icon: UserPlus, color: "text-primary", bg: "bg-primary/10", soundKey: "notif_follow_sound", voiceKey: "notif_voice_follow", overlayType: "follow" },
  { id: "sub", labelKey: "notif_subs", icon: Crown, color: "text-accent", bg: "bg-accent/10", soundKey: "notif_sub_sound", voiceKey: "notif_voice_sub", overlayType: "sub" },
  { id: "share", labelKey: "notif_shares", icon: Share2, color: "text-sky-400", bg: "bg-sky-500/10", soundKey: "notif_share_sound", voiceKey: "notif_voice_share", overlayType: "share" },
  { id: "like", labelKey: "notif_likes", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10", soundKey: "notif_like_sound", voiceKey: "notif_voice_like", overlayType: null },
];

const OVERLAY_ANIMATION_LABEL_KEY: Record<OverlayAnimation, TranslationKey> = {
  slide: "notif_overlay_anim_slide",
  fade: "notif_overlay_anim_fade",
  pop: "notif_overlay_anim_pop",
  bounce: "notif_overlay_anim_bounce",
};
const OVERLAY_FONT_LABEL_KEY: Record<OverlayFont, TranslationKey> = {
  clean: "notif_overlay_font_clean",
  impact: "notif_overlay_font_impact",
};

// Datos de ejemplo para el preview — nunca simula la imagen "real" del
// regalo (eso solo lo manda TikTok durante un directo real), así que con
// use_real_gift_image activado el preview cae a la imagen propia o al
// ícono, igual que pasaría si TikTok no manda esa imagen para la cuenta.
function overlaySampleVars(type: OverlayEventType): { name: string; gift?: string; count?: number } {
  return type === "gift" ? { name: "María", gift: "Rosa", count: 3 } : { name: "María" };
}

const SOUND_VALUES: SoundType[] = [
  "chime", "pop", "bell", "coin", "ding", "whoosh", "sparkle", "buzzer",
  "success", "error", "notify", "heartbeat", "laser", "bubble", "click", "fanfare",
  "airhorn", "clap", "cash", "explosion", "levelup", "rimshot", "alarm", "tada",
  "drumroll", "boing", "zap", "rainbow", "powerup", "gameover", "siren", "whistle", "none",
];

const SOUND_ICONS: Record<SoundType, string> = {
  chime: "🔔", pop: "🫧", bell: "🛎️", coin: "🪙", ding: "✨", whoosh: "💨",
  sparkle: "⭐", buzzer: "🚨", success: "✅", error: "❌", notify: "📢",
  heartbeat: "❤️", laser: "🔫", bubble: "🔵", click: "🖱️", fanfare: "🎺",
  airhorn: "📯", clap: "👏", cash: "💰", explosion: "💥", levelup: "🆙",
  rimshot: "🥁", alarm: "⏰", tada: "🎉", drumroll: "🥁", boing: "🌀",
  zap: "⚡", rainbow: "🌈", powerup: "🎮", gameover: "👾", siren: "🚓",
  whistle: "📢", none: "🔇",
};

const SOUND_LABEL_KEYS: Record<SoundType, TranslationKey> = {
  chime: "snd_chime", pop: "snd_pop", bell: "snd_bell", coin: "snd_coin",
  ding: "snd_ding", whoosh: "snd_whoosh", sparkle: "snd_sparkle", buzzer: "snd_buzzer",
  success: "snd_success", error: "snd_error", notify: "snd_notify", heartbeat: "snd_heartbeat",
  laser: "snd_laser", bubble: "snd_bubble", click: "snd_click", fanfare: "snd_fanfare",
  airhorn: "snd_airhorn", clap: "snd_clap", cash: "snd_cash", explosion: "snd_explosion",
  levelup: "snd_levelup", rimshot: "snd_rimshot", alarm: "snd_alarm", tada: "snd_tada",
  drumroll: "snd_drumroll", boing: "snd_boing", zap: "snd_zap", rainbow: "snd_rainbow",
  powerup: "snd_powerup", gameover: "snd_gameover", siren: "snd_siren", whistle: "snd_whistle",
  none: "snd_none",
};

export function NotificationsView() {
  const { hasActiveLicense } = useAuth();
  const settings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);
  // El overlay es para pegar en OBS/Streamlabs — software de escritorio.
  // En la app nativa (streamers transmitiendo desde el celular) no aplica
  // para nada, así que ni se muestra: solo sonido y voz. Sigue completo
  // en la web, que es donde tiene sentido.
  const isNative = Capacitor.isNativePlatform();

  const [expandedEvent, setExpandedEvent] = useState<EventId | null>(null);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [overlayAdvancedOpen, setOverlayAdvancedOpen] = useState(false);
  const [uploadingSound, setUploadingSound] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [overlayCopied, setOverlayCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [previewType, setPreviewType] = useState<OverlayEventType | null>(null);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [overlayImgUploading, setOverlayImgUploading] = useState(false);
  const [overlayImgError, setOverlayImgError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const overlayFileInput = useRef<HTMLInputElement | null>(null);
  const { t } = useI18n();

  if (!settings) return <div className="card animate-pulse h-48" />;

  const overlayConfig = normalizeOverlayConfig(settings.overlay_config);

  const preview = (value: string) => {
    soundManager.setVolume(settings.notif_volume);
    if (isCustomSoundUrl(value)) {
      soundManager.playUrl(value);
    } else {
      soundManager.play(value as SoundType);
    }
  };

  const handleSoundUpload = async (soundKey: string, file: File | undefined) => {
    if (!file) return;
    if (!hasActiveLicense) {
      setUploadError(t("notif_err_upload_members_only"));
      return;
    }
    setUploadError(null);
    setUploadingSound(true);
    try {
      const url = await uploadAlertSound(file, soundKey);
      soundManager.preloadUrl(url);
      await saveSettings({ [soundKey]: url } as any);
      preview(url);
    } catch (err: any) {
      setUploadError(err?.message || t("notif_err_upload_generic"));
    } finally {
      setUploadingSound(false);
    }
  };

  // Mismo origen + BASE_URL que usa auth.tsx para el redirect de Google —
  // así funciona igual en local, en preview y en producción sin
  // hardcodear livenest.net acá.
  const overlayUrl = `${window.location.origin}${import.meta.env.BASE_URL}?overlay=${settings.overlay_token}`;

  const copyOverlayUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setOverlayCopied(true);
    setTimeout(() => setOverlayCopied(false), 2000);
  };

  const regenerateOverlayToken = async () => {
    setRegenerating(true);
    try {
      await saveSettings({ overlay_token: crypto.randomUUID() });
    } finally {
      setRegenerating(false);
    }
  };

  const updateOverlayEvent = (type: OverlayEventType, patch: Partial<OverlayEventConfig>) => {
    saveSettings({ overlay_config: { ...overlayConfig, [type]: { ...overlayConfig[type], ...patch } } });
  };

  // Vuelve a jugar la animación de entrada del cartel — útil para ver el
  // efecto real de cambiar la animación, no solo el contenido (que ya se
  // actualiza solo, en vivo, mientras se escribe/elige algo).
  const playOverlayPreview = (type: OverlayEventType) => {
    setPreviewType(type);
    setPreviewVisible(false);
    setTimeout(() => setPreviewVisible(true), 20);
  };

  const handleOverlayImageUpload = async (type: OverlayEventType, file: File | undefined) => {
    if (!file) return;
    if (!hasActiveLicense) {
      setOverlayImgError(t("notif_overlay_err_upload_members_only"));
      return;
    }
    setOverlayImgError(null);
    setOverlayImgUploading(true);
    try {
      const url = await uploadOverlayImage(file, type);
      updateOverlayEvent(type, { image_url: url });
    } catch (err: any) {
      setOverlayImgError(err?.message || t("notif_err_upload_generic"));
    } finally {
      setOverlayImgUploading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-bold">{t("notif_page_title")}</h2>
          <p className="text-xs text-muted">{t("notif_page_subtitle")}</p>
        </div>
      </div>

      {/* Interruptores generales — solo sonido y voz. El overlay no tiene
          uno global a propósito: se prende evento por evento más abajo, y
          si no pegaste la URL en OBS no se ve en ningún lado igual. */}
      <div className="card space-y-3">
        <p className="label px-0">{t("notif_channels_title")}</p>
        <p className="text-[11px] text-muted -mt-2">{t("notif_channels_subtitle")}</p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary" /> {t("notif_channel_sound_label")}
          </span>
          <Switch
            checked={settings.notif_sound_enabled}
            onChange={() => saveSettings({ notif_sound_enabled: !settings.notif_sound_enabled })}
          />
        </div>
        {settings.notif_sound_enabled && (
          <div className="flex items-center gap-3 pl-6 animate-slide-down">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.notif_volume}
              onChange={(e) => saveSettings({ notif_volume: parseFloat(e.target.value) })}
              className="flex-1 h-2 rounded-full appearance-none bg-bg-soft cursor-pointer accent-primary"
            />
            <span className="text-xs font-semibold text-primary tabular-nums w-9 text-right">
              {Math.round(settings.notif_volume * 100)}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Mic className="w-4 h-4 text-accent" /> {t("notif_channel_voice_label")}
          </span>
          <Switch
            checked={settings.notif_voice_enabled}
            onChange={() => saveSettings({ notif_voice_enabled: !settings.notif_voice_enabled })}
          />
        </div>
      </div>

      {/* Setup del overlay — se hace una sola vez, antes de tocar los
          interruptores por evento de más abajo. Solo en la web: es para
          pegar en OBS, software de escritorio. */}
      {!isNative && (
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <MonitorPlay className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold">{t("notif_overlay_title")}</h2>
              <p className="text-xs text-muted">{t("notif_overlay_subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={overlayUrl}
              onFocus={(e) => e.target.select()}
              className="input flex-1 text-xs font-mono"
            />
            <button onClick={copyOverlayUrl} className="btn-ghost text-xs px-3 flex-shrink-0">
              {overlayCopied ? <Check className="w-3.5 h-3.5 text-success-400" /> : <Copy className="w-3.5 h-3.5" />}
              {overlayCopied ? t("notif_overlay_copied") : t("notif_overlay_copy")}
            </button>
          </div>
          <p className="text-[11px] text-muted">{t("notif_overlay_hint")}</p>
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-border">
            <p className="text-[11px] text-muted flex-1">{t("notif_overlay_regenerate_hint")}</p>
            <button onClick={regenerateOverlayToken} disabled={regenerating} className="btn-ghost text-xs px-3 flex-shrink-0 disabled:opacity-60">
              {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {t("notif_overlay_regenerate")}
            </button>
          </div>
        </div>
      )}

      {/* El corazón de la reorganización: una fila por evento, con sus
          canales (sonido/voz, y overlay en la web) juntos adentro. */}
      <div className="space-y-2">
        {EVENT_DEFS.map((def) => {
          const Icon = def.icon;
          const isExpanded = expandedEvent === def.id;
          const rawSound = settings[def.soundKey] as string;
          const isCustomSound = isCustomSoundUrl(rawSound);
          const voiceOn = settings[def.voiceKey] as boolean;
          const overlayCfg = !isNative && def.overlayType ? overlayConfig[def.overlayType] : null;

          const soundOn = settings.notif_sound_enabled && rawSound !== "none";
          const voiceActuallyOn = settings.notif_voice_enabled && voiceOn;
          const overlayOn = overlayCfg?.enabled ?? false;
          const nothingOn = !soundOn && !voiceActuallyOn && !overlayOn;

          return (
            <div key={def.id} className="card p-0 overflow-hidden">
              <button
                onClick={() => setExpandedEvent(isExpanded ? null : def.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <div className={`w-10 h-10 rounded-xl ${def.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${def.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-soft">{t(def.labelKey)}</p>
                  {nothingOn ? (
                    <p className="text-xs text-muted">{t("notif_channel_all_off")}</p>
                  ) : (
                    <div className="flex items-center gap-3 mt-0.5">
                      <Volume2 className={`w-3.5 h-3.5 ${soundOn ? "text-primary" : "text-muted opacity-30"}`} />
                      <Mic className={`w-3.5 h-3.5 ${voiceActuallyOn ? "text-accent" : "text-muted opacity-30"}`} />
                      {!isNative && def.overlayType && (
                        <MonitorPlay className={`w-3.5 h-3.5 ${overlayOn ? "text-pink-400" : "text-muted opacity-30"}`} />
                      )}
                    </div>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-muted flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {isExpanded && (
                <div className="px-3 pb-4 space-y-4 border-t border-border animate-slide-down">
                  {/* Sonido */}
                  <div className="pt-3">
                    <p className="label mb-1.5">{t("notif_channel_sound_label")}</p>
                    {!settings.notif_sound_enabled ? (
                      <p className="text-[11px] text-muted">{t("notif_channel_sound_off_hint")}</p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => preview(rawSound)}
                            className="w-9 h-9 rounded-lg bg-bg-soft border border-border text-muted hover:text-accent flex items-center justify-center transition-colors flex-shrink-0"
                            title={t("notif_test")}
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSoundPickerOpen((v) => !v)}
                            className="flex-1 flex items-center gap-2 rounded-lg bg-bg-soft border border-border px-3 py-2 text-left hover:border-primary transition-colors"
                          >
                            <span>{isCustomSound ? "🎵" : SOUND_ICONS[rawSound as SoundType]}</span>
                            <span className="text-xs text-text-soft truncate flex-1">
                              {isCustomSound ? t("notif_custom_sound") : t(SOUND_LABEL_KEYS[rawSound as SoundType])}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${soundPickerOpen ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        {soundPickerOpen && (
                          <div className="mt-3 space-y-3 animate-slide-down">
                            <input
                              ref={fileInput}
                              type="file"
                              accept="audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
                              className="hidden"
                              disabled={!hasActiveLicense}
                              onChange={(e) => handleSoundUpload(def.soundKey as string, e.target.files?.[0])}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => hasActiveLicense && fileInput.current?.click()}
                                disabled={uploadingSound || !hasActiveLicense}
                                className="btn-ghost flex-1 text-xs disabled:opacity-60"
                                title={!hasActiveLicense ? t("members_only_tooltip") : undefined}
                              >
                                {uploadingSound ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : !hasActiveLicense ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5" />
                                )}
                                {uploadingSound ? t("notif_uploading") : t("notif_upload_custom")}
                              </button>
                              {isCustomSound && (
                                <button
                                  onClick={() => saveSettings({ [def.soundKey]: "chime" } as any)}
                                  className="btn-ghost text-xs px-3"
                                  title={t("notif_use_builtin")}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {!hasActiveLicense && (
                              <p className="text-[10px] text-amber-400 flex items-center gap-1">
                                <Crown className="w-3 h-3 flex-shrink-0" /> {t("notif_custom_members_only")}
                              </p>
                            )}
                            <div className="grid grid-cols-3 gap-1.5">
                              {SOUND_VALUES.map((val) => {
                                const isActive = !isCustomSound && rawSound === val;
                                return (
                                  <button
                                    key={val}
                                    onClick={() => {
                                      saveSettings({ [def.soundKey]: val } as any);
                                      preview(val);
                                    }}
                                    className={`flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg transition-all duration-150 card-press ${
                                      isActive ? "bg-accent text-bg" : "bg-bg-soft text-muted hover:text-text border border-border"
                                    }`}
                                  >
                                    <span className="text-base leading-none">{SOUND_ICONS[val]}</span>
                                    <span className="text-[9px] font-semibold leading-tight text-center">{t(SOUND_LABEL_KEYS[val])}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Voz */}
                  <div className="pt-3 border-t border-border">
                    <p className="label mb-1.5">{t("notif_channel_voice_label")}</p>
                    {!settings.notif_voice_enabled ? (
                      <p className="text-[11px] text-muted">{t("notif_channel_voice_off_hint")}</p>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-soft">{t("notif_channel_voice_label")}</span>
                        <Switch checked={voiceOn} onChange={() => saveSettings({ [def.voiceKey]: !voiceOn } as any)} />
                      </div>
                    )}
                  </div>

                  {/* Overlay visual — solo en la web, ver isNative arriba */}
                  {!isNative && (
                  <div className="pt-3 border-t border-border">
                    <p className="label mb-1.5">{t("notif_channel_overlay_label")}</p>
                    {!def.overlayType || !overlayCfg ? (
                      <p className="text-[11px] text-muted">{t("notif_channel_likes_no_overlay")}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text-soft">{t("notif_channel_overlay_label")}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => playOverlayPreview(def.overlayType!)}
                              className="w-8 h-8 rounded-lg bg-bg-soft border border-border text-muted hover:text-accent flex items-center justify-center transition-colors flex-shrink-0"
                              title={t("notif_overlay_play_preview")}
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <Switch
                              checked={overlayCfg.enabled}
                              onChange={() => updateOverlayEvent(def.overlayType!, { enabled: !overlayCfg.enabled })}
                            />
                          </div>
                        </div>

                        {previewType === def.overlayType && (
                          <div className="relative rounded-xl bg-black/40 border border-border p-4 flex items-center justify-center min-h-[88px] overflow-hidden">
                            <div className={overlayCfg.enabled ? "" : "opacity-30"}>
                              <OverlayAlertCard
                                alert={resolveOverlayAlert(settings, def.overlayType, overlaySampleVars(def.overlayType))}
                                visible={previewVisible}
                              />
                            </div>
                            {!overlayCfg.enabled && (
                              <p className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-bold text-muted uppercase tracking-wide">
                                {t("notif_overlay_disabled")}
                              </p>
                            )}
                          </div>
                        )}

                        <div>
                          <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1.5">{t("notif_overlay_animation")}</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {OVERLAY_ANIMATIONS.map((anim) => (
                              <button
                                key={anim}
                                onClick={() => updateOverlayEvent(def.overlayType!, { animation: anim })}
                                className={`px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors card-press ${
                                  overlayCfg.animation === anim ? "bg-primary text-bg" : "bg-bg-soft text-muted hover:text-text border border-border"
                                }`}
                              >
                                {t(OVERLAY_ANIMATION_LABEL_KEY[anim])}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1.5">{t("notif_overlay_font")}</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {OVERLAY_FONTS.map((font) => (
                              <button
                                key={font}
                                onClick={() => updateOverlayEvent(def.overlayType!, { font })}
                                className={`px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors card-press ${
                                  overlayCfg.font === font ? "bg-primary text-bg" : "bg-bg-soft text-muted hover:text-text border border-border"
                                }`}
                              >
                                {t(OVERLAY_FONT_LABEL_KEY[font])}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setOverlayAdvancedOpen((v) => !v)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${overlayAdvancedOpen ? "rotate-180" : ""}`} />
                          {t("notif_overlay_advanced")}
                        </button>

                        {overlayAdvancedOpen && (
                          <div className="space-y-4 animate-slide-down">
                            <div>
                              <p className="label mb-1.5">{t("notif_overlay_text_label")}</p>
                              <input
                                type="text"
                                value={overlayCfg.text_template ?? ""}
                                onChange={(e) => updateOverlayEvent(def.overlayType!, { text_template: e.target.value || null })}
                                placeholder={resolveOverlayAlert(settings, def.overlayType, overlaySampleVars(def.overlayType)).title}
                                className="input text-xs"
                              />
                              <p className="text-[10px] text-muted mt-1">{t("notif_overlay_text_hint")}</p>
                            </div>

                            <div>
                              <p className="label mb-1.5">{t("notif_overlay_image_label")}</p>
                              <input
                                ref={overlayFileInput}
                                type="file"
                                accept="image/png,image/gif,image/jpeg,image/webp,.png,.gif,.jpg,.jpeg,.webp"
                                className="hidden"
                                disabled={!hasActiveLicense}
                                onChange={(e) => handleOverlayImageUpload(def.overlayType!, e.target.files?.[0])}
                              />
                              <div className="flex items-center gap-2">
                                {overlayCfg.image_url && (
                                  <img src={overlayCfg.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0" />
                                )}
                                <button
                                  onClick={() => hasActiveLicense && overlayFileInput.current?.click()}
                                  disabled={overlayImgUploading || !hasActiveLicense}
                                  className="btn-ghost flex-1 text-xs disabled:opacity-60"
                                  title={!hasActiveLicense ? t("members_only_tooltip") : undefined}
                                >
                                  {overlayImgUploading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : !hasActiveLicense ? (
                                    <Lock className="w-3.5 h-3.5" />
                                  ) : (
                                    <Upload className="w-3.5 h-3.5" />
                                  )}
                                  {overlayImgUploading ? t("notif_uploading") : t("notif_overlay_image_upload")}
                                </button>
                                {overlayCfg.image_url && (
                                  <button
                                    onClick={() => updateOverlayEvent(def.overlayType!, { image_url: null })}
                                    className="btn-ghost text-xs px-3"
                                    title={t("notif_overlay_image_remove")}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              {!hasActiveLicense && (
                                <p className="text-[10px] text-amber-400 mt-1.5 flex items-center gap-1">
                                  <Crown className="w-3 h-3 flex-shrink-0" /> {t("notif_overlay_image_members_only")}
                                </p>
                              )}
                              {overlayImgError && <p className="text-xs text-red-400 mt-1.5">{overlayImgError}</p>}
                            </div>

                            {def.id === "gift" && (
                              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-text-soft">{t("notif_overlay_use_real_gift")}</p>
                                  <p className="text-[10px] text-muted mt-0.5">{t("notif_overlay_use_real_gift_hint")}</p>
                                </div>
                                <Switch
                                  checked={overlayCfg.use_real_gift_image}
                                  onChange={() => updateOverlayEvent(def.overlayType!, { use_real_gift_image: !overlayCfg.use_real_gift_image })}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
