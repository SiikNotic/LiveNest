import type { ReactNode } from "react";
import { Radio } from "lucide-react";
import { ChatView } from "../views/ChatView";
import { EventsView } from "../views/EventsView";
import { MusicView } from "../views/MusicView";
import { useI18n, type TranslationKey } from "../lib/i18n";

/*
Versión de escritorio del dashboard: 3 paneles fijos en una sola fila
(Chat/Alertas/Música), sin arrastrar, sin redimensionar, sin "diseños"
para elegir — pedido explícito del usuario, después de que la versión
anterior (react-grid-layout: paneles arrastrables/redimensionables, con
presets guardados en localStorage) terminaba con paneles más grandes de
lo que su contenido necesitaba, cajas vacías y overflow raro.

Tampoco hay scroll de ningún tipo acá — ni de la página, ni dentro de
cada panel (otro pedido explícito). Cada panel usa `overflow-hidden` en
vez de `overflow-y-auto`: lo que no entra en el alto fijo se recorta en
el borde de la tarjeta, nunca scrollea ni hace crecer la tarjeta.
ChatView/EventsView/MusicView son los MISMOS componentes que usa la
pestaña de Chat/Alertas/Música en mobile (que sí necesita scroll de
verdad, para ver historial) — no se les tocó nada adentro, el recorte es
responsabilidad de este wrapper, nunca de ellos.
*/

type PanelId = "chat" | "events" | "music";

const PANEL_LABEL_KEYS: Record<PanelId, TranslationKey> = {
  chat: "dash_panel_chat",
  events: "dash_panel_events",
  music: "dash_panel_music",
};

function Panel({ id, grow, children }: { id: PanelId; grow: number; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div
      style={{ flex: `${grow} 1 0` }}
      className="min-w-0 min-h-0 flex flex-col rounded-2xl border border-border bg-bg-card overflow-hidden"
    >
      <div className="flex-shrink-0 px-3 py-2 border-b border-border bg-bg-soft">
        <span className="text-xs font-bold text-text-soft">{t(PANEL_LABEL_KEYS[id])}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-3">{children}</div>
    </div>
  );
}

export function DesktopDashboard() {
  const { t } = useI18n();
  return (
    <div className="h-full min-h-0 flex flex-col gap-4 px-4 lg:px-6 py-4 overflow-hidden">
      {/* Mismo patrón de encabezado (ícono + título + subtítulo) que usan
          Lectura, Voces, Apariencia, etc. — antes esta pantalla arrancaba
          directo en los paneles, sin nada que la identificara como "En
          vivo" (la entrada que ahora tiene el sidebar), inconsistente con
          el resto de la app. */}
      <div className="card flex items-center gap-3 flex-shrink-0">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Radio className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold">{t("nav_live")}</h1>
          <p className="text-xs text-muted">{t("dash_subtitle")}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
        <Panel id="chat" grow={2}>
          <ChatView />
        </Panel>
        <Panel id="events" grow={1}>
          <EventsView />
        </Panel>
        <Panel id="music" grow={1}>
          <MusicView />
        </Panel>
      </div>
    </div>
  );
}
