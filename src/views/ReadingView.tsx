import { useState } from "react";
import { useStore } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { supabase, type FilterRule, type Template, type Settings } from "../lib/supabase";
import {
  Plus, Trash2, Filter as FilterIcon, Shield, LayoutTemplate, Check, Edit2, X,
  Gift, UserPlus, Heart, Share2, Crown, RotateCcw, SlidersHorizontal, Link as LinkIcon, Hash, ChevronDown,
} from "lucide-react";

// Fusiona lo que antes eran tres secciones separadas (Filtros, Plantillas,
// y las frases fijas de las alertas por voz que ni se podían tocar) en
// una sola: todo lo que tiene que ver con "qué lee la voz y qué no" vive
// acá ahora. La elección de la voz en sí (motor, idioma, acento) sigue en
// Voces — esta pantalla es sobre contenido, esa es sobre el instrumento.
export function ReadingView() {
  const { t } = useI18n();
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <SlidersHorizontal className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold">{t("reading_title")}</h1>
          <p className="text-xs text-muted">{t("reading_subtitle")}</p>
        </div>
      </div>

      <section className="space-y-3">
        <SectionTitle icon={Shield} labelKey="reading_section_filters" />
        <FiltersSection />
      </section>

      <section className="space-y-3">
        <SectionTitle icon={LayoutTemplate} labelKey="reading_section_chat" />
        <ChatTemplateSection />
      </section>

      <section className="space-y-3">
        <SectionTitle icon={Gift} labelKey="reading_section_alerts" />
        <AlertPhrasesSection />
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, labelKey }: { icon: typeof Shield; labelKey: import("../lib/i18n").TranslationKey }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 px-1">
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="text-sm font-bold text-text-soft">{t(labelKey)}</h2>
    </div>
  );
}

// ============================================================
// Filtrado de spam (antes FiltersView.tsx)
//
// Antes esta sección era un formulario con selects de "acción" (bloquear/
// permitir/reemplazar) y "campo" (palabra/usuario/emoji/regex) — mucha
// potencia para lo que la gente realmente usa, que es "bloqueame esta
// palabra" o "bloqueame este link". Ahora es directamente una lista: se
// escribe la palabra o el link y se agrega. Por debajo sigue guardándose
// como siempre en la tabla "filters" (type: "block", field: "word") — el
// motor de filtrado en eventProcessor.ts no cambió — así que las reglas
// más avanzadas (usuario, emoji, regex, reemplazo) que alguien haya creado
// antes de este cambio se siguen viendo y funcionando igual, solo que ya
// no se pueden crear nuevas desde acá.
// ============================================================

// Links que suelen aparecer como spam en el chat de un directo — no son
// palabras ofensivas (eso depende demasiado del streamer y del idioma
// para adivinarlo bien), pero estos dominios sí son un problema bastante
// universal. "Añadir links comunes" los agrega de un tiro, saltando los
// que ya estén en la lista.
const DEFAULT_BLOCKED_LINKS = [
  "bit.ly", "t.me", "discord.gg", "wa.me", "linktr.ee", "cash.app", "onlyfans.com", "telegram.me",
];

function looksLikeLink(value: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(value) || /\.[a-z]{2,}(\/|$)/i.test(value);
}

function FiltersSection() {
  const filters = useStore((s) => s.filters);
  const loadFilters = useStore((s) => s.loadFilters);
  const settings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);
  const { t } = useI18n();
  // La lista arranca cerrada — con varias palabras/links bloqueados,
  // mostrarlos siempre todos hacía que la pantalla fuera kilométrica. Se
  // despliega solo al tocar el resumen de abajo.
  const [expanded, setExpanded] = useState(false);

  const deleteFilter = async (id: string) => {
    await supabase.from("filters").delete().eq("id", id);
    loadFilters();
  };

  const addBlock = async (value: string) => {
    await supabase.from("filters").insert({ type: "block", field: "word", value, replacement: null, enabled: true });
    loadFilters();
  };

  const addDefaults = async () => {
    const existing = new Set(filters.map((f) => f.value.toLowerCase()));
    const toAdd = DEFAULT_BLOCKED_LINKS.filter((v) => !existing.has(v.toLowerCase()));
    if (toAdd.length === 0) return;
    await supabase.from("filters").insert(
      toAdd.map((value) => ({ type: "block" as const, field: "word" as const, value, replacement: null, enabled: true }))
    );
    loadFilters();
  };

  return (
    <div className="space-y-3">
      {settings && (
        <div className="card space-y-3">
          <h3 className="text-xs font-bold text-text-soft">{t("filters_length_title")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("filters_min_chars")}</label>
              <input
                type="number"
                min={0}
                value={settings.min_message_length}
                onChange={(e) => saveSettings({ min_message_length: parseInt(e.target.value) || 0 })}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t("filters_max_chars")}</label>
              <input
                type="number"
                min={1}
                value={settings.max_message_length}
                onChange={(e) => saveSettings({ max_message_length: parseInt(e.target.value) || 200 })}
                className="input"
              />
            </div>
          </div>
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-muted">{t("filters_rules", { n: filters.length })}</h3>
          {filters.length > 0 && (
            <button onClick={addDefaults} className="text-[11px] font-semibold text-muted hover:text-text transition-colors flex-shrink-0">
              {t("filters_add_defaults")}
            </button>
          )}
        </div>
        <p className="text-xs text-muted">{t("filters_help")}</p>
        <BlockAddForm onAdd={addBlock} />
      </div>

      {filters.length === 0 ? (
        <div className="card text-center py-8 space-y-3">
          <FilterIcon className="w-7 h-7 text-muted mx-auto" />
          <p className="text-sm text-muted">{t("filters_no_rules")}</p>
          <button onClick={addDefaults} className="btn-ghost text-xs mx-auto">
            <Plus className="w-3.5 h-3.5" /> {t("filters_add_defaults")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between gap-2 px-1 py-1 text-text-soft"
          >
            <span className="text-xs font-semibold">{t("filters_view_list", { n: filters.length })}</span>
            <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && (
            <div className="space-y-2 animate-slide-down">
              {filters.map((f) => (
                <FilterRow key={f.id} filter={f} onDelete={() => deleteFilter(f.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BlockAddForm({ onAdd }: { onAdd: (value: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder={t("filters_add_placeholder")}
        className="input flex-1"
      />
      <button onClick={submit} className="btn-primary text-xs px-4 flex-shrink-0">
        <Plus className="w-3.5 h-3.5" /> {t("filters_add_button")}
      </button>
    </div>
  );
}

function FilterRow({ filter, onDelete }: { filter: FilterRule; onDelete: () => void }) {
  const { t } = useI18n();
  // Todo lo creado desde la lista nueva es type "block" + field "word" —
  // para esos, la fila se muestra simple (ícono + valor). Las reglas más
  // avanzadas que alguien haya creado con el formulario viejo (usuario,
  // emoji, regex, reemplazo) siguen mostrando sus badges de siempre, para
  // no esconder que existen ni qué hacen.
  //
  // Ya no hay botón de encender/apagar acá — solo borrar. Una fila que ya
  // estuviera desactivada de antes (enabled: false, creada con el
  // formulario viejo) se sigue mostrando atenuada para no ocultar que no
  // está aplicando, aunque ya no haya forma de reactivarla desde acá —
  // hay que borrarla y agregarla de nuevo.
  const isSimpleBlock = filter.type === "block" && filter.field === "word";
  const typeConfig = {
    block: { label: t("filters_block"), badge: "badge-danger" },
    allow: { label: t("filters_allow"), badge: "badge-success" },
    replace: { label: t("filters_replace"), badge: "badge-accent" },
  }[filter.type];
  const isLink = isSimpleBlock && looksLikeLink(filter.value);

  return (
    <div className={`card flex items-center gap-3 ${!filter.enabled ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-0">
        {isSimpleBlock ? (
          <div className="flex items-center gap-1.5">
            {isLink ? <LinkIcon className="w-3.5 h-3.5 text-muted flex-shrink-0" /> : <Hash className="w-3.5 h-3.5 text-muted flex-shrink-0" />}
            <p className="text-sm font-medium truncate">{filter.value}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={typeConfig.badge}>{typeConfig.label}</span>
              <span className="text-[11px] text-muted">{filter.field}</span>
            </div>
            <p className="text-sm font-medium truncate">
              {filter.value}
              {filter.replacement && <span className="text-muted"> → {filter.replacement}</span>}
            </p>
          </>
        )}
      </div>
      <button onClick={onDelete} className="text-muted hover:text-red-400 transition-colors p-1.5" title={t("filters_delete")} aria-label={t("filters_delete")}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================
// Cómo lee el chat (antes TemplatesView.tsx)
// ============================================================

function ChatTemplateSection() {
  const templates = useStore((s) => s.templates);
  const loadTemplates = useStore((s) => s.loadTemplates);
  const { t } = useI18n();
  const [editing, setEditing] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);

  const setEnabled = async (tmpl: Template, enabled: boolean) => {
    if (enabled) {
      await supabase.from("templates").update({ enabled: false }).neq("id", tmpl.id);
    }
    await supabase.from("templates").update({ enabled }).eq("id", tmpl.id);
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("templates").delete().eq("id", id);
    loadTemplates();
  };

  const saveTemplate = async (data: { name: string; content: string; id?: string }) => {
    if (data.id) {
      await supabase.from("templates").update({ name: data.name, content: data.content }).eq("id", data.id);
    } else {
      await supabase.from("templates").insert({ name: data.name, content: data.content, enabled: false });
    }
    setEditing(null);
    setShowForm(false);
    loadTemplates();
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <p className="text-xs text-muted">{t("templates_help")}</p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted">{t("templates_count", { n: templates.length })}</h3>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" /> {t("templates_new")}
        </button>
      </div>

      {(showForm || editing) && (
        <TemplateForm template={editing} onSave={saveTemplate} onCancel={() => { setShowForm(false); setEditing(null); }} />
      )}

      {templates.length === 0 ? (
        <div className="card text-center py-8">
          <LayoutTemplate className="w-7 h-7 text-muted mx-auto mb-2" />
          <p className="text-sm text-muted">{t("templates_no_templates")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className={`card flex items-start gap-3 ${tmpl.enabled ? "border-primary/40" : ""}`}>
              <button
                onClick={() => setEnabled(tmpl, !tmpl.enabled)}
                className={`w-10 h-6 rounded-full transition-all duration-200 flex-shrink-0 relative mt-1 ${tmpl.enabled ? "bg-primary" : "bg-border"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ${tmpl.enabled ? "left-[18px]" : "left-0.5"}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold truncate">{tmpl.name}</h3>
                  {tmpl.enabled && <span className="badge-primary">{t("templates_active")}</span>}
                </div>
                <p className="text-xs text-muted font-mono mt-1 break-words">{tmpl.content}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditing(tmpl); setShowForm(false); }} className="text-muted hover:text-accent transition-colors p-1.5" title={t("templates_edit")} aria-label={t("templates_edit")}>
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteTemplate(tmpl.id)} className="text-muted hover:text-red-400 transition-colors p-1.5" title={t("templates_delete")} aria-label={t("templates_delete")}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateForm({ template, onSave, onCancel }: {
  template: Template | null;
  onSave: (data: { name: string; content: string; id?: string }) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(template?.name ?? "");
  const [content, setContent] = useState(template?.content ?? t("templates_default_content"));

  const submit = () => {
    if (!name.trim() || !content.trim()) return;
    onSave({ name: name.trim(), content: content.trim(), id: template?.id });
  };

  return (
    <div className="card space-y-3 animate-slide-down border-primary/30">
      <h3 className="text-sm font-bold">{template ? t("templates_edit") : t("templates_new_title")}</h3>
      <div>
        <label className="label">{t("templates_name")}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("templates_name_placeholder")} className="input" />
      </div>
      <div>
        <label className="label">{t("templates_content")}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder={t("templates_default_content")}
          className="input resize-none font-mono"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setContent(t("templates_default_content"))} className="badge-muted hover:bg-border">{t("templates_preset_default")}</button>
        <button onClick={() => setContent(t("templates_preset_msg_content"))} className="badge-muted hover:bg-border">{t("templates_preset_msg")}</button>
        <button onClick={() => setContent("{message}")} className="badge-muted hover:bg-border">{t("templates_preset_msg_only")}</button>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={submit} className="btn-primary flex-1"><Check className="w-4 h-4" /> {t("templates_save")}</button>
        <button onClick={onCancel} className="btn-ghost"><X className="w-4 h-4" /> {t("templates_cancel")}</button>
      </div>
    </div>
  );
}

// ============================================================
// Qué dice la voz en cada alerta (regalo/follow/like/share/sub) — antes
// era una frase fija en el código (voice_alert_* en i18n.ts), ahora se
// puede escribir la propia por evento. Vacío = sigue usando la de
// siempre. Ver fillAlertPhrase() en store.ts, que es quien realmente la
// usa al leer la alerta en voz alta.
// ============================================================

type AlertFieldKey =
  | "voice_alert_gift_single" | "voice_alert_gift_multi" | "voice_alert_follow"
  | "voice_alert_like_single" | "voice_alert_like_multi" | "voice_alert_share" | "voice_alert_sub";

function AlertPhrasesSection() {
  const settings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);
  const { t } = useI18n();

  if (!settings) return <div className="card animate-pulse h-48" />;

  const set = (key: AlertFieldKey, value: string) => saveSettings({ [key]: value || null } as Partial<Settings>);

  return (
    <div className="card space-y-4">
      <p className="text-xs text-muted">{t("reading_section_alerts_help")}</p>

      <div className="space-y-1.5">
        <EventLabel icon={Gift} color="text-amber-400" labelKey="notif_gifts" sub="reading_alert_gift_single" />
        <AlertField
          value={settings.voice_alert_gift_single ?? ""}
          onChange={(v) => set("voice_alert_gift_single", v)}
          placeholder={t("voice_alert_gift_single")}
          varsHintKey="reading_alert_vars_name_gift"
          presetLabel={t("reading_alert_preset_gift_single_2")}
        />
      </div>
      <div className="space-y-1.5">
        <EventLabel icon={Gift} color="text-amber-400" labelKey="notif_gifts" sub="reading_alert_gift_multi" />
        <AlertField
          value={settings.voice_alert_gift_multi ?? ""}
          onChange={(v) => set("voice_alert_gift_multi", v)}
          placeholder={t("voice_alert_gift_multi")}
          varsHintKey="reading_alert_vars_name_gift_count"
          presetLabel={t("reading_alert_preset_gift_multi_2")}
        />
      </div>

      <div className="space-y-1.5">
        <EventLabel icon={UserPlus} color="text-primary" labelKey="notif_followers" />
        <AlertField
          value={settings.voice_alert_follow ?? ""}
          onChange={(v) => set("voice_alert_follow", v)}
          placeholder={t("voice_alert_follow")}
          varsHintKey="reading_alert_vars_name"
          presetLabel={t("reading_alert_preset_follow_2")}
        />
      </div>

      <div className="space-y-1.5">
        <EventLabel icon={Heart} color="text-pink-400" labelKey="notif_likes" sub="reading_alert_like_single" />
        <AlertField
          value={settings.voice_alert_like_single ?? ""}
          onChange={(v) => set("voice_alert_like_single", v)}
          placeholder={t("voice_alert_like_single")}
          varsHintKey="reading_alert_vars_name"
          presetLabel={t("reading_alert_preset_like_single_2")}
        />
      </div>
      <div className="space-y-1.5">
        <EventLabel icon={Heart} color="text-pink-400" labelKey="notif_likes" sub="reading_alert_like_multi" />
        <AlertField
          value={settings.voice_alert_like_multi ?? ""}
          onChange={(v) => set("voice_alert_like_multi", v)}
          placeholder={t("voice_alert_like_multi")}
          varsHintKey="reading_alert_vars_name_count"
          presetLabel={t("reading_alert_preset_like_multi_2")}
        />
      </div>

      <div className="space-y-1.5">
        <EventLabel icon={Share2} color="text-sky-400" labelKey="notif_shares" />
        <AlertField
          value={settings.voice_alert_share ?? ""}
          onChange={(v) => set("voice_alert_share", v)}
          placeholder={t("voice_alert_share")}
          varsHintKey="reading_alert_vars_name"
          presetLabel={t("reading_alert_preset_share_2")}
        />
      </div>

      <div className="space-y-1.5">
        <EventLabel icon={Crown} color="text-accent" labelKey="notif_subs" />
        <AlertField
          value={settings.voice_alert_sub ?? ""}
          onChange={(v) => set("voice_alert_sub", v)}
          placeholder={t("voice_alert_sub")}
          varsHintKey="reading_alert_vars_name"
          presetLabel={t("reading_alert_preset_sub_2")}
        />
      </div>
    </div>
  );
}

function EventLabel({ icon: Icon, color, labelKey, sub }: {
  icon: typeof Gift; color: string; labelKey: import("../lib/i18n").TranslationKey; sub?: import("../lib/i18n").TranslationKey;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-sm font-semibold">{t(labelKey)}</span>
      {sub && <span className="text-xs text-muted">— {t(sub)}</span>}
    </div>
  );
}

function AlertField({ value, onChange, placeholder, varsHintKey, presetLabel }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  varsHintKey: import("../lib/i18n").TranslationKey;
  presetLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
      <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
        <p className="text-[10px] text-muted">{t(varsHintKey)}</p>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onChange(presetLabel)} className="badge-muted hover:bg-border text-[11px]">{presetLabel}</button>
          {value && (
            <button onClick={() => onChange("")} className="text-muted hover:text-red-400 p-1" title={t("reading_alert_reset")}>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
