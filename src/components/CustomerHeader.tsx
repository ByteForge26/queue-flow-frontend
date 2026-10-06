// ============================================================
// CustomerHeader.tsx
// ============================================================

import { Link } from "react-router-dom";
// useT: i18n (internationalization) hook hai — ye ek function `t` return karta hai
// jisme hum translation key pass karte hain aur wo current language mein text deta hai
import { useT } from "../i18n/LanguageContext";
// LanguageToggle: ek aur reusable component hai jo user ko language switch karne
// ka button/option deta hai (jaise English <-> Hindi).
import LanguageToggle from "./LanguageToggle";

/**
 * Customer-facing top bar — har customer page pe. Region kabhi bhi badal sake,
 * home ja sake, apne orders dekh sake, aur bhasha switch kar sake.
 *
 * @param shopCode agar shop context pata ho to "Mere orders" us shop ke liye link kare.
 */
// shopCode prop optional hai (? ka matlab optional) — agar nahi diya toh undefined hoga
export default function CustomerHeader({ shopCode }: { shopCode?: string }) {
  const t = useT();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white px-3 py-1.5 font-semibold text-brand shadow-[0_10px_25px_rgba(79,70,229,0.08)] transition hover:border-indigo-200 hover:shadow-[0_12px_30px_rgba(79,70,229,0.12)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-indigo-600 text-xs text-white shadow-lg shadow-indigo-500/30">
            QF
          </span>
          {t("app.name")}
        </Link>

        <nav className="flex items-center gap-1.5 text-sm sm:gap-2">
          <Link
            to="/customer"
            className="rounded-full px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-brand"
          >
            {t("header.changeLocation")}
          </Link>
          <Link
            to={shopCode ? `/my-orders/${shopCode}` : "/customer"}
            className="rounded-full px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-brand"
          >
            {t("header.myOrders")}
          </Link>
          <div className="ml-1 rounded-full border border-slate-200 bg-slate-50/80 p-1 shadow-inner shadow-slate-200/60">
            <LanguageToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}