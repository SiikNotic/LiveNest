import { ChatView } from "../views/ChatView";
import { EventsView } from "../views/EventsView";
import { MusicView } from "../views/MusicView";
import { useI18n, type TranslationKey } from "../lib/i18n";

/*
Versión tablet del dashboard: 2 columnas fijas — Chat ocupa toda la
columna izquierda, Música y Alertas se apilan a la derecha. Nada se
arrastra, nada se redimensiona, no hay scroll de ningún tipo (ni de
página ni dentro de cada panel) — mismo criterio que DesktopDashboard,
ver el comentario ahí para el porqué. ChatView/EventsView/MusicView son
los mismos componentes que la pestaña de mobile, sin tocar nada adentro.
*/

type PanelId = "chat" | "events" | "music";

const PANEL_LABEL_KEYS: Record<PanelId, TranslationKey> = {
  chat: "dash_panel_chat",
  events: "dash_panel_events",
  music: "dash_panel_music",
};

function Panel({ id, children }: { id: PanelId; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-bg-soft">
        <span className="text-sm font-bold text-text-soft">{t(PANEL_LABEL_KEYS[id])}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-3">{children}</div>
    </div>
  );
}

export function TabletDashboard() {
  return (
    // pb con env(safe-area-inset-bottom): este layout también corre en
    // celulares grandes apaisados con barra de navegación en pantalla —
    // sin esto, el panel de más abajo queda tapado detrás de esos botones.
    <div
      className="h-full min-h-0 flex gap-3 px-4 pt-3 overflow-hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        <Panel id="chat">
          <ChatView />
        </Panel>
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <Panel id="music">
          <MusicView />
        </Panel>
        <Panel id="events">
          <EventsView />
        </Panel>
      </div>
    </div>
  );
}
