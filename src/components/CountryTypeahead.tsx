// ============================================================
// CountryTypeahead.tsx
// Country ka naam type/select karne ke liye searchable dropdown input.
// ============================================================

import { useState, useRef, useEffect } from "react";
import { COUNTRIES, type CountryInfo } from "../lib/countries";

// Props interface — ye define karta hai ki parent component
// is CountryTypeahead ko kaun kaun si values pass kar sakta hai
interface Props {
  // Abhi input mein jo value dikhni chahiye (controlled input hai)
  value: string;
  // Jab bhi user type kare ya suggestion select kare, ye function call hota hai
  // parent component ko updated naam milta hai
  onChange: (name: string) => void;
  // Input ke upar dikhne wala text label — agar pass na karo to label nahi dikhega
  label?: string;
  // Agar true ho to label ke aage red asterisk (*) lagega — required field indicator
  required?: boolean;
  // Form validation se aane wala error message — neeche red mein dikhega
  error?: string;
  // Agar location detect ho rahi ho (async operation chal rahi ho) to true karo
  // tab input ki jagah spinner dikhega
  loading?: boolean;
  // Loading spinner ke saath dikhane wala custom message
  // default fallback: "Detecting location..."
  loadingText?: string;
}

export default function CountryTypeahead({
  value,
  onChange,
  label,
  required,
  error,
  loading,
  loadingText,
}: Props) {
  // query: text input mein jo kuch bhi likha hai uska state
  // Initial value parent se aaya `value` prop se set hota hai
  const [query, setQuery] = useState(value);

  // open: dropdown suggestions list dikhani hai ya nahi — true/false
  const [open, setOpen] = useState(false);

  // containerRef: pure component ke outer <div> ka reference
  // Iska use "outside click detection" ke liye hota hai —
  // agar click is div ke bahar ho to dropdown band karo
  const containerRef = useRef<HTMLDivElement>(null);

  // listRef: suggestions wali <ul> list ka reference
  // Future mein keyboard navigation (ArrowUp/ArrowDown) ke liye useful ho sakta hai
  const listRef = useRef<HTMLUListElement>(null);

  // keep query in sync when parent sets value programmatically (geo auto-fill)
  // Jab parent component `value` prop badal de (jaise location auto-detect ke baad),
  // tab hum apna local `query` state bhi us naye value se sync kar dete hain.
  // Agar ye na hota, to input mein purana text dikh raha hota jabki parent ne
  // naya value set kar diya hota.
  useEffect(() => {
    setQuery(value);
  }, [value]); // sirf tab run karo jab `value` prop change ho

  // suggestions: user ke current query ke basis par filtered country list
  // - Agar query empty hai to koi suggestion nahi dikhate (empty array return)
  // - Warna COUNTRIES list mein se woh countries filter karo jinke naam query se
  //   START karte hain (case-insensitive match: "in" se "India" bhi milega
  //   aur "indonesia" bhi)
  // - .slice(0, 8): max 8 suggestions dikhate hain — zyada suggestions
  //   overwhelming lagte hain
  const suggestions: CountryInfo[] =
    query.trim().length === 0
      ? []
      : COUNTRIES.filter((c: CountryInfo) =>
          c.name.toLowerCase().startsWith(query.trim().toLowerCase())
        ).slice(0, 8);

  // select: jab user kisi suggestion par click kare
  // 1. Input mein us country ka naam set karo
  // 2. Parent ko onChange callback ke zariye bhi batao
  // 3. Dropdown band karo
  function select(name: string) {
    setQuery(name);
    onChange(name);
    setOpen(false);
  }

  // handleChange: jab user input mein khud type kare
  // 1. Local query state update karo
  // 2. Parent ko bhi latest typed value do (partial text bhi valid ho sakta hai)
  // 3. Dropdown kholo taaki suggestions dikh sakein
  function handleChange(v: string) {
    setQuery(v);
    onChange(v);
    setOpen(true);
  }

  // close on outside click
  // Jab bhi user component ke bahar kahi click kare, dropdown band ho jaye.
  // document par mousedown listener lagata hai — pure page par clicks sunne ke liye.
  // cleanup function (return ke andar) component unmount hone par listener
  // hata deta hai — ye memory leak aur ghost event listeners rokta hai.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      // Agar click target containerRef ke andar NAHI hai to dropdown band karo
      // containerRef.current.contains() check karta hai ki click kahan hua
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    // Cleanup: component unmount hone par ya next effect run se pehle listener hatao
    return () => document.removeEventListener("mousedown", onDown);
  }, []); // empty dependency array: sirf ek baar mount par run karo

  return (
    // containerRef yahan attach hai taaki outside-click detection kaam kare
    // "relative" class: dropdown list ko is container ke relative position karne ke liye
    <div ref={containerRef} className="relative">
      {/* label sirf tab render karo jab label prop pass kiya gaya ho */}
      {label && (
        <label className="block text-sm text-gray-600 mb-1">
          {label}
          {/* required prop true ho to red asterisk dikhao — required field ka indicator */}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* loading true ho to input ki jagah spinner dikhao,
          warna normal text input dikhao */}
      {loading ? (
        // Loading state: spinner + text — jab location auto-detect ho rahi ho
        <div className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-400 text-sm flex items-center gap-2">
          {/* CSS spinner: border-t-transparent trick se rotating arc banta hai */}
          <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin flex-shrink-0" />
          {/* loadingText prop diya ho to woh dikhao, warna default message */}
          <span>{loadingText ?? "Detecting location..."}</span>
        </div>
      ) : (
        // Normal input field
        <input
          type="text"
          value={query} // controlled input — state se driven
          placeholder="e.g. India"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)} // har keystroke par handleChange call
          // onFocus: agar input par focus aaye aur kuch typed hai,
          // to dropdown wapas dikhao (user ne shayad accidentally close kiya ho)
          onFocus={() => query.trim().length > 0 && setOpen(true)}
          // error prop ho to red border, warna normal gray border
          className={`w-full border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40 ${
            error ? "border-red-400" : "border-gray-200"
          }`}
          // autoComplete="off": browser ka built-in autocomplete band karo —
          // hum apna custom dropdown use kar rahe hain, browser wala interfere na kare
          autoComplete="off"
        />
      )}

      {/* error message: agar parent ne error prop pass kiya ho to red text mein neeche dikhao */}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Dropdown suggestions list:
          sirf tab dikhao jab open=true ho aur suggestions list empty na ho */}
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          // absolute positioning: input ke bilkul neeche, full width mein
          // z-50: baaki content ke upar dikhega (high z-index)
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map((c: CountryInfo) => (
            <li
              key={c.name} // React ke liye unique key — country naam se
              // onMouseDown use kiya hai, onClick nahi — kyunki:
              // onClick se pehle input ka onBlur fire hota jo dropdown band kar deta,
              // mouseDown onBlur se pehle fire hota hai, isliye selection sahi kaam karta hai
              onMouseDown={() => select(c.name)}
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 text-sm"
            >
              {/* Country ka flag emoji */}
              <span className="text-lg leading-none">{c.flag}</span>
              {/* Country ka naam */}
              <span>{c.name}</span>
              {/* Dial code (jaise +91 for India) — right side mein gray color mein */}
              <span className="ml-auto text-gray-400 text-xs">{c.dialCode}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}