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

export default function ShopLandingPage(): Element {
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
      {/* Page ke upar customer-facing header — back button, branding, etc. */}
      <CustomerHeader shopCode={shopCode} />

      <div className="max-w-md mx-auto px-4 py-6">
        {/* === SHOP INFO SECTION === */}
        {/* Shop ka naam, location, contact info aur "pick a service" prompt dikhata hai */}
        <div className="mb-5 text-center">
          {/* Shop ka naam — bold aur bada dikhao */}
          <h1 className="text-2xl font-bold">{shop.name}</h1>

          {/* City aur pincode — dono mein se jo bhi available ho woh dikhao, dot se separate karke */}
          {(shop.city || shop.pincode) && (
            <p className="text-gray-500 text-sm">
              {[shop.city, shop.pincode].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Phone number aur address — ShopContact component handle karta hai */}
          <div className="inline-block text-left">
            <ShopContact phone={shop.phone} address={shop.address} />
          </div>

          {/* Customer ko prompt karo ki koi service choose kare */}
          <p className="text-gray-500 text-sm mt-2">{t("shop.pickService")}</p>
        </div>

        {/* === OPERATING HOURS BANNER === */}
        {/* Har waqt dikhta hai — green agar shop open hai, amber/red agar closed ya off-hours */}
        {/* IIFE (Immediately Invoked Function Expression) use kiya taaki JSX ke andar
            thoda calculation logic (day number to label conversion) likh sakein */}
        {(() : Element => {
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

        {/* === SECTIONS LIST === */}
        {/* Shop ke saare service sections (e.g. Haircut, Dine-In, OPD) cards ke roop mein */}
        <div className="space-y-3">
          {shop.sections.map((s: SectionDto): Element => {
            // Section disabled hoga agar:
            // 1. Shop offline hai (!shop.open), ya
            // 2. Abhi business hours ke bahar hai (!shop.withinHours), ya
            // 3. Ye specific section inactive hai (!s.active)
            const disabled: boolean = !shop.open || !shop.withinHours || !s.active;

            return (
              // Har section ke liye ek Card — industry type ke hisaab se colored left border
              <Card
                key={s.code}
                className={`flex items-center justify-between transition-shadow ${SECTION_BORDER[s.industryType] ?? SECTION_BORDER.OTHER} ${
                  disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-md"
                }`}
                // Disabled section pe click block karo (undefined pass karne se onClick nahi chalega)
                // Enabled section pe: order page pe navigate karo, shop code bhi query param mein bhejo
                onClick={disabled ? undefined : (): void => navigate(`/order/${s.code}?shop=${shop.code}`)}
              >
                {/* LEFT SIDE: Section icon + naam + industry type */}
                <div className="flex items-center gap-3">
                  {/* Industry type ke hisaab se emoji icon — fallback: "OTHER" ka icon */}
                  <span className="text-2xl">{ICON[s.industryType] ?? ICON.OTHER}</span>
                  <div>
                    {/* Section ka display naam (e.g. "Haircut & Styling") */}
                    <div className="font-semibold">{s.displayName}</div>
                    {/* Industry type label (e.g. "SALON") — chhota gray text */}
                    <div className="text-xs text-gray-400">{s.industryType}</div>
                  </div>
                </div>

                {/* RIGHT SIDE: Disabled badge ya "Order ->" arrow */}
                {disabled
                  // Section unavailable hai toh gray badge dikhao
                  ? <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{t("section.unavailable")}</span>
                  // Available hai toh amber arrow dikhao — customer ko click karne ke liye encourage karo
                  : <span className="text-amber-600 text-sm font-semibold">{t("shop.orderArrow")}</span>
                }
              </Card>
            );
          })}
        </div>

        {/* === FOOTER ACTIONS === */}
        {/* My Orders link aur Share button — page ke sabse neeche */}
        <div className="mt-6 flex items-center justify-center gap-4">
          {/* "My Orders" — customer apne is shop ke saare orders dekh sakta hai */}
          <Link to={`/my-orders/${shop.code}`} className="text-sm text-brand hover:underline">
            {t("shop.myOrdersLink")}
          </Link>

          {/* Share button — shop ka current URL share karo */}
          <button
            onClick={(): void => {
              const url: string = window.location.href;
              // Agar browser Web Share API support karta hai (mobile pe mostly available hota hai)
              // toh native share sheet kholo; warna clipboard mein URL copy karo
              if (navigator.share) { navigator.share({ title: shop.name, url }); }
              else { navigator.clipboard?.writeText(url); }
            }}
            className="text-sm text-gray-500 hover:text-brand"
          >
            {t("shop.shareLink")}
          </button>
        </div>
      </div>
    </>
  );
}

// --- HELPER COMPONENT ---
// Centered: Ek simple component jo text ko screen ke beech mein dikhata hai
// Use case: Error message ya koi aur plain text centered dikhana ho tab
function Centered({ text }: { text: string }): Element {
  return <div className="max-w-md mx-auto px-4 py-20 text-center text-gray-500">{text}</div>;
}