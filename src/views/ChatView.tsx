import { useState, memo } from "react";
import { useStore, TTS_FREE_LIMIT } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { shortenDefaultUsername } from "../lib/voiceManager";
import { requestUpgrade } from "../components/PremiumLock";
import { Play, Square, Trash2, Volume2, AlertCircle, Loader2, Tv, RefreshCw, Crown } from "lucide-react";

export function ChatView() {
  const status = useStore((s) => s.status);
  const username = useStore((s) => s.username);
  const messages = useStore((s) => s.messages);
  const connect = useStore((s) => s.connect);
  const disconnect = useStore((s) => s.disconnect);
  const clearMessages = useStore((s) => s.clearMessages);
  const speakMessage = useStore((s) => s.speakMessage);
  const error = useStore((s) => s.error);
  const isSpeaking = useStore((s) => s.isSpeaking);
  const notLiveUser = useStore((s) => s.notLiveUser);
  const notLiveReason = useStore((s) => s.notLiveReason);
  const reconnecting = useStore((s) => s.reconnecting);
  const { hasActiveLicense } = useAuth();
  const { t } = useI18n();

  const [connectInput, setConnectInput] = useState("");

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="space-y-4 animate-fade-in">
      {notLiveUser && (
        <div className="card border-warning/40 bg-warning-400/10 animate-slide-down">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning-400/20 flex items-center justify-center flex-shrink-0">
              <Tv className="w-5 h-5 text-warning-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-warning-400">
                {notLiveReason === "invalid" ? t("chat_not_found_title") : t("chat_not_live_title")}
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {notLiveReason === "invalid"
                  ? t("chat_not_found_desc", { user: notLiveUser })
                  : t("chat_not_live_desc", { user: notLiveUser })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <label className="label">{t("chat_tiktok_user")}</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">@</span>
            <input
              type="text"
              value={isConnected ? username : connectInput}
              onChange={(e) => setConnectInput(e.target.value)}
              disabled={isConnected || isConnecting}
              placeholder={t("chat_user_placeholder")}
              className="input pl-8"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isConnected && !isConnecting) connect(connectInput);
              }}
            />
          </div>
          {isConnected ? (
            <button onClick={disconnect} className="btn-ghost text-red-400 hover:bg-red-500/10">
              <Square className="w-4 h-4" /> {t("chat_stop")}
            </button>
          ) : (
            <button
              onClick={() => connect(connectInput)}
              disabled={isConnecting}
              className="btn-primary animate-pulse-glow"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isConnecting ? "" : t("chat_connect")}
            </button>
          )}
        </div>

        {reconnecting && (
          <div className="mt-3 flex items-center gap-2 text-xs text-warning-400 bg-warning-400/10 rounded-lg p-2.5 animate-fade-in">
            <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
            <span>{t("chat_reconnecting")}</span>
          </div>
        )}

        {error && !reconnecting && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isConnected && (
          <div className="mt-3 flex items-center justify-end">
            <span className="text-xs text-muted">{t("chat_messages_count", { n: messages.length })}</span>
          </div>
        )}
      </div>

      {!hasActiveLicense && <TtsUsageBar />}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-text-soft">{t("chat_live_messages")}</h2>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs text-muted hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> {t("chat_clear")}
          </button>
        )}
      </div>

      {!isConnected ? (
        <EmptyChat />
      ) : messages.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-bg-hover flex items-center justify-center mb-3">
            <Volume2 className="w-6 h-6 text-muted" />
          </div>
          <p className="text-sm text-muted">{t("chat_waiting")}</p>
          <p className="text-xs text-muted-soft mt-1">{t("chat_waiting_hint")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onSpeak={() => speakMessage(m)}
              disabled={isSpeaking}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Barra de uso gratis de TTS — solo se monta cuando el usuario no tiene
// membresía activa (la prueba gratis de 7 días cuenta como membresía
// activa, así que tampoco se ve durante esa semana). Se suscribe directo a
// ttsUsage en el store, así que baja en tiempo real con cada mensaje que
// lee la app (consumeTtsQuota actualiza el contador de forma optimista
// apenas se lee, sin esperar la vuelta del servidor).
function TtsUsageBar() {
  const ttsUsage = useStore((s) => s.ttsUsage);
  const { t, lang } = useI18n();
  const used = Math.min(ttsUsage?.count ?? 0, TTS_FREE_LIMIT);
  const pct = Math.min(100, (used / TTS_FREE_LIMIT) * 100);
  const resetDate = ttsUsage
    ? new Date(new Date(ttsUsage.cycleStart).getTime() + 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="card p-0 overflow-hidden animate-fade-in">
      <div className="px-4 py-2.5 bg-bg-hover/60 border-b border-border">
        <span className="text-xs font-bold text-muted-soft uppercase tracking-wide">{t("chat_usage_title")}</span>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold">{t("chat_usage_tts_label")}</span>
          <span className="text-muted tabular-nums">{t("chat_usage_count", { used, limit: TTS_FREE_LIMIT })}</span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${pct >= 100 ? "bg-red-400" : "bg-text"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {resetDate && (
          <p className="text-[10px] text-muted-soft mt-1.5">
            {t("chat_usage_reset_hint", {
              date: resetDate.toLocaleTimeString(lang === "en" ? "en-US" : "es-ES", { hour: "numeric", minute: "2-digit" }),
            })}
          </p>
        )}
      </div>
      <button
        onClick={requestUpgrade}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
      >
        <Crown className="w-4 h-4" /> {t("chat_usage_unlimited_premium")}
      </button>
    </div>
  );
}

function EmptyChat() {
  const { t } = useI18n();
  return (
    <div className="card text-center py-14 animate-slide-up">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
        <Play className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-base font-bold mb-1">{t("chat_connect_title")}</h3>
      <p className="text-sm text-muted max-w-xs mx-auto">{t("chat_connect_desc")}</p>
    </div>
  );
}

// TikTok's CDN commonly blocks hot-linked <img> loads from other origins
// (the avatar URL is signed/tied to a referrer or session), so even when
// we correctly extract the URL, the browser's request gets rejected and
// onError silently falls back to initials. Route it through a public
// image proxy that fetches server-side (its own referrer) and returns a
// small, cached thumbnail — this is what actually makes the photo show.
function proxiedAvatar(url: string): string {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=96&h=96&fit=cover&default=1`;
}

const MessageBubble = memo(function MessageBubble({
  message,
  onSpeak,
  disabled,
}: {
  message: { username: string; nickname?: string | null; avatar?: string | null; message: string; skipped: boolean; read_at: string | null; created_at: string };
  onSpeak: () => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const displayName = message.nickname || shortenDefaultUsername(message.username);
  const showAvatarImg = !!message.avatar && !avatarFailed;

  return (
    <div
      className={`card card-hover flex items-start gap-3 animate-slide-up border-l-2 border-l-primary/30 ${
        message.skipped ? "opacity-50" : ""
      }`}
    >
      {showAvatarImg ? (
        <img
          src={proxiedAvatar(message.avatar!)}
          alt={displayName}
          className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-border"
          loading="lazy"
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold flex-shrink-0 border border-border">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-text">{displayName}</span>
          <span className="text-xs text-muted-soft">@{shortenDefaultUsername(message.username)}</span>
          <span className="text-[10px] text-muted-soft ml-auto tabular-nums flex-shrink-0">{time}</span>
        </div>
        {(message.skipped || message.read_at) && (
          <div className="flex items-center gap-2 mt-0.5 mb-1 flex-wrap">
            {message.skipped ? (
              <span className="badge-danger">{t("chat_filtered")}</span>
            ) : (
              <span className="badge-success">{t("chat_read")}</span>
            )}
          </div>
        )}
        <p className="text-sm text-text-soft break-words mt-1">{message.message}</p>
      </div>
      {!message.skipped && (
        <button
          onClick={onSpeak}
          disabled={disabled}
          className="text-muted hover:text-primary transition-colors flex-shrink-0 p-1.5"
          title={t("chat_read_aloud")}
        >
          <Volume2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});
