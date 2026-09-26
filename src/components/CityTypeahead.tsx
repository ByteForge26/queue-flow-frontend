// ============================================================
// CityTypeahead.tsx
// City ka naam type/select karne ke liye searchable dropdown input.
// ============================================================

import { useState, useRef, useEffect } from "react";
import type { CityDto } from "../lib/types";

// Props interface — ye batata hai ki parent component is component ko
// kya-kya data pass kar sakta hai
interface Props {
  // cities: Server se fetch ki gayi saari cities ki array.
  // Filtering isi list ke upar hoti hai — koi extra API call nahi hoti.
  cities: CityDto[];

  // value: Abhi ka selected/typed city value. Parent is value ko control
  // karta hai (controlled component pattern) — isliye "value" prop hai.
  value: string;

  // onChange: Jab bhi city change ho (user type kare ya suggestion select
  // kare), ye function call hota hai. Parent ko updated value milti hai.
  onChange: (city: string) => void;

  // label: (optional) Input ke upar dikhne wala text, e.g. "From City".
  // Agar pass na karo to label nahi dikhega.
  label?: string;

  // loading: (optional) Agar cities abhi server se aa rahi hain to true
  // pass karo — tab input ki jagah spinning loader dikhega.
  loading?: boolean;

  // disabled: (optional) Agar form submit ho raha ho ya field read-only
  // karni ho to true pass karo — input gray aur non-interactive ho jaata hai.
  disabled?: boolean;
}

export default function CityTypeahead({
  cities,
  value,
  onChange,
  label,
  loading,
  disabled,
}: Props) {
  // query: Input box mein jo text dikhta hai woh yahan store hota hai.
  // Initial value parent se aaya `value` prop se set hoti hai.
  const [query, setQuery] = useState(value);

  // open: Dropdown visible hai ya nahi. true = dikha do, false = chhupa do.
  const [open, setOpen] = useState(false);

  // containerRef: Is div ka direct DOM reference rakhte hain.
  // Kaam aata hai outside-click detect karne mein — neeche useEffect mein dekho.
  const containerRef = useRef<HTMLDivElement>(null);

  // useEffect #1 — Parent se value sync karna
  // Jab bhi parent component `value` prop badalta hai (e.g., form reset karne
  // par ya programmatically city change karne par), local `query` state bhi
  // us naye value se sync ho jaati hai taaki input box sahi cheez dikhaye.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // suggestions: User ke type kiye query ke basis par filtered city list.
  // - Agar query blank hai to pehli 8 cities dikha do (default/popular choices)
  // - Agar kuch type kiya hai to city name YA state name mein match dhundo
  //   (case-insensitive) aur slice(0,8) se max 8 results rakho (dropdown
  //   bahut lamba na ho isliye limit hai)
  const suggestions: CityDto[] =
    query.trim().length === 0
      ? cities.slice(0, 8)
      : cities
          .filter((c: CityDto) => {
            const q: string = query.trim().toLowerCase();
            // City name mein match karo, YA state name mein match karo
            // `?? ""` isliye — agar state null/undefined ho to empty string use karo
            return (
              c.city.toLowerCase().includes(q) ||
              (c.state ?? "").toLowerCase().includes(q)
            );
          })
          .slice(0, 8); // Maximum 8 suggestions — UI ko clean rakhne ke liye

  // select(): Jab user dropdown se koi city click kare tab ye function chalta hai.
  // - Input mein "State – City" format ka label set karta hai (readable display)
  // - Parent ko sirf city naam bhejta hai (state nahi) — onChange(c.city)
  // - Dropdown band karta hai
  function select(c: CityDto) {
    const label: string = c.state ? `${c.state} – ${c.city}` : c.city; // Display format
    setQuery(label); // Input box mein full label dikhao
    onChange(c.city); // Parent ko sirf city ka naam do (state ke bina)
    setOpen(false); // Suggestion dropdown band karo
  }

  // handleChange(): Jab user keyboard se kuch type kare tab ye chalta hai.
  // - query update karta hai (input box live update ho)
  // - Parent ko bhi raw typed value bhejta hai (user shayad exact city name
  //   type kar raha ho jo list mein na ho — edge case handle karna zaroori hai)
  // - Dropdown open karta hai taaki suggestions dikh sakein
  function handleChange(v: string) {
    setQuery(v);
    // if user typed manually, pass raw value
    // (manually type kiya hua value parent ko dena zaroori hai taaki form
    // validation ya controlled state ka koi issue na aaye)
    onChange(v);
    setOpen(true); // Typing ke time dropdown khula rakhna chahiye
  }

  // useEffect #2 — Outside click par dropdown band karna (global listener)
  // Problem: Agar user input ke bahar kuch click kare to dropdown band hona
  // chahiye. Isliye poore document par "mousedown" event sunate hain.
  // - `containerRef.current.contains(e.target)` check karta hai ki click
  //   is component ke andar hua ya bahar. Andar hua to kuch nahi karo.
  //   Bahar hua to dropdown band karo.
  // - Cleanup function mein listener remove karte hain — ye important hai
  //   taaki component unmount hone par memory leak na ho.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      // Agar click event component ke div ke bahar hua hai to dropdown band karo
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    // Cleanup: component unmount hone par listener hatao (memory leak prevent)
    return () => document.removeEventListener("mousedown", onDown);
  }, []); // [] = sirf mount/unmount par chale, baar baar nahi

  // displayLabel(): Suggestion list mein har city ka readable format banana.
  // Agar state available hai to "State – City", warna sirf "City" dikhao.
  const displayLabel = (c: CityDto): string =>
    c.state ? `${c.state} – ${c.city}` : c.city;

  return (
    // containerRef yahan lagaya hai taaki outside-click detect ho sake
    // "relative" class isliye — dropdown (absolute positioned) isi div ke
    // andar se position lega, page ke top-left se nahi
    <div ref={containerRef} className="relative">
      {/* label prop agar diya gaya ho to input ke upar text dikhao */}
      {label && <label className="block text-sm text-gray-600 mb-1">{label}</label>}

      {/* loading true hai to input ki jagah spinner dikhao */}
      {loading ? (
        // Spinner container — same size jaise input hota hai taaki layout shift na ho
        <div className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-400 text-sm flex items-center gap-2">
          {/* Rotating spinner — CSS animation se ghumta hai */}
          <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin flex-shrink-0" />
        </div>
      ) : (
        // Actual city input field
        <input
          type="text"
          value={query} // Controlled input — value state se aata hai
          disabled={disabled} // Parent ne disable kaha to gray ho jaao
          // Agar cities available hain to helpful placeholder, warna generic
          placeholder={cities.length > 0 ? "Type or pick a city…" : "Enter city"}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)} // Typing par handleChange call
          onFocus={() => setOpen(true)} // Click/tab se focus aane par dropdown kholo
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
          autoComplete="off" // Browser ka built-in autocomplete band karo — hamare
          // paas khud ka dropdown hai, dono ek saath nahi chahiye
        />
      )}

      {/* Dropdown suggestion list — sirf tab dikho jab open=true aur suggestions hain */}
      {open && suggestions.length > 0 && (
        // absolute positioning + z-50 taaki ye dusre elements ke upar aaye
        // left-0 right-0 = input ki poori width cover karo
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((c: CityDto, i: number) => (
            <li
              key={i}
              // onMouseDown isliye use kiya (onClick nahi) kyunki onClick se pehle
              // input ka onBlur fire hota aur dropdown band ho jaata — user click
              // register nahi hota. mouseDown se ye problem avoid hoti hai.
              onMouseDown={() => select(c)}
              className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 text-sm"
            >
              {/* Har suggestion mein "State – City" ya sirf "City" format */}
              {displayLabel(c)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}