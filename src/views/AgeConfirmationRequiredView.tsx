import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { Cake, AlertCircle, Loader2 } from "lucide-react";

const MIN_SIGNUP_AGE = 13;
const ADULT_AGE = 18;

function calculateAge(birthDateStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) return null;
  const birth = new Date(birthDateStr + "T00:00:00");
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** Gate bloqueante, mismo patrón que UsernameRequiredView: se muestra en vez
 *  del dashboard cuando hay sesión pero el perfil todavía no tiene fecha de
 *  nacimiento — típicamente cuentas de Google/Discord, que nunca pasan por
 *  el formulario de registro donde se pide. */
export function AgeConfirmationRequiredView() {
  const { confirmBirthDate, signOut } = useAuth();
  const { t } = useI18n();
  const [birthDate, setBirthDate] = useState("");
  const [parentalConsent, setParentalConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const age = calculateAge(birthDate);
  const needsParentalConsent = age !== null && age >= MIN_SIGNUP_AGE && age < ADULT_AGE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (age === null) {
      setError(t("auth_err_birth_date_required"));
      return;
    }
    if (age < MIN_SIGNUP_AGE) {
      setError(t("auth_err_age_under_minimum"));
      return;
    }
    if (needsParentalConsent && !parentalConsent) {
      setError(t("auth_err_age_needs_consent"));
      return;
    }

    setLoading(true);
    const { error } = await confirmBirthDate(birthDate, parentalConsent);
    setLoading(false);
    if (error) setError(error);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center glow-primary mb-4">
            <Cake className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-center">{t("auth_age_required_title")}</h1>
          <p className="text-sm text-muted mt-1 text-center">{t("auth_age_required_desc")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">{t("auth_birth_date_label")}</label>
            <div className="relative">
              <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="date"
                required
                autoFocus
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-soft border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            {needsParentalConsent && (
              <label className="flex items-start gap-2 mt-2.5 px-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={parentalConsent}
                  onChange={(e) => setParentalConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-primary flex-shrink-0"
                />
                <span className="text-[11px] text-muted leading-relaxed">{t("auth_parental_consent_label")}</span>
              </label>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-error-400/10 border border-error-400/20 text-error-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || age === null || age < MIN_SIGNUP_AGE || (needsParentalConsent && !parentalConsent)}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 card-press"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("auth_age_required_button")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => signOut()} className="text-xs text-muted hover:text-primary transition-colors">
            {t("logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
