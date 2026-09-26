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
  // `t` ek function hai jo translation key leke current language mein string return karta hai.
  // Jaise: t("app.name") => "QueueFlow" ya Hindi mein kuch aur, user ki selected language ke hisaab se.
  const t = useT();

  return (
    // sticky top-0: scroll karne par bhi header screen ke top par chipka rehta hai
    // z-40: yeh header doosre elements ke upar render hoga (z-index = 40, higher = upar)
    // bg-white/90: 90% opacity wali white background — thodi transparent dikhti hai
    // backdrop-blur: peeche ke content ko blur karta hai (glass effect)
    // border-b border-gray-100: neeche ek halki gray line/border dikhti hai
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
      {/* max-w-md: content ki maximum width medium size tak limit hai (mobile-friendly layout)
          mx-auto: horizontally center karta hai
          px-4 py-2.5: left-right aur upar-neeche padding (space)
          flex items-center justify-between: left aur right content ko alag-alag ends par rakhta hai */}
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* App ka naam — home page "/" par le jaata hai.
            font-bold text-amber-600: bold text, amber/orange color mein brand identity ke liye */}
        <Link to="/" className="font-bold text-amber-600">
          {/* t("app.name") => app ka naam current language mein dikhata hai */}
          {t("app.name")}
        </Link>

        {/* Right side ke navigation links aur language toggle ka group */}
        {/* gap-3: links ke beech thoda space, text-sm: thoda chhota font size */}
        <div className="flex items-center gap-3 text-sm">
          {/* "Change Location" link — customer ko /customer page par le jaata hai
              jahan woh apna shop/region dobara select kar sake.
              hover:text-amber-600: mouse hover karne par color amber ho jaata hai */}
          <Link to="/customer" className="text-gray-600 hover:text-amber-600">
            {t("header.changeLocation")}
          </Link>

          {/* "My Orders" link — agar shopCode available hai toh us specific shop ke
              orders page par le jaata hai, warna generic /customer page par.
              Yeh conditional (ternary) logic hai:
                shopCode ? `/my-orders/${shopCode}` : "/customer"
              Matlab: agar shopCode truthy (defined) hai toh shop-specific orders,
              warna customer landing page. */}
          <Link
            to={shopCode ? `/my-orders/${shopCode}` : "/customer"}
            className="text-gray-600 hover:text-amber-600"
          >
            {t("header.myOrders")}
          </Link>

          {/* LanguageToggle component — user ko language switch karne ka UI deta hai.
              Ye apna state khud manage karta hai, CustomerHeader ko kuch pass nahi karna. */}
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}