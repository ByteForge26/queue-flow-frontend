import { Link } from "react-router-dom";

import { Card } from "../components/ui";
import LanguageToggle from "../components/LanguageToggle";
import { useT } from "../i18n/LanguageContext";

export default function LandingPage(): JSX.Element {
  // useT() ek custom hook hai jo current language ke hisaab se
  // translated strings return karta hai.
  // t("key") call karne par selected language mein text milta hai
  // (e.g. Hindi ya English).
//   const { t } = useT();
  const t = useT();

  return (
    // Outer wrapper div - page ko center mein rakhta hai aur
    // max width 2xl (672px) tak limit karta hai taaki wide screens
    // pe bhi content zyada spread na ho.
    // px aur py se padding set hai.
    <div className="max-w-2xl mx-auto px-4 py-16">

      {/* Language Toggle Section:
          Page ke top-right corner mein language switch button.
          User yahan se app ki language badal sakta hai.
          flex + justify-end se button right side pe push hota hai. */}
      <div className="flex justify-end mb-2">
        <LanguageToggle />
      </div>

      {/* Hero / Title Section:
          App ka naam bade font mein aur uske neeche ek tagline.
          text-brand class brand color use karti hai.
          text-center se dono centered hain. */}
      <div className="text-center mb-10">

        {/* App ka naam - translated string "app.name" se aata hai */}
        <h1 className="text-4xl font-bold text-brand">
          {t("app.name")}
        </h1>

        {/* App ki tagline - chhoti description, gray color mein */}
        <p className="text-gray-500 mt-2">
          {t("landing.tagline")}
        </p>
      </div>

      {/* Navigation Cards Grid Section:
          Do cards ek grid mein - mobile pe ek column, aur
          small+ screens (sm:) pe do columns side-by-side.
          Har card ek alag role (Customer / Shop) ke liye
          entry point hai. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Customer Card:
            Jab user is card pe click karta hai toh /customer route
            pe navigate hota hai. Customer wahan se queue join kar
            sakta hai ya apna token track kar sakta hai.
            hover:shadow-md se card hover pe thoda shadow aata hai
            aur transition-shadow se animation smooth hoti hai. */}
        <Link to="/customer">

          <Card className="flex flex-col items-center text-center gap-3 py-10 cursor-pointer hover:shadow-md transition-shadow">

            {/* Customer role ko represent karne wala emoji icon */}
            <span className="text-5xl">
              👤
            </span>

            {/* Translated label - "Customer" ya equivalent
                selected language mein */}
            <div className="text-xl font-semibold">
              {t("landing.customer")}
            </div>

            {/* Short description - customer ko kya karna hai */}
            <p className="text-sm text-gray-500">
              {t("landing.customerDesc")}
            </p>

          </Card>
        </Link>

        {/* Shop / Staff Card:
            Jab user is card pe click karta hai toh /shop route
            pe navigate hota hai.
            Shop staff wahan se queue manage kar sakti hai —
            tokens serve karna, queue control, etc.
            Same hover + transition styling as Customer card. */}
        <Link to="/shop">

          <Card className="flex flex-col items-center text-center gap-3 py-10 cursor-pointer hover:shadow-md transition-shadow">

            {/* Shop/store role ko represent karne wala emoji icon */}
            <span className="text-5xl">
              🏪
            </span>

            {/* Translated label - "Shop" ya "Dukan"
                selected language mein */}
            <div className="text-xl font-semibold">
              {t("landing.shop")}
            </div>

            {/* Short description - shop staff ko kya karna hai */}
            <p className="text-sm text-gray-500">
              {t("landing.shopDesc")}
            </p>

          </Card>
        </Link>
      </div>

      {/* QR Code Note Section:
          Page ke bilkul neeche ek chhota informational note.
          Ye user ko batata hai ki QR code scan karke bhi
          is app ko directly open kiya ja sakta hai
          (customer flow ke liye).
          text-xs aur text-gray-400 se ye subtle aur secondary lage. */}
      <p className="text-center text-xs text-gray-400 mt-10">
        {t("landing.qrNote")}
      </p>

    </div>
  );
}