import { Home, Bell, Mic, SlidersHorizontal, Settings, Crown, Shield, Bookmark, LogOut } from "lucide-react";
import type { TabId } from "../App";
import { useAuth } from "../lib/auth";
import { useI18n, type TranslationKey } from "../lib/i18n";
import { useStore } from "../lib/store";

// Chat/Alertas/Música tenían 3 entradas separadas acá, pero en escritorio
// las tres llevan al MISMO dashboard combinado (ver DesktopDashboard.tsx:
// isDashboard muestra los tres paneles juntos sin importar cuál tab esté
// activo) — eran 3 botones distintos para un solo destino, confuso sin
// ninguna razón real. Ahora es una sola entrada "Inicio" (tab "chat", el
// mismo valor de siempre — DesktopDashboard no cambia). Mobile sigue con
// sus 3 pantallas separadas de verdad en Header.tsx, sin tocar: ahí cada
// una ES una pantalla distinta, no hay duplicación que arreglar.
const LIVE_DASHBOARD_TABS: TabId[] = ["chat", "events", "music"];

// Lista plana (sin encabezados de sección) y en este orden exacto — pedido
// explícito del usuario a partir de una referencia visual. "Alertas"
// (antes agrupado junto con Voces/Lectura/Apariencia) pasa a ser el tercer
// ítem, justo después de Canales.
const ITEMS: { id: TabId; labelKey: TranslationKey; icon: typeof Bell }[] = [
  { id: "chat", labelKey: "nav_home", icon: Home },
  { id: "channels", labelKey: "tab_channels", icon: Bookmark },
  { id: "notifications", labelKey: "tab_notifications", icon: Bell },
  { id: "voices", labelKey: "tab_voices", icon: Mic },
  { id: "reading", labelKey: "tab_reading", icon: SlidersHorizontal },
  { id: "general", labelKey: "tab_general", icon: Settings },
];

type Props = {
  active: TabId;
  onChange: (id: TabId) => void;
};

/** Sidebar fijo para pantallas de escritorio (lg+). En pantallas más
 *  chicas no se renderiza — Header.tsx sigue manejando la navegación por
 *  menú deslizable, sin duplicar lógica de rutas. */
export function Sidebar({ active, onChange }: Props) {
  const { isAdmin, profile, user, signOut } = useAuth();
  const status = useStore((s) => s.status);
  const { t } = useI18n();

  if (!user) return null;

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col bg-bg-card border-r border-border z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="relative shrink-0">
          <img src="/logo.png" alt="" className="w-9 h-9 rounded-xl glow-primary" />
          {status === "connected" && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-400 ring-2 ring-bg-card" />
          )}
        </div>
        <h1 className="text-base font-extrabold tracking-tight">
          Live<span className="text-gradient">Nest</span>
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          // "chat" representa el dashboard combinado — también queda
          // resaltado si active quedó en "events"/"music" (no debería pasar
          // nunca desde este sidebar, pero por si llega por otro camino no
          // se ve como que ninguna sección está activa).
          const isActive = item.id === "chat" ? LIVE_DASHBOARD_TABS.includes(active) : active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-text-soft hover:bg-bg-hover hover:text-text"
              }`}
            >
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-accent" />}
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-sm font-semibold truncate">{t(item.labelKey)}</span>
            </button>
          );
        })}

        {isAdmin && (
          <button
            onClick={() => onChange("admin")}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 mt-2 ${
              active === "admin"
                ? "bg-error-400/15 text-error-400"
                : "text-text-soft hover:bg-bg-hover hover:text-error-400"
            }`}
          >
            {active === "admin" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-error-400" />}
            <Shield className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={active === "admin" ? 2.5 : 1.8} />
            <span className="text-sm font-semibold">Admin</span>
          </button>
        )}
      </nav>

      {/* Account footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => onChange("account")}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl transition-colors ${
            active === "account" ? "bg-primary/10" : "hover:bg-bg-hover"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            {isAdmin ? <Shield className="w-4 h-4 text-error-400" /> : <Crown className="w-4 h-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold truncate">{profile?.username ? `@${profile.username}` : profile?.email ?? user.email}</p>
            <p className="text-[10px] text-muted">
              {isAdmin ? t("role_admin") : profile?.rank && profile.rank !== "none" ? profile.rank : t("nav_account")}
            </p>
          </div>
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-xl text-muted hover:text-error-400 hover:bg-error-400/5 transition-colors text-xs font-semibold"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t("logout")}
        </button>

        {/* Páginas legales estáticas — fuera del bundle de la SPA (public/). */}
        <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-border-soft">
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-soft hover:text-muted transition-colors">
            {t("legal_terms_short")}
          </a>
          <span className="text-[10px] text-muted-soft">·</span>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-soft hover:text-muted transition-colors">
            {t("legal_privacy_short")}
          </a>
        </div>
      </div>
    </aside>
  );
}
