// =====================================================================
// ShopLandingPage.tsx
// (Header comment block collapsed in screenshots — original comments
//  above this point were not visible and are not reconstructed here.
//  Add your actual imports back, e.g.:)
// =====================================================================
// import { useState, useEffect } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import { getShop } from "../lib/api";
// import { useT } from "../i18n/LanguageContext";
// import CustomerHeader from "../components/CustomerHeader";
// import ShopContact from "./ShopContact";
// import { Card, Spinner } from "../components/ui";
// import type { ShopDto, SectionDto } from "../lib/types";

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";
import { getShop } from "../lib/api";
import { useT } from "../i18n/LanguageContext";
import CustomerHeader from "../components/CustomerHeader";
import ShopContact from "../components/ShopContact";
import { Card, Spinner } from "../components/ui";
import type { ShopDto, SectionDto } from "../lib/types";

// Section type -> emoji (chhota visual cue)
// Har industry type ke liye ek emoji map kiya gaya hai taaki card pe icon dikhaya ja sake
const ICON: Record<string, string> = {
  SALON: "💇",
  FOOD: "🍽",
  CLINIC: "🏥",
  GROCERY: "🛒",
  ROOMS: "🛏",
  GENERAL: "🏪",
  OTHER: "👤",
};

// Section type -> left border color class
// Har industry type ke card ko alag color ka left border milta hai —
// isse visually sections alag-alag type ke lagte hain (Tailwind CSS classes)
const SECTION_BORDER: Record<string, string> = {
  SALON: "border-l-4 border-l-pink-400",
  FOOD: "border-l-4 border-l-orange-400",
  CLINIC: "border-l-4 border-l-blue-400",
  GROCERY: "border-l-4 border-l-green-400",
  ROOMS: "border-l-4 border-l-purple-400",
  GENERAL: "border-l-4 border-l-gray-400",
  OTHER: "border-l-4 border-l-slate-400",
};

export default function ShopLandingPage() {
  // URL se shopCode nikalo — e.g. route /shop/:shopCode se "ABC123" milega
  const { shopCode = "" } = useParams();

  // navigate hook — programmatically kisi aur page pe bhejne ke liye (e.g. order page)
  const navigate: NavigateFunction = useNavigate();

  // t() — translation function, current language mein string deta hai (i18n support)
  const t: (key: string, vars?: Record<string, string>) => string = useT();

  // STATE: shop ki poori detail store karta hai (ShopDto type ka object ya null jab tak load na ho)
  const [shop, setShop] = useState<ShopDto | null>(null);

  // STATE: agar API call fail ho (shop not found ya network error), toh error message store hota hai
  const [error, setError] = useState<string | null>(null);

  // EFFECT: Component mount hone par ya shopCode/t change hone par chalega
  // Kaam: shopCode ke basis pe backend se shop ki detail fetch karta hai
  // Success pe: shop state mein data set hota hai
  // Failure pe: error state mein "shop not found" message set hota hai
  useEffect((): void => {
    getShop(shopCode)
      .then(setShop)
      .catch((): void => setError(t("shop.notFound")));
  }, [shopCode, t]);

  // --- LOADING / ERROR STATES ---

  // Agar error aaya (shop nahi mila ya API fail hua) toh header ke saath error message dikhao
  if (error) return <><CustomerHeader shopCode={shopCode} /><Centered text={error} /></>;

  // Agar shop data abhi tak nahi aaya (null hai) toh header ke saath loading spinner dikhao
  if (!shop) return <><CustomerHeader shopCode={shopCode} /><Spinner /></>;

  // --- MAIN PAGE RENDER (shop data mil gaya) ---
  return (
    <>
      <CustomerHeader shopCode={shopCode} />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="premium-shell mx-auto max-w-3xl overflow-hidden p-5 sm:p-6">
          <div className="mb-6 rounded-[26px] bg-gradient-to-r from-slate-900 via-indigo-900 to-brand p-5 text-white shadow-xl shadow-indigo-500/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-100">Marketplace</div>
                <h1 className="mt-2 text-3xl font-black">{shop.name}</h1>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-100">
                {shop.open ? "Open" : "Offline"}
              </div>
            </div>

            {(shop.city || shop.pincode) && (
              <p className="mt-3 text-sm text-indigo-100">
                {[shop.city, shop.pincode].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-left">
              <ShopContact phone={shop.phone} address={shop.address} />
            </div>
            <p className="mt-3 text-sm text-slate-500">{t("shop.pickService")}</p>
          </div>

        {/* === OPERATING HOURS BANNER === */}
        {/* Har waqt dikhta hai — green agar shop open hai, amber/red agar closed ya off-hours */}
        {/* IIFE (Immediately Invoked Function Expression) use kiya taaki JSX ke andar
            thoda calculation logic (day number to label conversion) likh sakein */}
        {(() => {
          // DAY_SHORT: day number (1=Mon, 7=Sun) ko short name mein convert karta hai
          // Index 0 khaali hai kyunki days 1-indexed hain (Sunday = 7, Monday = 1)
          const DAY_SHORT: string[] = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

          // shop.operatingDays ek comma-separated string hai (e.g. "1,2,3,4,5")
          // Usse split karke har number ko short day label mein convert karo
          const days: string[] = shop.operatingDays.split(",").map((d: string) => DAY_SHORT[parseInt(d.trim())] ?? d.trim());

          // Agar saatoon din available hain toh "Every Day" dikhao, warna individual days
          const daysLabel: string = days.length === 7 ? t("shop.everyDay") : days.join(", ");

          return (
            // Banner ka background aur border color: amber = closed/off-hours, emerald = open
            <div className={`mb-4 rounded-2xl px-4 py-3 text-center border ${
              (!shop.open || !shop.withinHours)
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-100"
            }`}>
              {/* Warning message: sirf tab dikhao jab shop offline ho ya business hours ke bahar ho */}
              {(!shop.open || !shop.withinHours) && (
                <p className={`font-medium text-sm mb-1 ${!shop.open ? "text-red-600" : "text-amber-700"}`}>
                  {/* shop.open false = shop ne khud ko offline set kiya hai (red) */}
                  {/* withinHours false = abhi business hours mein nahi hain (amber) */}
                  {!shop.open ? t("shop.offlineBanner") : t("order.outsideHours")}
                </p>
              )}
              {/* Operating hours aur days — hamesha dikhao */}
              <p className={`text-xs ${(!shop.open || !shop.withinHours) ? "text-amber-600" : "text-emerald-700"}`}>
                {t("shop.hoursLabel")} {shop.openTime} - {shop.closeTime} · {daysLabel}
              </p>
            </div>
          );
        })()}

        <div className="space-y-3">
          {shop.sections.map((s: SectionDto) => {
            const disabled: boolean = !shop.open || !shop.withinHours || !s.active;

            return (
              <Card
                key={s.code}
                className={`flex items-center justify-between border-l-4 bg-gradient-to-r from-white to-slate-50 ${SECTION_BORDER[s.industryType] ?? SECTION_BORDER.OTHER} ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:-translate-y-0.5"
                }`}
                onClick={disabled ? undefined : () => navigate(`/order/${s.code}?shop=${shop.code}`)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl shadow-inner">
                    {ICON[s.industryType] ?? ICON.OTHER}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900">{s.displayName}</div>
                    <div className="text-xs uppercase tracking-[0.15em] text-slate-400">{s.industryType}</div>
                  </div>
                </div>

                {disabled ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                    {t("section.unavailable")}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-brand">{t("shop.orderArrow")}</span>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to={`/my-orders/${shop.code}`} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-brand transition hover:border-indigo-300 hover:bg-indigo-100">
            {t("shop.myOrdersLink")}
          </Link>

          <button
            onClick={(): void => {
              const url: string = window.location.href;
              if (navigator.share) { navigator.share({ title: shop.name, url }); }
              else { navigator.clipboard?.writeText(url); }
            }}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-brand"
          >
            {t("shop.shareLink")}
          </button>
        </div>
        </div>
      </div>
    </>
  );
}

// --- HELPER COMPONENT ---
// Centered: Ek simple component jo text ko screen ke beech mein dikhata hai
// Use case: Error message ya koi aur plain text centered dikhana ho tab
function Centered({ text }: { text: string }) {
  return <div className="max-w-md mx-auto px-4 py-20 text-center text-gray-500">{text}</div>;
}