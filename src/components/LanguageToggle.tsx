// ============================================================
// LanguageToggle.tsx
// ============================================================

// useLang — custom hook hai jo LanguageContext se teen cheezein deta hai:
// lang    : current language string, e.g. "en" ya "hi"
// setLang : function jo language change karta hai (aur localStorage update karta hai)
// t       : translation function — key do, translated string wapas milti hai
import { useLang } from "../i18n/LanguageContext";

/** Chhota EN/HI toggle pill. Click pe doosri language pe switch (localStorage me save). */
export default function LanguageToggle() {
  const { lang, setLang, t } = useLang();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      className="inline-flex items-center justify-center rounded-full border border-indigo-100 bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-slate-700 shadow-[0_8px_20px_rgba(79,70,229,0.08)] transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-brand"
      title={lang === "en" ? "हिंदी में देखो" : "View in English"}
    >
      <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[9px] text-brand">
        {lang === "en" ? "EN" : "हिं"}
      </span>
      {t("lang.toggle")}
    </button>
  );
}