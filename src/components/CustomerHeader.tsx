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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Link
          to="/"
          className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs text-white">
            MT
          </span>
          <span className="truncate">{t("app.name")}</span>
        </Link>

        <nav className="flex w-full items-center gap-1 text-xs sm:w-auto sm:gap-2 sm:text-sm">
          <Link
            to="/customer"
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-2 text-center text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:flex-none sm:px-3"
          >
            {t("header.changeLocation")}
          </Link>
          <Link
            to={shopCode ? `/my-orders/${shopCode}` : "/customer"}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-2 text-center text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:flex-none sm:px-3"
          >
            {t("header.myOrders")}
          </Link>
          <div className="ml-1 shrink-0">
            <LanguageToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}