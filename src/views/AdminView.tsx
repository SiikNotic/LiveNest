import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../lib/auth";
import { useI18n, type TranslationKey } from "../lib/i18n";
import { supabase, licenseSourceLabel, type Profile, type LicenseKey, type UserLicense, type UserRank, type RankPermissions } from "../lib/supabase";
import {
  Shield, Users, KeyRound, Plus, Trash2, Copy, Check, Loader2, AlertCircle,
  Clock, CheckCircle2, XCircle, Crown, LogOut, X, Ban, ShieldCheck,
  Mail, Calendar, BadgeCheck, Sparkles, Lock, SlidersHorizontal, Zap, RefreshCw, DollarSign,
  Search, MoreHorizontal, ArrowUpDown, UserPlus, ChevronLeft, ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";

type AdminTab = "users" | "keys" | "licenses" | "permissions";
type TFunc = (key: TranslationKey, vars?: Record<string, string | number>) => string;

// Owner/Staff son nombres propios del rango — no se traducen, solo "Ninguno"/"None".
function rankLabel(t: (key: TranslationKey) => string, r: UserRank): string {
  return r === "owner" ? "Owner" : r === "staff" ? "Staff" : t("admin_rank_none");
}
const RANK_STYLE: Record<UserRank, string> = {
  owner: "bg-accent/15 text-accent",
  staff: "bg-primary/15 text-primary",
  none: "bg-bg-soft text-muted",
};

export function AdminView() {
  const { profile, signOut, isOwner } = useAuth();
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<Profile[]>([]);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [licenses, setLicenses] = useState<(UserLicense & { profile_email?: string })[]>([]);
  const [rankPerms, setRankPerms] = useState<RankPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [genLabel, setGenLabel] = useState<"7" | "30" | "365" | "lifetime">("30");
  const [genQty, setGenQty] = useState(1);
  const [genLoading, setGenLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [permError, setPermError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [usersRes, keysRes, licensesRes, permsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("license_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("user_licenses").select("*").order("created_at", { ascending: false }),
      supabase.from("rank_permissions").select("*").eq("rank", "staff").maybeSingle(),
    ]);
    setUsers((usersRes.data as Profile[]) ?? []);
    setKeys((keysRes.data as LicenseKey[]) ?? []);
    setRankPerms((permsRes.data as RankPermissions) ?? null);

    const licData = (licensesRes.data as UserLicense[]) ?? [];
    const emails = await Promise.all(
      licData.map(async (l) => {
        const { data } = await supabase.from("profiles").select("email").eq("id", l.user_id).maybeSingle();
        return { ...l, profile_email: data?.email ?? "—" };
      })
    );
    setLicenses(emails);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real, current membership per user: active status AND not past expiry
  // (a DB row can lag briefly behind expiry until the next self-heal).
  const licenseByUser = useMemo(() => {
    const map = new Map<string, UserLicense>();
    for (const l of licenses) {
      if (l.status === "active" && (!l.expires_at || new Date(l.expires_at) > new Date())) {
        map.set(l.user_id, l);
      }
    }
    return map;
  }, [licenses]);

  // Client-side mirrors of the server-enforced rules — purely for UX
  // (disabling/hiding buttons). The real gate is the SECURITY DEFINER
  // RPCs below, which re-check this on the server no matter what the
  // client sends.
  const myRank: UserRank = profile?.rank ?? "none";
  const canBan = myRank === "owner" || (myRank === "staff" && !!rankPerms?.can_ban);
  const canUnban = myRank === "owner" || (myRank === "staff" && !!rankPerms?.can_unban);
  const canChangeRank = myRank === "owner";
  const canDelete = myRank === "owner";
  const canManagePermissions = myRank === "owner";

  const generateKeys = async () => {
    setGenLoading(true);
    const newKeys: { key: string; duration_days: number | null; duration_label: string }[] = [];
    const daysMap: Record<string, number | null> = { "7": 7, "30": 30, "365": 365, lifetime: null };
    for (let i = 0; i < genQty; i++) {
      newKeys.push({ key: genKey(), duration_days: daysMap[genLabel], duration_label: genLabel });
    }
    const { error } = await supabase.from("license_keys").insert(newKeys);
    if (!error) await loadData();
    setGenLoading(false);
  };

  const revokeKey = async (id: string) => {
    await supabase.from("license_keys").update({ status: "revoked" }).eq("id", id);
    await loadData();
  };

  const deleteKey = async (id: string) => {
    await supabase.from("license_keys").delete().eq("id", id);
    await loadData();
  };

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Every admin action below calls a SECURITY DEFINER RPC that re-checks
  // the caller's rank/permissions in the database, so this is enforced
  // even if someone bypasses the UI entirely.
  const setBanStatus = async (userId: string, banned: boolean) => {
    setPermError(null);
    const { error } = await supabase.rpc("admin_set_ban_status", { p_user_id: userId, p_banned: banned });
    if (error) {
      setPermError(t("admin_err_no_permission_action"));
      return;
    }
    await loadData();
    setSelectedUser((u) => (u && u.id === userId ? { ...u, banned } : u));
  };

  const setRank = async (userId: string, rank: UserRank) => {
    setPermError(null);
    const { error } = await supabase.rpc("admin_set_rank", { p_user_id: userId, p_rank: rank });
    if (error) {
      setPermError(t("admin_err_no_permission_rank"));
      return;
    }
    await loadData();
    setSelectedUser((u) => (u && u.id === userId ? { ...u, rank } : u));
  };

  const setStaffPermission = async (key: "can_ban" | "can_unban", value: boolean) => {
    setPermError(null);
    const { error } = await supabase.rpc("admin_set_staff_permission", { p_key: key, p_value: value });
    if (error) {
      setPermError(t("admin_err_no_permission_perms"));
      return;
    }
    await loadData();
  };

  const deleteUser = async (id: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke("delete-user", {
      body: { userId: id },
      headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
    });
    if (error) {
      setPermError(t("admin_err_delete_account"));
      return;
    }
    setSelectedUser(null);
    await loadData();
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const labelMap: Record<string, string> = {
    "7": t("admin_duration_7"),
    "30": t("admin_duration_30"),
    "365": t("admin_duration_365"),
    lifetime: t("admin_duration_lifetime"),
  };

  return (
    <>
    {/* ============== MOBILE (<md) — sin tocar, igual que siempre ============== */}
    <div className="md:hidden max-w-4xl mx-auto w-full space-y-5">
      {/* Admin header */}
      <div className="glass rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-error-400/15 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-error-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold">{t("admin_panel_title")}</h1>
            <p className="text-xs text-muted truncate">{profile?.username ? `@${profile.username}` : profile?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-soft border border-border text-xs font-semibold text-muted hover:text-error-400 transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t("logout")}
          </button>
        </div>
      </div>

      {isOwner && <ElevenLabsUsageCard />}
      {isOwner && <StripeMetricsCard />}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
        {([
          { id: "users", label: t("admin_tab_users"), icon: Users },
          { id: "keys", label: t("admin_tab_keys"), icon: KeyRound },
          { id: "licenses", label: t("admin_tab_licenses"), icon: Crown },
          ...(isOwner ? [{ id: "permissions" as const, label: t("admin_tab_permissions"), icon: SlidersHorizontal }] : []),
        ] as { id: AdminTab; label: string; icon: typeof Users }[]).map((tabItem) => {
          const Icon = tabItem.icon;
          return (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all card-press flex-shrink-0 ${
                tab === tabItem.id
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-bg-soft text-muted border border-border hover:text-text"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* USERS TAB */}
          {tab === "users" && (
            <div className="space-y-2">
              {users.map((u) => {
                const isMember = licenseByUser.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="glass rounded-xl p-3.5 border border-border w-full text-left flex items-center gap-3 card-press hover:border-primary/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-bg-soft flex items-center justify-center flex-shrink-0">
                      {u.role === "admin" ? (
                        <Shield className="w-4 h-4 text-error-400" />
                      ) : (
                        <Users className="w-4 h-4 text-muted" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{u.email}</p>
                      <p className="text-[11px] text-muted">{fmtDate(u.created_at)}</p>
                    </div>

                    <div className="hidden sm:flex flex-wrap items-center justify-end gap-1.5 flex-shrink-0 max-w-[45%]">
                      {u.rank !== "none" && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap ${RANK_STYLE[u.rank]}`}>
                          {rankLabel(t, u.rank)}
                        </span>
                      )}
                      {isMember && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-primary/15 text-primary flex items-center gap-1 whitespace-nowrap">
                          <Crown className="w-3 h-3" /> {t("admin_member_badge")}
                        </span>
                      )}
                      {u.banned && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-error-400/15 text-error-400 whitespace-nowrap">
                          {t("admin_banned_badge")}
                        </span>
                      )}
                    </div>

                    <div className="w-2 h-2 rounded-full bg-muted/40 flex-shrink-0 sm:hidden" />
                  </button>
                );
              })}
              {users.length === 0 && (
                <p className="text-center text-sm text-muted py-10">{t("admin_no_users")}</p>
              )}
            </div>
          )}

          {/* KEYS TAB */}
          {tab === "keys" && (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-4 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold">{t("admin_generate_keys_title")}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["7", "30", "365", "lifetime"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setGenLabel(d)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        genLabel === d
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-bg-soft text-muted border border-border hover:text-text"
                      }`}
                    >
                      {labelMap[d]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted">{t("admin_quantity_label")}</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={genQty}
                    onChange={(e) => setGenQty(Math.max(1, Math.min(100, +e.target.value)))}
                    className="w-16 px-2 py-1.5 rounded-lg bg-bg-soft border border-border text-sm text-center focus:outline-none"
                  />
                  <button
                    onClick={generateKeys}
                    disabled={genLoading}
                    className="ml-auto px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {t("admin_generate_button")}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.id} className="glass rounded-xl p-3.5 border border-border flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <code className="text-sm font-mono font-bold text-text break-all">{k.key}</code>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted">{labelMap[k.duration_label]}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          k.status === "available" ? "bg-success-400/15 text-success-400"
                          : k.status === "redeemed" ? "bg-primary/15 text-primary"
                          : "bg-error-400/15 text-error-400"
                        }`}>
                          {k.status === "available" ? t("admin_key_available") : k.status === "redeemed" ? t("admin_key_redeemed") : t("admin_key_revoked")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {k.status === "available" && (
                        <>
                          <button
                            onClick={() => copyKey(k.id, k.key)}
                            className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center text-muted hover:text-primary transition-colors"
                            title={t("admin_key_copy")}
                            aria-label={t("admin_key_copy")}
                          >
                            {copiedId === k.id ? <Check className="w-3.5 h-3.5 text-success-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => revokeKey(k.id)}
                            className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center text-muted hover:text-warning-400 transition-colors"
                            title={t("admin_key_revoke")}
                            aria-label={t("admin_key_revoke")}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteKey(k.id)}
                        className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center text-muted hover:text-error-400 transition-colors"
                        title={t("admin_key_delete")}
                        aria-label={t("admin_key_delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {keys.length === 0 && (
                  <p className="text-center text-sm text-muted py-10">{t("admin_no_keys")}</p>
                )}
              </div>
            </div>
          )}

          {/* LICENSES TAB */}
          {tab === "licenses" && (
            <div className="space-y-2">
              {licenses.map((l) => (
                <div key={l.id} className="glass rounded-xl p-3.5 border border-border flex flex-wrap items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-bg-soft flex items-center justify-center flex-shrink-0">
                    {l.status === "active" ? (
                      <CheckCircle2 className="w-4 h-4 text-success-400" />
                    ) : l.status === "cancelled" ? (
                      <XCircle className="w-4 h-4 text-error-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-warning-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <p className="text-sm font-bold truncate">{l.profile_email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted">{licenseSourceLabel(l.source, t)}</span>
                      <span className="text-[10px] text-muted">·</span>
                      <span className="text-[10px] text-muted">{l.expires_at ? fmtDate(l.expires_at) : t("admin_duration_lifetime")}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${
                    l.status === "active" ? "bg-success-400/15 text-success-400"
                    : l.status === "cancelled" ? "bg-error-400/15 text-error-400"
                    : "bg-warning-400/15 text-warning-400"
                  }`}>
                    {l.status === "active" ? t("admin_active") : l.status === "cancelled" ? t("admin_license_cancelled") : t("admin_license_expired")}
                  </span>
                </div>
              ))}
              {licenses.length === 0 && (
                <p className="text-center text-sm text-muted py-10">{t("admin_no_licenses")}</p>
              )}
            </div>
          )}

          {/* PERMISSIONS TAB — owner only (also enforced server-side) */}
          {tab === "permissions" && isOwner && (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold">{t("admin_perms_title")}</h2>
                </div>
                <p className="text-xs text-muted">
                  {t("admin_perms_desc")}
                </p>
              </div>

              <div className="glass rounded-xl border border-border divide-y divide-border">
                <PermissionRow
                  label={t("admin_perm_ban_label")}
                  description={t("admin_perm_ban_desc")}
                  checked={!!rankPerms?.can_ban}
                  onChange={(v) => setStaffPermission("can_ban", v)}
                />
                <PermissionRow
                  label={t("admin_perm_unban_label")}
                  description={t("admin_perm_unban_desc")}
                  checked={!!rankPerms?.can_unban}
                  onChange={(v) => setStaffPermission("can_unban", v)}
                />
              </div>

              <div className="glass rounded-xl p-3.5 border border-border flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-muted flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted leading-relaxed">
                  {t("admin_owner_only_note")}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>

    {/* ============== DESKTOP / TABLET (md+) — rediseño ============== */}
    <div className="hidden md:block w-full space-y-5">
      <DesktopAdminHeader profile={profile} signOut={signOut} t={t} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isOwner && <ElevenLabsUsageCard />}
        {isOwner && <StripeMetricsCard />}
      </div>

      <DesktopAdminTabs tab={tab} setTab={setTab} isOwner={isOwner} t={t} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {tab === "users" ? (
            <DesktopUsersTable
              users={users}
              fmtDate={fmtDate}
              onSelect={setSelectedUser}
              t={t}
            />
          ) : tab === "keys" ? (
            <DesktopKeysPanel
              keys={keys}
              labelMap={labelMap}
              genLabel={genLabel}
              setGenLabel={setGenLabel}
              genQty={genQty}
              setGenQty={setGenQty}
              genLoading={genLoading}
              generateKeys={generateKeys}
              copiedId={copiedId}
              copyKey={copyKey}
              revokeKey={revokeKey}
              deleteKey={deleteKey}
              t={t}
            />
          ) : tab === "licenses" ? (
            <DesktopLicensesPanel licenses={licenses} fmtDate={fmtDate} t={t} />
          ) : (
            isOwner && (
              <DesktopPermissionsPanel
                rankPerms={rankPerms}
                setStaffPermission={setStaffPermission}
                t={t}
              />
            )
          )}
        </>
      )}
    </div>

    {/* ============== Compartido entre mobile y desktop ============== */}
    {selectedUser && (
      <UserModal
        user={selectedUser}
        license={licenseByUser.get(selectedUser.id) ?? null}
        fmtDate={fmtDate}
        canBan={canBan}
        canUnban={canUnban}
        canChangeRank={canChangeRank}
        canDelete={canDelete}
        canManagePermissions={canManagePermissions}
        error={permError}
        onClose={() => { setSelectedUser(null); setPermError(null); }}
        onBanToggle={() => setBanStatus(selectedUser.id, !selectedUser.banned)}
        onSetRank={(r) => setRank(selectedUser.id, r)}
        onDelete={() => deleteUser(selectedUser.id)}
      />
    )}
    </>
  );
}

function ElevenLabsUsageCard() {
  const { t, lang } = useI18n();
  const [usage, setUsage] = useState<{
    total_credits: number; used_credits: number; percent_used: number;
    resets_at: string | null; tier: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsage = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error: fnError } = await supabase.functions.invoke("tts-proxy", {
      body: { action: "usage", provider: "elevenlabs" },
      headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
    });
    if (fnError || data?.error) {
      setError(data?.error ?? t("admin_elevenlabs_error"));
    } else {
      setError(null);
      setUsage(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Near-real-time without reloading the app: poll on an interval and
  // refresh again whenever the tab regains focus.
  useEffect(() => {
    fetchUsage();
    const interval = setInterval(() => fetchUsage(), 30000);
    const onFocus = () => fetchUsage();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchUsage]);

  const fmtResetDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  const barColor = !usage
    ? "bg-primary"
    : usage.percent_used >= 90 ? "bg-error-400"
    : usage.percent_used >= 70 ? "bg-warning-400"
    : "bg-primary";

  return (
    <div className="glass rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold">{t("admin_elevenlabs_usage_title")}</h2>
            <Lock className="w-3 h-3 text-muted" />
          </div>
          <p className="text-[11px] text-muted">{t("admin_owner_only_badge")}</p>
        </div>
        <button
          onClick={() => fetchUsage(true)}
          disabled={refreshing}
          className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center text-muted hover:text-primary transition-colors flex-shrink-0"
          title={t("admin_refresh_now")}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 text-xs text-error-400 bg-error/10 rounded-xl p-2.5 border border-error/20">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : usage ? (
        <div className="space-y-3">
          {/* Mobile: igual que siempre — 3 cajas de texto */}
          <div className="md:hidden grid grid-cols-3 gap-2.5">
            <div className="bg-bg-soft rounded-xl p-2.5 border border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">{t("admin_total")}</p>
              <p className="text-sm font-bold">{usage.total_credits.toLocaleString(lang === "en" ? "en-US" : "es-ES")}</p>
            </div>
            <div className="bg-bg-soft rounded-xl p-2.5 border border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">{t("admin_used")}</p>
              <p className="text-sm font-bold">{usage.used_credits.toLocaleString(lang === "en" ? "en-US" : "es-ES")}</p>
            </div>
            <div className="bg-bg-soft rounded-xl p-2.5 border border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">{t("admin_usage_pct")}</p>
              <p className="text-sm font-bold">{usage.percent_used}%</p>
            </div>
          </div>

          {/* Desktop/tablet: mismos 3 valores, con anillo en vez de texto plano para el % */}
          <div className="hidden md:grid grid-cols-3 gap-2.5">
            <div className="bg-bg-soft rounded-xl p-3 border border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1">{t("admin_total")}</p>
              <p className="text-lg font-extrabold">{usage.total_credits.toLocaleString(lang === "en" ? "en-US" : "es-ES")}</p>
              <p className="text-[10px] text-muted-soft">{t("admin_total").toLowerCase()}</p>
            </div>
            <div className="bg-bg-soft rounded-xl p-3 border border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1">{t("admin_used")}</p>
              <p className="text-lg font-extrabold">{usage.used_credits.toLocaleString(lang === "en" ? "en-US" : "es-ES")}</p>
              <p className="text-[10px] text-muted-soft">{t("admin_used").toLowerCase()}</p>
            </div>
            <div className="bg-bg-soft rounded-xl p-3 border border-border flex items-center gap-3">
              <DonutRing percent={usage.percent_used} />
              <div className="min-w-0">
                <p className="text-lg font-extrabold">{usage.percent_used}%</p>
                <p className="text-[10px] text-muted-soft leading-tight">{t("admin_usage_of_total")}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="h-2 rounded-full bg-bg-soft overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(100, usage.percent_used)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>{t("admin_resets_on", { date: fmtResetDate(usage.resets_at) })}</span>
            {usage.tier && <span className="capitalize">{usage.tier}</span>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StripeMetricsCard() {
  const { t, lang } = useI18n();
  const [metrics, setMetrics] = useState<{
    revenue_this_month_cents: number; revenue_has_more: boolean;
    active_subscribers: number; active_subscribers_has_more: boolean;
    upcoming_renewals: { email: string | null; renews_at: string; amount_cents: number | null }[];
    recent_cancellations: { email: string | null; cancelled_at: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error: fnError } = await supabase.functions.invoke("stripe-admin-metrics", {
      headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
    });
    if (fnError || data?.error) {
      setError(data?.error ?? t("admin_stripe_metrics_error"));
    } else {
      setError(null);
      setMetrics(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => fetchMetrics(), 60000);
    const onFocus = () => fetchMetrics();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchMetrics]);

  const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString(lang === "en" ? "en-US" : "es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtShortDate = (iso: string) => new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short" });

  return (
    <div className="glass rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-success-400/15 flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-4 h-4 text-success-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold">{t("admin_revenue_title")}</h2>
            <Lock className="w-3 h-3 text-muted" />
          </div>
          <p className="text-[11px] text-muted">{t("admin_owner_only_badge")}</p>
        </div>
        <button
          onClick={() => fetchMetrics(true)}
          disabled={refreshing}
          className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center text-muted hover:text-primary transition-colors flex-shrink-0"
          title={t("admin_refresh_now")}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 text-xs text-error-400 bg-error/10 rounded-xl p-2.5 border border-error/20">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : metrics ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-bg-soft rounded-xl p-2.5 border border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">{t("admin_revenue_this_month")}</p>
              <p className="text-lg font-extrabold text-success-400">
                {fmtMoney(metrics.revenue_this_month_cents)}
                {metrics.revenue_has_more && <span className="text-[10px] text-muted-soft font-normal">+</span>}
              </p>
            </div>
            <div className="bg-bg-soft rounded-xl p-2.5 border border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">{t("admin_active_subscribers")}</p>
              <p className="text-lg font-extrabold">
                {metrics.active_subscribers}
                {metrics.active_subscribers_has_more && <span className="text-[10px] text-muted-soft font-normal">+</span>}
              </p>
            </div>
          </div>

          {/* Mobile: apiladas, igual que siempre */}
          <div className="md:hidden">
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                {t("admin_upcoming_renewals")}
              </p>
              {metrics.upcoming_renewals.length === 0 ? (
                <p className="text-xs text-muted-soft">{t("admin_no_upcoming_renewals")}</p>
              ) : (
                <div className="space-y-1.5">
                  {metrics.upcoming_renewals.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-text-soft truncate flex-1">{r.email ?? "—"}</span>
                      <span className="text-muted flex-shrink-0 ml-2">{fmtShortDate(r.renews_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-1 border-t border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5 mt-2">
                {t("admin_recent_cancellations")}
              </p>
              {metrics.recent_cancellations.length === 0 ? (
                <p className="text-xs text-muted-soft">{t("admin_no_recent_cancellations")}</p>
              ) : (
                <div className="space-y-1.5">
                  {metrics.recent_cancellations.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-text-soft truncate flex-1">{c.email ?? "—"}</span>
                      <span className="text-error-400/80 flex-shrink-0 ml-2">{fmtShortDate(c.cancelled_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop/tablet: dos tarjetas lado a lado, mismos datos */}
          <div className="hidden md:grid grid-cols-2 gap-2.5">
            <div className="bg-bg-soft rounded-xl p-3 border border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">{t("admin_upcoming_renewals")}</p>
              </div>
              {metrics.upcoming_renewals.length === 0 ? (
                <p className="text-xs text-muted-soft">{t("admin_no_upcoming_renewals")}</p>
              ) : (
                <div className="space-y-1.5">
                  {metrics.upcoming_renewals.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-text-soft truncate flex-1">{r.email ?? "—"}</span>
                      <span className="text-muted flex-shrink-0 ml-2">{fmtShortDate(r.renews_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-bg-soft rounded-xl p-3 border border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <XCircle className="w-3.5 h-3.5 text-error-400" />
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">{t("admin_recent_cancellations")}</p>
              </div>
              {metrics.recent_cancellations.length === 0 ? (
                <p className="text-xs text-muted-soft">{t("admin_no_recent_cancellations")}</p>
              ) : (
                <div className="space-y-1.5">
                  {metrics.recent_cancellations.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-text-soft truncate flex-1">{c.email ?? "—"}</span>
                      <span className="text-error-400/80 flex-shrink-0 ml-2">{fmtShortDate(c.cancelled_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DonutRing({ percent, size = 44 }: { percent: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  const color = clamped >= 90 ? "#f87171" : clamped >= 70 ? "#fbbf24" : "#22d3ee";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-bg-hover" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

function PermissionRow({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-soft">{label}</p>
        <p className="text-[11px] text-muted">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`switch-track ${checked ? "switch-on" : ""}`}
      >
        <span className={`switch-thumb ${checked ? "switch-thumb-on" : ""}`} />
      </button>
    </div>
  );
}

function UserModal({
  user, license, fmtDate, canBan, canUnban, canChangeRank, canDelete, canManagePermissions,
  error, onClose, onBanToggle, onSetRank, onDelete,
}: {
  user: Profile;
  license: UserLicense | null;
  fmtDate: (iso: string | null) => string;
  canBan: boolean;
  canUnban: boolean;
  canChangeRank: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
  error: string | null;
  onClose: () => void;
  onBanToggle: () => void;
  onSetRank: (rank: UserRank) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isMember = !!license;
  const banAllowed = user.banned ? canUnban : canBan;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 flex sm:items-center sm:justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md bg-bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[88vh] overflow-y-auto animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border sticky top-0 bg-bg-card z-10">
            <div className="w-11 h-11 rounded-2xl bg-bg-soft flex items-center justify-center flex-shrink-0">
              {user.role === "admin" ? (
                <Shield className="w-5 h-5 text-error-400" />
              ) : (
                <Users className="w-5 h-5 text-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.email}</p>
              <p className="text-[11px] text-muted">{t("admin_account_since", { date: fmtDate(user.created_at) })}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-bg-soft border border-border flex items-center justify-center text-muted hover:text-text transition-colors flex-shrink-0"
              title={t("admin_close_user")}
              aria-label={t("admin_close_user")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* pb extra en el celu: en mobile este modal es una hoja pegada
              abajo (bottom-0 arriba), así que sin esto "Eliminar cuenta"
              queda tapado detrás de la barra de navegación de Android en
              pantalla — env(...) da 0 en desktop/gestos, no cambia nada ahí. */}
          <div className="p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4">
            {error && (
              <div className="flex items-start gap-2 text-xs text-error-400 bg-error/10 rounded-xl p-2.5 border border-error/20">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic info */}
            <div className="space-y-2">
              <InfoRow icon={Mail} label={t("admin_email_label")} value={user.email} />
              <InfoRow icon={Calendar} label={t("admin_registered_label")} value={fmtDate(user.created_at)} />
            </div>

            {/* Membership */}
            <div className="glass rounded-xl p-3.5 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Crown className={`w-4 h-4 ${isMember ? "text-primary" : "text-muted"}`} />
                <span className="text-sm font-bold">{isMember ? t("admin_member_active_license") : t("admin_no_license_label")}</span>
              </div>
              <p className="text-xs text-muted">
                {isMember
                  ? license?.expires_at
                    ? t("admin_expires_on", { date: fmtDate(license.expires_at), source: licenseSourceLabel(license.source, t) })
                    : t("admin_lifetime_source", { source: license ? licenseSourceLabel(license.source, t) : "" })
                  : t("admin_user_no_member_access")}
              </p>
            </div>

            {/* Status + rank */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="glass rounded-xl p-3 border border-border">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1">{t("admin_status_label")}</p>
                <div className="flex items-center gap-1.5">
                  {user.banned ? (
                    <><Ban className="w-3.5 h-3.5 text-error-400" /><span className="text-sm font-bold text-error-400">{t("admin_banned_badge")}</span></>
                  ) : (
                    <><BadgeCheck className="w-3.5 h-3.5 text-success-400" /><span className="text-sm font-bold text-success-400">{t("admin_active")}</span></>
                  )}
                </div>
              </div>
              <div className="glass rounded-xl p-3 border border-border">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1">{t("admin_rank_label")}</p>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span className="text-sm font-bold">{rankLabel(t, user.rank)}</span>
                </div>
              </div>
            </div>

            {/* Rank change — owner only, real permission enforced server-side too */}
            <div>
              <label className="label flex items-center gap-1.5">
                {t("admin_change_rank_label")}
                {!canChangeRank && <Lock className="w-3 h-3 text-muted" />}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["owner", "staff", "none"] as UserRank[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => canChangeRank && onSetRank(r)}
                    disabled={!canChangeRank}
                    className={`px-2 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      user.rank === r
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-bg-soft text-muted border border-border hover:text-text"
                    }`}
                  >
                    {rankLabel(t, r)}
                  </button>
                ))}
              </div>
              {!canChangeRank && (
                <p className="text-[11px] text-muted-soft mt-1.5">{t("admin_owner_only_rank")}</p>
              )}
            </div>

            {/* Actions */}
            {user.role !== "admin" && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={onBanToggle}
                  disabled={!banAllowed}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    user.banned
                      ? "bg-success-400/15 text-success-400 hover:bg-success-400/25"
                      : "bg-warning-400/15 text-warning-400 hover:bg-warning-400/25"
                  }`}
                >
                  {user.banned ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  {user.banned ? t("admin_unban_user") : t("admin_ban_user")}
                  {!banAllowed && <Lock className="w-3.5 h-3.5 ml-1" />}
                </button>

                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onDelete}
                      className="flex-1 py-2.5 rounded-xl bg-error-400 text-white text-sm font-bold hover:bg-error-500 transition-colors"
                    >
                      {t("admin_confirm_delete")}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="px-4 py-2.5 rounded-xl bg-bg-soft border border-border text-sm font-bold text-muted"
                    >
                      {t("admin_cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => canDelete && setConfirmingDelete(true)}
                    disabled={!canDelete}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-error-400/10 text-error-400 text-sm font-bold hover:bg-error-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("admin_delete_account")}
                    {!canDelete && <Lock className="w-3.5 h-3.5 ml-1" />}
                  </button>
                )}
                {!canDelete && (
                  <p className="text-[11px] text-muted-soft text-center">{t("admin_owner_only_delete")}</p>
                )}
              </div>
            )}

            {!canManagePermissions && (
              <p className="text-[10px] text-muted-soft text-center pt-1">
                {t("admin_perms_tab_hint")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-bg-soft flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-muted" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-soft">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function genKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments: string[] = [];
  for (let s = 0; s < 4; s++) {
    let seg = "";
    for (let i = 0; i < 4; i++) seg += chars[Math.floor(Math.random() * chars.length)];
    segments.push(seg);
  }
  return segments.join("-");
}

// ============================================================
// Variante de escritorio/tablet (md+) — misma data y handlers que arriba,
// solo cambia la presentación. Nada de esto se renderiza en mobile.
// ============================================================

function DesktopAdminHeader({ profile, signOut, t }: { profile: Profile | null; signOut: () => void; t: TFunc }) {
  return (
    <div className="glass rounded-2xl p-4 border border-border flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 border border-fuchsia-500/20">
        <Shield className="w-5 h-5 text-fuchsia-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold">{t("admin_panel_title")}</h1>
        <p className="text-xs text-muted truncate">{profile?.username ? `@${profile.username}` : profile?.email}</p>
      </div>
      <button
        onClick={signOut}
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-bg-soft border border-border text-xs font-semibold text-muted hover:text-error-400 transition-colors flex-shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" />
        {t("logout")}
      </button>
    </div>
  );
}

function DesktopAdminTabs({ tab, setTab, isOwner, t }: { tab: AdminTab; setTab: (t: AdminTab) => void; isOwner: boolean; t: TFunc }) {
  const items: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: "users", label: t("admin_tab_users"), icon: Users },
    { id: "keys", label: t("admin_tab_keys"), icon: KeyRound },
    { id: "licenses", label: t("admin_tab_licenses"), icon: Crown },
    ...(isOwner ? [{ id: "permissions" as const, label: t("admin_tab_permissions"), icon: SlidersHorizontal }] : []),
  ];
  return (
    <div className="flex gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              active
                ? "bg-gradient-to-r from-sky-500/15 to-fuchsia-500/15 text-sky-300 border border-sky-400/30"
                : "bg-bg-soft text-muted border border-border hover:text-text"
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// Colores del avatar por iniciales — mismo patrón que ChannelsView.tsx
// (gradientFor), pero LiveNest no guarda foto de perfil por cuenta (solo la
// del canal de TikTok conectado, que es otra cosa), así que acá siempre es
// iniciales — no se inventa ninguna foto.
const AVATAR_GRADIENTS = [
  "from-sky-500/60 to-primary/60",
  "from-fuchsia-500/60 to-purple-500/60",
  "from-amber-500/60 to-orange-500/60",
  "from-emerald-500/60 to-teal-500/60",
  "from-rose-500/60 to-pink-500/60",
];
function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

type SortKey = "user" | "registered";
const PAGE_SIZE = 8;

function DesktopUsersTable({ users, fmtDate, onSelect, t }: {
  users: Profile[];
  fmtDate: (iso: string | null) => string;
  onSelect: (u: Profile) => void;
  t: TFunc;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("registered");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  // Búsqueda por nombre de usuario/handle — nunca por email (no se muestra
  // en esta lista, ver requisito de privacidad del correo).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return users;
    return users.filter((u) => (u.username ?? "").toLowerCase().includes(q));
  }, [users, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const cmp = sortKey === "user"
        ? (a.username ?? "").localeCompare(b.username ?? "")
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  useEffect(() => { setPage(0); }, [query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageItems = sorted.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin_search_placeholder")}
            className="input pl-9"
          />
        </div>
        {/* No existe todavía un flujo real para crear cuentas desde el panel
            de administración (los usuarios se registran ellos mismos desde
            AuthView) — el botón se muestra para calzar con la referencia
            visual, pero deshabilitado, en vez de simular un alta falsa. */}
        <button
          disabled
          title={t("admin_add_user_unavailable")}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold opacity-50 cursor-not-allowed flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          {t("admin_add_user")}
        </button>
      </div>

      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-soft">
                <SortableTh label={t("admin_col_user")} onClick={() => toggleSort("user")} active={sortKey === "user"} dir={sortDir} />
                <SortableTh label={t("admin_col_registered")} onClick={() => toggleSort("registered")} active={sortKey === "registered"} dir={sortDir} />
                <th className="text-left px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wide">{t("admin_col_role")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wide">{t("admin_col_status")}</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wide">{t("admin_col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((u) => {
                // Nombre de usuario real (profiles.username) — el mismo
                // campo que ya exige el resto de la app para poder usarla
                // (ver el gate de App.tsx), nunca el email. Cuenta vieja sin
                // username todavía: alternativa explícita, no se inventa uno.
                const label = u.username ?? t("admin_no_username");
                const roleClass = u.rank === "owner" ? "bg-accent/15 text-accent" : u.rank === "staff" ? "bg-primary/15 text-primary" : "bg-sky-500/15 text-sky-300";
                const roleLabel = u.rank === "owner" ? "Owner" : u.rank === "staff" ? "Staff" : t("admin_member_badge");
                return (
                  <tr
                    key={u.id}
                    onClick={() => onSelect(u)}
                    className="border-b border-border last:border-0 hover:bg-bg-hover/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientFor(u.username ?? u.id)} flex items-center justify-center text-xs font-bold flex-shrink-0 border border-border`}>
                          {label.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{label}</p>
                          {u.username && <p className="text-[11px] text-muted truncate">@{u.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-soft whitespace-nowrap">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${roleClass}`}>{roleLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${
                          u.banned ? "bg-error-400/15 text-error-400" : "bg-success-400/15 text-success-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.banned ? "bg-error-400" : "bg-success-400"}`} />
                        {u.banned ? t("admin_account_inactive") : t("admin_account_active")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(u); }}
                        className="w-8 h-8 rounded-lg hover:bg-bg-hover text-muted hover:text-text transition-colors inline-flex items-center justify-center"
                        title={t("admin_col_actions")}
                        aria-label={t("admin_col_actions")}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pageItems.length === 0 && (
          <p className="text-center text-sm text-muted py-10">{t("admin_no_users")}</p>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {t("admin_showing_range", {
              from: pageSafe * PAGE_SIZE + 1,
              to: Math.min(sorted.length, (pageSafe + 1) * PAGE_SIZE),
              total: sorted.length,
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pageSafe === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center disabled:opacity-30 hover:text-text transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pageSafe >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center disabled:opacity-30 hover:text-text transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableTh({ label, onClick, active, dir }: { label: string; onClick: () => void; active: boolean; dir: "asc" | "desc" }) {
  return (
    <th className="text-left px-4 py-3">
      <button
        onClick={onClick}
        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${active ? "text-primary" : "text-muted hover:text-text-soft"}`}
      >
        {label}
        <ArrowUpDown className={`w-3 h-3 transition-transform ${active && dir === "asc" ? "rotate-180" : ""}`} />
      </button>
    </th>
  );
}

function DesktopKeysPanel({
  keys, labelMap, genLabel, setGenLabel, genQty, setGenQty, genLoading, generateKeys, copiedId, copyKey, revokeKey, deleteKey, t,
}: {
  keys: LicenseKey[];
  labelMap: Record<string, string>;
  genLabel: "7" | "30" | "365" | "lifetime";
  setGenLabel: (v: "7" | "30" | "365" | "lifetime") => void;
  genQty: number;
  setGenQty: (v: number) => void;
  genLoading: boolean;
  generateKeys: () => void;
  copiedId: string | null;
  copyKey: (id: string, key: string) => void;
  revokeKey: (id: string) => void;
  deleteKey: (id: string) => void;
  t: TFunc;
}) {
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold">{t("admin_generate_keys_title")}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {(["7", "30", "365", "lifetime"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setGenLabel(d)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  genLabel === d ? "bg-primary/15 text-primary border border-primary/30" : "bg-bg-soft text-muted border border-border hover:text-text"
                }`}
              >
                {labelMap[d]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-muted">{t("admin_quantity_label")}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={genQty}
              onChange={(e) => setGenQty(Math.max(1, Math.min(100, +e.target.value)))}
              className="w-16 px-2 py-1.5 rounded-lg bg-bg-soft border border-border text-sm text-center focus:outline-none"
            />
            <button
              onClick={generateKeys}
              disabled={genLoading}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {t("admin_generate_button")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {keys.map((k) => (
          <div key={k.id} className="glass rounded-xl p-3.5 border border-border flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[140px]">
              <code className="text-sm font-mono font-bold text-text break-all">{k.key}</code>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted">{labelMap[k.duration_label]}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  k.status === "available" ? "bg-success-400/15 text-success-400"
                  : k.status === "redeemed" ? "bg-primary/15 text-primary"
                  : "bg-error-400/15 text-error-400"
                }`}>
                  {k.status === "available" ? t("admin_key_available") : k.status === "redeemed" ? t("admin_key_redeemed") : t("admin_key_revoked")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {k.status === "available" && (
                <>
                  <button
                    onClick={() => copyKey(k.id, k.key)}
                    className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center text-muted hover:text-primary transition-colors"
                    title={t("admin_key_copy")}
                    aria-label={t("admin_key_copy")}
                  >
                    {copiedId === k.id ? <Check className="w-3.5 h-3.5 text-success-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => revokeKey(k.id)}
                    className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center text-muted hover:text-warning-400 transition-colors"
                    title={t("admin_key_revoke")}
                    aria-label={t("admin_key_revoke")}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => deleteKey(k.id)}
                className="w-8 h-8 rounded-lg bg-bg-soft border border-border flex items-center justify-center text-muted hover:text-error-400 transition-colors"
                title={t("admin_key_delete")}
                aria-label={t("admin_key_delete")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {keys.length === 0 && <p className="text-center text-sm text-muted py-10">{t("admin_no_keys")}</p>}
    </div>
  );
}

function DesktopLicensesPanel({ licenses, fmtDate, t }: {
  licenses: (UserLicense & { profile_email?: string })[];
  fmtDate: (iso: string | null) => string;
  t: TFunc;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {licenses.map((l) => (
        <div key={l.id} className="glass rounded-xl p-3.5 border border-border flex flex-wrap items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-bg-soft flex items-center justify-center flex-shrink-0">
            {l.status === "active" ? (
              <CheckCircle2 className="w-4 h-4 text-success-400" />
            ) : l.status === "cancelled" ? (
              <XCircle className="w-4 h-4 text-error-400" />
            ) : (
              <Clock className="w-4 h-4 text-warning-400" />
            )}
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className="text-sm font-bold truncate">{l.profile_email}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted">{licenseSourceLabel(l.source, t)}</span>
              <span className="text-[10px] text-muted">·</span>
              <span className="text-[10px] text-muted">{l.expires_at ? fmtDate(l.expires_at) : t("admin_duration_lifetime")}</span>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${
            l.status === "active" ? "bg-success-400/15 text-success-400"
            : l.status === "cancelled" ? "bg-error-400/15 text-error-400"
            : "bg-warning-400/15 text-warning-400"
          }`}>
            {l.status === "active" ? t("admin_active") : l.status === "cancelled" ? t("admin_license_cancelled") : t("admin_license_expired")}
          </span>
        </div>
      ))}
      {licenses.length === 0 && (
        <p className="text-center text-sm text-muted py-10 col-span-full">{t("admin_no_licenses")}</p>
      )}
    </div>
  );
}

function DesktopPermissionsPanel({ rankPerms, setStaffPermission, t }: {
  rankPerms: RankPermissions | null;
  setStaffPermission: (key: "can_ban" | "can_unban", value: boolean) => void;
  t: TFunc;
}) {
  return (
    <div className="max-w-xl space-y-4">
      <div className="glass rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold">{t("admin_perms_title")}</h2>
        </div>
        <p className="text-xs text-muted">{t("admin_perms_desc")}</p>
      </div>

      <div className="glass rounded-xl border border-border divide-y divide-border">
        <PermissionRow
          label={t("admin_perm_ban_label")}
          description={t("admin_perm_ban_desc")}
          checked={!!rankPerms?.can_ban}
          onChange={(v) => setStaffPermission("can_ban", v)}
        />
        <PermissionRow
          label={t("admin_perm_unban_label")}
          description={t("admin_perm_unban_desc")}
          checked={!!rankPerms?.can_unban}
          onChange={(v) => setStaffPermission("can_unban", v)}
        />
      </div>

      <div className="glass rounded-xl p-3.5 border border-border flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-muted flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted leading-relaxed">{t("admin_owner_only_note")}</p>
      </div>
    </div>
  );
}
