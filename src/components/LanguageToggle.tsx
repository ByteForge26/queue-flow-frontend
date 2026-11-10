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
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold tracking-wide text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      title={lang === "en" ? "हिंदी में देखो" : "View in English"}
    >
      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[9px] text-slate-700">
        {lang === "en" ? "EN" : "हिं"}
      </span>
      {t("lang.toggle")}
    </button>
  );
}