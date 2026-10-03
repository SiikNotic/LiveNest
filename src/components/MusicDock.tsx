import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { ytPlayer, type PlayerState } from "../lib/youtubePlayer";
import { Play, Pause, SkipForward, X, Music } from "lucide-react";

// Dock flotante con la canción que está sonando ahora — vive montado una
// sola vez a nivel de App (no dentro de cada vista), así que la música
// sigue visible y controlable sin importar a qué pestaña se cambie
// (Chat, Eventos...). La vista Música tiene su propio reproductor grande
// con cola/ajustes, así que este dock no se muestra ahí para no duplicar
// la misma canción dos veces en pantalla.
export function MusicDock() {
  const currentSong = useStore((s) => s.currentSong);
  const skipSong = useStore((s) => s.skipSong);
  const stopMusic = useStore((s) => s.stopMusic);
  const { t } = useI18n();
  const [playerState, setPlayerState] = useState<PlayerState>(ytPlayer.getState());

  useEffect(() => ytPlayer.subscribe(setPlayerState), []);

  if (!currentSong || !currentSong.video_id) return null;

  const pct = playerState.duration > 0 ? Math.min(100, (playerState.progress / playerState.duration) * 100) : 0;

  return (
    <div className="card p-0 overflow-hidden animate-slide-down border-primary/20 mb-3">
      <div className="flex items-center gap-3 p-3">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-black">
          <img
            src={`https://img.youtube.com/vi/${currentSong.video_id}/default.jpg`}
            alt={currentSong.video_title ?? currentSong.query}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Music className="w-4 h-4 text-white/80" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{currentSong.video_title ?? currentSong.query}</p>
          <p className="text-[11px] text-muted truncate">
            {currentSong.video_channel ? `${currentSong.video_channel} · ` : ""}@{currentSong.username}
          </p>
        </div>
        <button
          onClick={() => ytPlayer.togglePlay()}
          aria-label={t("music_toggle_play")}
          className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-accent text-bg flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform shadow-md shadow-primary/25"
        >
          {playerState.isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
        </button>
        <button onClick={() => skipSong()} className="text-muted hover:text-text-soft transition-colors p-1.5 flex-shrink-0" title={t("music_skip")}>
          <SkipForward className="w-4 h-4" />
        </button>
        <button onClick={() => stopMusic()} className="text-muted hover:text-error-400 transition-colors p-1.5 flex-shrink-0" title={t("music_remove")}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="relative h-1.5 bg-bg-hover">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={playerState.duration || 100}
          step={1}
          value={playerState.progress}
          onChange={(e) => ytPlayer.seekTo(parseFloat(e.target.value))}
          aria-label={t("music_seek")}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
