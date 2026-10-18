import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  Play, Pause, SkipForward, Volume2, Music, AlertCircle, RefreshCw,
  Gift, Heart, UserPlus, Share2, Crown, Users, Bell, MessageCircle,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { ytPlayer, type PlayerState } from "../lib/youtubePlayer";
import { fetchTikTokAvatar, proxiedAvatar } from "../lib/tiktokProfile";
import { shortenDefaultUsername } from "../lib/voiceManager";
import type { LiveEvent, LiveEventType } from "../lib/supabase";
import type { TabId } from "../App";

/*
Dashboard de escritorio (lg+), rediseñado a partir de una referencia visual
dada por el usuario: tarjeta de canal arriba, chat + alertas/música en el
medio, estadísticas abajo. Todo en una sola pantalla fija, sin scroll de
página — el único scroll real vive DENTRO de la lista de mensajes y de la
lista de alertas (pedido explícito de la referencia), nunca en el resto.

Chat/Alertas/Música YA NO se arman reusando ChatView/EventsView/MusicView
completos (esos traen formulario de conexión, barra de uso TTS, gestión de
cola/playlists/historial/ajustes — nada de eso aparece en la referencia, y
son los mismos componentes que usa el mobile real, así que tocarlos por
dentro habría afectado esa pantalla también). En su lugar, cada panel de
acá es una vista compacta y de solo lectura que lee el mismo estado real
del store/ytPlayer — nunca datos inventados — y deja la gestión completa
(conectar un canal nuevo desde cero con validaciones largas, armar
playlists, ver historial, tocar ajustes) en sus pestañas de siempre
(Canales, Música, Alertas/Notificaciones), a las que los botones "Ver
todas"/"Biblioteca" apuntan.
*/

function PanelShell({ title, icon, action, children, grow }: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  grow: number;
}) {
  return (
    <div
      style={{ flex: `${grow} 1 0` }}
      className="min-w-0 min-h-0 flex flex-col rounded-2xl border border-border bg-bg-card overflow-hidden"
    >
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-bg-soft">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-xs font-bold text-text-soft truncate">{title}</span>
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Tarjeta del canal conectado
// ---------------------------------------------------------------------

function ChannelCard() {
  const status = useStore((s) => s.status);
  const username = useStore((s) => s.username);
  const connect = useStore((s) => s.connect);
  const disconnect = useStore((s) => s.disconnect);
  const error = useStore((s) => s.error);
  const reconnecting = useStore((s) => s.reconnecting);
  const notLiveUser = useStore((s) => s.notLiveUser);
  const notLiveReason = useStore((s) => s.notLiveReason);
  const { t } = useI18n();
  const [connectInput, setConnectInput] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  useEffect(() => {
    if (!username) {
      setAvatar(null);
      return;
    }
    let cancelled = false;
    fetchTikTokAvatar(username).then((url) => {
      if (!cancelled) setAvatar(url);
    });
    return () => { cancelled = true; };
  }, [username]);

  return (
    <div className="card flex-shrink-0">
      <div className="flex items-center gap-3">
        {isConnected || isConnecting ? (
          avatar ? (
            <img src={proxiedAvatar(avatar, 96)} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-border" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold flex-shrink-0 border border-border">
              {username.slice(0, 2).toUpperCase()}
            </div>
          )
        ) : (
          <div className="w-11 h-11 rounded-full bg-bg-hover flex items-center justify-center flex-shrink-0 border border-border">
            <TikTokGlyph className="w-5 h-5 text-muted" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {isConnected || isConnecting ? (
            <>
              <p className="text-sm font-bold truncate">@{shortenDefaultUsername(username)}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? "bg-success-400 animate-pulse-soft" : "bg-warning-400 animate-pulse-soft"}`} />
                <span className="text-xs text-muted">{isConnected ? t("dash_connected") : t("status_connecting")}</span>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">@</span>
                <input
                  type="text"
                  value={connectInput}
                  onChange={(e) => setConnectInput(e.target.value)}
                  placeholder={t("chat_user_placeholder")}
                  className="input pl-8 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") connect(connectInput); }}
                />
              </div>
              <button onClick={() => connect(connectInput)} className="btn-primary">
                <Play className="w-4 h-4" /> {t("chat_connect")}
              </button>
            </div>
          )}
        </div>

        {(isConnected || isConnecting) && (
          <button onClick={disconnect} className="btn-ghost text-red-400 hover:bg-red-500/10 flex-shrink-0">
            <TikTokGlyph className="w-4 h-4" /> {t("dash_disconnect")}
          </button>
        )}
      </div>

      {reconnecting && (
        <div className="mt-3 flex items-center gap-2 text-xs text-warning-400 bg-warning-400/10 rounded-lg p-2.5">
          <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>{t("chat_reconnecting")}</span>
        </div>
      )}
      {notLiveUser && !reconnecting && (
        <div className="mt-3 flex items-center gap-2 text-xs text-warning-400 bg-warning-400/10 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notLiveReason === "invalid" ? t("chat_not_found_title") : t("chat_not_live_title")}</span>
        </div>
      )}
      {error && !reconnecting && !notLiveUser && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Chat en vivo (solo lectura — sin caja de texto ni botón de enviar)
// ---------------------------------------------------------------------

function proxiedChatAvatar(url: string): string {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=64&h=64&fit=cover&default=1`;
}

function ChatPanel() {
  const status = useStore((s) => s.status);
  const messages = useStore((s) => s.messages);
  const viewerCount = useStore((s) => s.viewerCount);
  const { t } = useI18n();
  const isConnected = status === "connected";

  return (
    <PanelShell
      title={t("dash_panel_chat")}
      icon={<MessageCircle className="w-4 h-4 text-primary flex-shrink-0" />}
      grow={2}
      action={
        isConnected ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1 text-[10px] font-bold text-success-400 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse-soft" /> {t("status_connected")}
            </span>
            {viewerCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <Users className="w-3.5 h-3.5" /> {viewerCount}
              </span>
            )}
          </div>
        ) : null
      }
    >
      {!isConnected ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-4">
          <p className="text-sm text-muted">{t("chat_connect_desc")}</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-4">
          <Volume2 className="w-6 h-6 text-muted mb-2" />
          <p className="text-sm text-muted">{t("chat_waiting")}</p>
        </div>
      ) : (
        <div className="h-full overflow-y-auto scrollbar-thin px-3 py-2 space-y-1.5">
          {messages.map((m) => (
            <ChatRow key={m.id} message={m} />
          ))}
        </div>
      )}
    </PanelShell>
  );
}

function ChatRow({ message }: {
  message: { username: string; nickname?: string | null; avatar?: string | null; message: string; skipped: boolean; created_at: string };
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const displayName = message.nickname || shortenDefaultUsername(message.username);
  const showAvatarImg = !!message.avatar && !avatarFailed;

  return (
    <div className={`flex items-start gap-2.5 py-1.5 px-1 rounded-lg hover:bg-bg-hover/50 transition-colors ${message.skipped ? "opacity-50" : ""}`}>
      {showAvatarImg ? (
        <img
          src={proxiedChatAvatar(message.avatar!)}
          alt=""
          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          loading="lazy"
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xs font-bold text-primary flex-shrink-0">{displayName}</span>
        <span className="text-xs text-text-soft break-words">{message.message}</span>
        <span className="text-[10px] text-muted-soft ml-auto tabular-nums flex-shrink-0">{time}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Alertas en tiempo real (feed compacto de eventos del live)
// ---------------------------------------------------------------------

const EVENT_ICON: Record<LiveEventType, { icon: typeof Gift; color: string; bg: string }> = {
  gift: { icon: Gift, color: "text-amber-400", bg: "bg-amber-500/15" },
  like: { icon: Heart, color: "text-pink-400", bg: "bg-pink-500/15" },
  follow: { icon: UserPlus, color: "text-primary", bg: "bg-primary/15" },
  share: { icon: Share2, color: "text-sky-400", bg: "bg-sky-500/15" },
  sub: { icon: Crown, color: "text-accent", bg: "bg-accent/15" },
  viewer: { icon: Users, color: "text-success-400", bg: "bg-success-400/15" },
};

function AlertsPanel({ onChange }: { onChange: (id: TabId) => void }) {
  const events = useStore((s) => s.events);
  const status = useStore((s) => s.status);
  const { t } = useI18n();

  return (
    <PanelShell
      title={t("dash_alerts_title")}
      icon={<Bell className="w-4 h-4 text-accent flex-shrink-0" />}
      grow={1}
      action={
        <button
          onClick={() => onChange("events")}
          className="text-[11px] font-semibold text-muted hover:text-primary transition-colors flex-shrink-0"
        >
          {t("dash_view_all")}
        </button>
      }
    >
      {events.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-4">
          <Bell className="w-6 h-6 text-muted mb-2" />
          <p className="text-xs text-muted">{status === "connected" ? t("events_waiting") : t("events_no_events_desc")}</p>
        </div>
      ) : (
        <div className="h-full overflow-y-auto scrollbar-thin px-3 py-2 space-y-1">
          {events.map((evt) => (
            <AlertRow key={evt.id} event={evt} />
          ))}
        </div>
      )}
    </PanelShell>
  );
}

function AlertRow({ event }: { event: LiveEvent }) {
  const { t } = useI18n();
  const cfg = EVENT_ICON[event.type];
  const Icon = cfg.icon;
  const time = new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const EVENT_LABEL_KEY: Record<LiveEventType, "event_gift" | "event_like" | "event_follow" | "event_share" | "event_sub" | "event_viewer"> = {
    gift: "event_gift", like: "event_like", follow: "event_follow", share: "event_share", sub: "event_sub", viewer: "event_viewer",
  };
  let detail = t(EVENT_LABEL_KEY[event.type]);
  if (event.type === "gift" && event.detail) detail = `${event.detail}${event.count > 1 ? ` x${event.count}` : ""}`;
  else if (event.type === "like" && event.count > 1) detail = `${t("event_like")} x${event.count}`;

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-bg-hover/50 transition-colors">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
        {shortenDefaultUsername(event.username).slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">@{shortenDefaultUsername(event.username)}</p>
        <p className="text-[11px] text-muted truncate">{detail}</p>
      </div>
      <span className="text-[10px] text-muted-soft tabular-nums flex-shrink-0">{time}</span>
      <div className={`w-6 h-6 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Reproductor de música (compacto — controles reales, sin gestión de
// biblioteca/playlists/historial, eso sigue viviendo en la pestaña Música)
// ---------------------------------------------------------------------

function MusicPanel({ onChange }: { onChange: (id: TabId) => void }) {
  const { hasActiveLicense } = useAuth();
  const currentSong = useStore((s) => s.currentSong);
  const skipSong = useStore((s) => s.skipSong);
  const settings = useStore((s) => s.settings);
  const { t } = useI18n();
  const [playerState, setPlayerState] = useState<PlayerState>(ytPlayer.getState());

  useEffect(() => ytPlayer.subscribe(setPlayerState), []);

  const togglePlay = useCallback(() => ytPlayer.togglePlay(), []);

  const fmtTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-shrink-0 rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-bg-soft">
        <div className="flex items-center gap-2 min-w-0">
          <Music className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs font-bold text-text-soft truncate">{t("music_title")}</span>
        </div>
        <button
          onClick={() => onChange("music")}
          className="text-[11px] font-semibold text-muted hover:text-primary transition-colors flex-shrink-0"
        >
          {t("dash_library")}
        </button>
      </div>

      {!settings ? (
        <div className="h-24 animate-pulse" />
      ) : !hasActiveLicense ? (
        <div className="p-4 text-center">
          <Crown className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="text-xs text-muted">{t("music_members_only_desc")}</p>
        </div>
      ) : (
        <div className="p-3 flex items-center gap-3">
          {currentSong?.video_id ? (
            <img
              src={`https://img.youtube.com/vi/${currentSong.video_id}/hqdefault.jpg`}
              alt=""
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-bg-hover flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-muted" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">
              {currentSong?.video_title ?? currentSong?.query ?? t("music_no_song_playing")}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-soft tabular-nums flex-shrink-0">{fmtTime(playerState.progress)}</span>
              <div className="flex-1 h-1 rounded-full bg-bg-hover overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${playerState.duration ? (playerState.progress / playerState.duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-soft tabular-nums flex-shrink-0">{fmtTime(playerState.duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={togglePlay}
              disabled={!currentSong?.video_id}
              className="w-9 h-9 rounded-full bg-primary text-bg flex items-center justify-center shadow-md shadow-primary/25 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-transform"
            >
              {playerState.isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
            </button>
            <button
              onClick={skipSong}
              disabled={!currentSong?.video_id}
              className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center text-muted hover:text-text-soft disabled:opacity-40 transition-colors"
              title={t("music_skip")}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Franja de estadísticas — misma convención de conteo que EventsView
// (cantidad de eventos registrados por tipo, no la suma de sus "count").
// ---------------------------------------------------------------------

function StatsRow() {
  const viewerCount = useStore((s) => s.viewerCount);
  const messages = useStore((s) => s.messages);
  const events = useStore((s) => s.events);
  const { t } = useI18n();

  const counts = events.reduce((acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + 1; return acc; }, {} as Record<LiveEventType, number>);

  const stats: { icon: typeof Users; label: string; value: number; color: string }[] = [
    { icon: Users, label: t("dash_stat_viewers"), value: viewerCount, color: "text-sky-400" },
    { icon: MessageCircle, label: t("dash_stat_messages"), value: messages.length, color: "text-primary" },
    { icon: Heart, label: t("dash_stat_likes"), value: counts.like ?? 0, color: "text-pink-400" },
    { icon: Gift, label: t("dash_stat_gifts"), value: counts.gift ?? 0, color: "text-amber-400" },
    { icon: UserPlus, label: t("dash_stat_followers"), value: counts.follow ?? 0, color: "text-success-400" },
  ];

  return (
    <div className="card flex-shrink-0">
      <p className="text-xs font-bold text-muted-soft uppercase tracking-wide mb-3">{t("dash_stats_title")}</p>
      <div className="grid grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1.5 py-2 rounded-xl bg-bg-soft border border-border">
            <s.icon className={`w-4 h-4 ${s.color}`} />
            <span className="text-lg font-numeric tracking-wide tabular-nums">{s.value}</span>
            <span className="text-[10px] text-muted text-center leading-tight">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 5.82c-.97-.86-1.56-2.1-1.56-3.47h-3.14v13.3a3.08 3.08 0 1 1-2.19-2.95V9.5a6.2 6.2 0 1 0 5.33 6.14V9.1a8.3 8.3 0 0 0 4.86 1.56V7.52a4.85 4.85 0 0 1-3.3-1.7Z" />
    </svg>
  );
}

export function DesktopDashboard({ onChange }: { onChange: (id: TabId) => void }) {
  return (
    <div className="h-full min-h-0 flex flex-col gap-3 px-4 lg:px-6 py-3 overflow-hidden">
      <ChannelCard />

      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
        <ChatPanel />
        <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3">
          <AlertsPanel onChange={onChange} />
          <MusicPanel onChange={onChange} />
        </div>
      </div>

      <StatsRow />
    </div>
  );
}
