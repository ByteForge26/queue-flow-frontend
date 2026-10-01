// =====================================================================
// FILE: LanguageContext.tsx
// =====================================================================
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { STRINGS, type Lang } from "./strings";

// -----------------------------------------------------------------
// STORAGE_KEY: localStorage mein language preference ko kis key se save karein
// "qf.lang" ka matlab hai "QueueFlow language" – ek chhota sa namespace prefix
// taaki doosre apps ke keys se conflict na ho
// -----------------------------------------------------------------
const STORAGE_KEY = "qf.lang";

// -----------------------------------------------------------------
// LanguageCtx Interface: Ye batata hai ki Context mein exactly kya kya data
// hoga. TypeScript interface ek "blueprint" hai – iske through hum guarantee
// karte hain ki context mein ye teeno cheezein zaroor hongi:
//   - lang    : current language code ("en" ya "hi")
//   - setLang : function jo language change kare
//   - t       : translation function – key do, translated string lo
//               (optional `vars` se string mein {placeholder} values fill hoti hain)
// -----------------------------------------------------------------
interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

// -----------------------------------------------------------------
// Ctx: Actual React Context object.
// createContext<LanguageCtx | null>(null) – shuruat mein null hai kyunki
// Provider ke bahar koi value nahi hoti. null default isliye diya hai taaki
// TypeScript ko pata chale ki Provider ke bahar use karna galat hai (useLang
// mein iska check hai).
// -----------------------------------------------------------------
const Ctx = createContext<LanguageCtx | null>(null);

// -----------------------------------------------------------------
// initialLang(): Ye function sirf ek baar chalta hai – app ke pehle render par.
// localStorage mein dekha: kya pehle se koi language save thi?
//   - Agar "hi" ya "en" milti hai, wahi use karo (user ki previous choice yaad rahe)
//   - Agar kuch nahi mila (pehli baar aa rahe hain), default "en" (English) use karo
// Ye function useState ke initializer ke roop mein use hoti hai – isliye ye
// React ke bahar define ki gayi hai (unnecessary re-runs avoid karne ke liye).
// -----------------------------------------------------------------
function initialLang(): Lang {
  const saved: string | null = localStorage.getItem(STORAGE_KEY);
  return saved === "hi" || saved === "en" ? (saved as Lang) : "en"; // default English
}

// -----------------------------------------------------------------
// LanguageProvider: Ye woh React component hai jo puri app ko wrap karta hai.
// Iske andar jo bhi `children` hain (matlab poori app ka UI tree), woh sabhi
// language context ka data access kar sakte hain – useLang() ya useT() se.
//
// Props:
//   - children: ReactNode – koi bhi React element(s) jo is Provider ke andar
//               render honge (usually ye poori app hoti hai)
// -----------------------------------------------------------------
export function LanguageProvider({ children }: { children: ReactNode }) {

  // -----------------------------------------------------------------
  // useState: `lang` state – current language store karta hai.
  // initialLang function ko directly pass kiya hai (call nahi kiya) – iska
  // matlab hai React isko "lazy initializer" ki tarah treat karta hai aur sirf
  // pehle render par chalata hai. Ye zyada efficient hai kyunki localStorage
  // access costly operation hai, baar baar nahi karni chahiye.
  // -----------------------------------------------------------------
  const [lang, setLangState] = useState<Lang>(initialLang);

  // -----------------------------------------------------------------
  // setLang: Ye woh public function hai jo bahar ke components call karenge
  // language change karne ke liye. Ye do kaam karta hai ek saath:
  //   1. React state update karta hai (setLangState) – UI re-render ho
  //   2. localStorage mein save karta hai – next visit par bhi yaad rahe
  //
  // useCallback kyun? Agar hum ise normal function likhein, toh har render
  // par ek naya function object create hoga. useCallback ensure karta hai ki
  // jab tak [] dependencies nahi badlein (yahan koi dependency nahi hai),
  // yehi same function reference use ho. Isse child components unnecessarily
  // re-render nahi hote.
  // -----------------------------------------------------------------
  const setLang = useCallback((l: Lang): void => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []); // [] = koi dependency nahi, ye function kabhi naya nahi banega

  // -----------------------------------------------------------------
  // t(): Translation function – ye poori i18n (internationalization) ka dil hai.
  // Kaise kaam karta hai:
  //   1. Current language (lang) ke liye STRINGS dictionary lo
  //   2. Diya gaya key us dictionary mein dhundo
  //   3. Agar current language mein nahi mila, English mein try karo (fallback)
  //   4. Agar English mein bhi nahi mila, key khud hi return karo (atleast
  //      kuch toh dikhega, blank nahi hoga)
  //   5. Agar `vars` diye hain (e.g. { name: "Ali", count: 3 }), toh string
  //      mein {name}, {count} jaise placeholders replace karo actual values se
  //
  // Example:
  //   STRINGS.en.greeting = "Hello, {name}!"
  //   t("greeting", { name: "Priya" }) => "Hello, Priya!"
  //
  // useCallback([lang]) – jab bhi language badle, naya t function banao
  // (kyunki naya language ka dictionary chahiye hoga)
  // -----------------------------------------------------------------
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      // Current language ki string dictionary nikalo (Record<string,string> cast
      // isliye ki TypeScript ko pata chale ye simple key-value map hai)
      const dict = STRINGS[lang] as Record<string, string>;

      // Key dhundo: pehle current language mein, phir English fallback, phir
      // key khud return karo – ?? operator null/undefined pe hi fallback deta hai
      let str: string = dict[key] ?? (STRINGS.en as Record<string, string>)[key] ?? key;

      // Agar variables diye hain toh {placeholder} replace karo
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          // RegExp se global replace: saare {k} occurrences replace honge ek baar mein
          // new RegExp(`\\{${k}\\}`, "g") – e.g. k="name" => regex: /\{name\}/g
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }

      return str;
    },
    [lang] // jab lang badle, t() function naya bane taaki naya dictionary use ho
  );

  // -----------------------------------------------------------------
  // value: Context mein jo data share hoga uska object.
  // useMemo isliye use kiya – agar lang, setLang, aur t teeno same rahein,
  // toh naya object mat banao. Naya object banana matlab consumers
  // (useContext wale components) dobara render honge – useMemo se ye rokte hain.
  // -----------------------------------------------------------------
  const value: { lang: Lang; setLang: (l: Lang) => void; t: typeof t } = useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  // Ctx.Provider se saare children ko value provide karo – ab koi bhi
  // nested component useLang() ya useT() se ye data le sakta hai
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// -----------------------------------------------------------------
// useLang(): Custom hook – kisi bhi component ko poora language context deta hai.
// Isme ek safety check bhi hai: agar koi developer galti se ise
// <LanguageProvider> ke bahar use kare, toh clear error message milega –
// "useLang must be used within LanguageProvider" – warna null context se
// cryptic errors aate.
//
// Returns: { lang, setLang, t } – teeno language utilities ek saath
// -----------------------------------------------------------------
export function useLang(): LanguageCtx {
  const ctx: LanguageCtx | null = useContext(Ctx); // Context se current value nikalo
  if (!ctx) throw new Error("useLang must be used within LanguageProvider"); // safety guard
  return ctx;
}

/** Shortcut hook – sirf t() chahiye to. */
// -----------------------------------------------------------------
// useT(): Convenience hook – jab component ko sirf translation function chahiye
// aur lang ya setLang nahi chahiye, toh seedha t() lo.
// Zyada components mein yahi use hoga kyunki mostly text translate karna hota hai.
//
// Usage example:
//   const t = useT();
//   return <h1>{t("welcome_title")}</h1>;
// -----------------------------------------------------------------
export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  return useLang().t;
}