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
  // useLang hook se context ki teeno values destructure kar rahe hain:
  // lang    — abhi kaunsi language active hai ("en" ya "hi")
  // setLang — language update karne ka function
  // t       — translation helper (key → translated text)
  const { lang, setLang, t } = useLang();

  return (
    <button
      // onClick: jab user button dabaye, language toggle ho jaaye.
      // Ternary logic: agar abhi "en" hai to "hi" set karo, warna "en" set karo.
      // Isse sirf do hi states possible hain — simple flip mechanism.
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      // Tailwind CSS classes ka matlab:
      //   text-xs                              - chhota font size (12px)
      //   px-2 py-1                            - horizontal padding 8px, vertical padding 4px (pill shape)
      //   rounded-lg                           - rounded corners taaki pill jaisi dikhey
      //   border border-gray-200               - default state mein light gray border
      //   text-gray-600                        - default text thoda gray color
      //   hover:border-brand hover:text-brand  - hover pe brand color mein highlight
      //   (brand color project ke Tailwind config mein defined hai)
      className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-brand hover:text-brand"
      // title attribute — browser ka native tooltip.
      // Jab user mouse button pe le jaaye to helpful hint dikhta hai:
      //   Current language "en" hai → Hindi mein switch karne ka suggestion (Hindi mein likha)
      //   Current language "hi" hai → English mein switch karne ka suggestion (English mein likha)
      // Ye UX ke liye important hai — user ko pata chale ki click karne pe KYA hoga.
      title={lang === "en" ? "हिंदी में देखो" : "View in English"}
    >
      {/* t("lang.toggle") — translation function call kiya ja raha hai.
          "lang.toggle" ek translation key hai jo i18n/translations file mein defined hai.
          English mein ye kuch aisa ho sakta hai: "EN | HI"
          Hindi mein ye kuch aisa ho sakta hai: "हि | EN"
          Is tarah button ka label bhi current language ke hisaab se change ho jaata hai. */}
      {t("lang.toggle")}
    </button>
  );
}