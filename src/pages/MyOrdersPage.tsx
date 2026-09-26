// ============================================================
// ⚠️ NOTE: Lines 1-48 (top header comment block) screenshot mein
// FOLDED/collapsed the, isliye unka actual content yahan nahi hai.
// Neeche sirf ek generic placeholder header laga diya hai.
// ============================================================

// ⚠️ NOTE: Imports (lines 49-57) bhi collapsed the ("import ...").
// Neeche diye gaye imports sirf CODE USAGE se INFER kiye gaye hain —
// apne actual project ke sahi import paths se inhe replace/verify karo.
import { useState, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useT } from "../i18n/LanguageContext"; // ya jo bhi aapka actual path ho
import { Card, Button, StatusBadge } from "../components/ui";
import CustomerHeader from "../components/CustomerHeader";
import { getShop, getLocalOrders, getCustomerHistory } from "../lib/api"; // adjust path
import type {
  ShopDto,
  LocalOrder,
  HistoryDto,
  TicketDto,
  TicketItemDto,
} from "../lib/types"; // adjust path

export default function MyOrdersPage(): Element {
  // URL se shopCode nikaalte hain – e.g. /q/SHOP123/my-orders → "SHOP123"
  // Default empty string hai taaki TypeScript error na aaye jab param missing ho
  const { shopCode = "" } = useParams();

  // t() function – i18n translations ke liye, text hardcode nahi karte
  const t: (key: string, vars?: Record<string, string>) => string = useT();

  // shop ki details (naam, etc.) store karta hai; initially null hai (fetch nahi hua)
  const [shop, setShop] = useState<ShopDto | null>(null);

  // Is device (browser localStorage) pe saved local orders ki list
  // Ye woh orders hain jo is browser se place kiye gaye the
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);

  // Phone number input field ki value – phone-based history search ke liye
  const [phone, setPhone] = useState("");

  // Customer ka naam input field ki value – phone ke saath identity verify karne ke liye
  const [name, setName] = useState("");

  // Server se aayi customer history (orders list + today/month stats)
  // null matlab abhi search nahi hua ya results nahi aaye
  const [history, setHistory] = useState<HistoryDto | null>(null);

  // API call chal rahi hai ya nahi – button disable karne aur "..." dikhane ke liye
  const [loading, setLoading] = useState(false);

  // Kya user ne kabhi search button dabaya hai – taaki "no results" message
  // sirf tab dikhe jab actually search ho chuka ho, page load pe nahi
  const [searched, setSearched] = useState(false);

  // Page load hone par (ya shopCode change hone par) ye effect chalta hai:
  //   1. Server se shop details fetch karta hai (naam dikhane ke liye)
  //   2. Browser localStorage se is shop ke liye saved local orders load karta hai
  // shopCode dependency mein hai kyunki agar URL change ho to fresh data chahiye
  useEffect((): void => {
    getShop(shopCode).then(setShop).catch((): undefined => undefined);
    setLocalOrders(getLocalOrders(shopCode));
  }, [shopCode]);

  // lookup() – phone + naam se customer ki order history server se fetch karta hai
  // Ye function Search button click aur Enter key dono pe call hota hai
  async function lookup(): Promise<void> {
    // Agar phone ya naam empty hai to kuch mat karo – basic validation
    if (!phone.trim() || !name.trim()) return;

    setLoading(true); // button disable karo, spinner/text dikhao
    setSearched(true); // ab "no results" message dikhana valid hai

    try {
      // API call: shopCode + phone + naam bhejta hai, server history return karta hai
      // History mein orders array aur today/month counts hote hain
      const h: HistoryDto = await getCustomerHistory(shopCode, phone.trim(), name.trim());
      setHistory(h);
    } finally {
      // Chahe API succeed kare ya fail – loading hamesha band karo
      // (agar error aaya to history null rahegi)
      setLoading(false);
    }
  }

  return (
    <>
      {/* Top navigation bar – shop branding aur back/home links */}
      <CustomerHeader shopCode={shopCode} />

      <div className="max-w-md mx-auto px-4 py-6">

        {/* ---- Page heading section ---- */}
        {/* Title aur shop ka naam center mein dikhata hai */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold">{t("myorders.title")}</h1>
          {/* Shop ka naam sirf tab dikhao jab data aa jaaye (null check) */}
          {shop && <p className="text-gray-500 text-sm">{shop.name}</p>}
        </div>

        {/* ---- Section 1: Is device pe saved orders ---- */}
        {/* Ye orders browser localStorage se aati hain – koi server call nahi */}
        {/* Fayda: customer bina phone number ke apni recent orders dekh sakta hai */}
        <h2 className="font-semibold mb-2">{t("myorders.onDevice")}</h2>
        {localOrders.length === 0 ? (
          // Agar koi local order nahi hai to empty state message dikhao
          <Card className="text-center text-gray-400 py-6 mb-6">
            {t("myorders.noDevice")}
          </Card>
        ) : (
          // Scrollable list of local orders – max height fix hai taaki page overflow na ho
          <div className="space-y-2 mb-6 overflow-y-auto pr-1 max-h-[40vh]">
            {localOrders.map((o: LocalOrder): Element => (
              // Har order card ek link hai – click karne par live tracking page pe jaata hai
              <Link key={o.ticketId} to={`/track/${o.ticketId}`}>
                <Card className="flex items-center justify-between py-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div>
                    {/* Ticket number bold dikhao – primary identifier */}
                    <div className="font-semibold">#{o.ticketId}</div>
                    {/* Section/counter naam – jaise "Counter A" ya "Dine-In" */}
                    <div className="text-xs text-gray-400">{o.sectionName}</div>
                  </div>
                  {/* Order place karne ka time – right side mein small text */}
                  {/* Nullish coalescing: agar placedTime nahi hai to empty string */}
                  <div className="text-xs text-gray-400">{o.placedTime ?? ""}</div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* ---- Section 2: Phone number se history search ---- */}
        {/* Customer kisi bhi device se apni history dekh sakta hai phone+naam se */}
        <h2 className="font-semibold mb-2">{t("myorders.byPhone")}</h2>
        <Card className="mb-4">
          <div className="space-y-2">
            {/* Phone number input – type="tel" mobile keyboard trigger karta hai */}
            <input
              type="tel"
              value={phone}
              placeholder={t("myorders.mobile")}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {/* Naam input – Enter key press pe bhi search trigger hota hai */}
            <input
              type="text"
              value={name}
              placeholder={t("myorders.name")}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
              // Enter key press hone par lookup() call karo – UX convenience
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>): false | Promise<void> =>
                e.key === "Enter" && lookup()
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {/* Search button – disabled jab:
                - phone ya naam empty ho (invalid input)
                - ya API call already chal rahi ho (duplicate request prevent) */}
            <Button onClick={lookup} disabled={!phone.trim() || !name.trim() || loading} className="w-full">
              {/* Loading ke time "..." dikhao, warna normal search text */}
              {loading ? "..." : t("myorders.search")}
            </Button>
            {/* Helper note – user ko batata hai ki naam aur phone dono kyun chahiye */}
            <p className="text-xs text-gray-400">{t("myorders.namePhoneNote")}</p>
          </div>
        </Card>

        {/* ---- Section 3: Search results (sirf tab dikhao jab history aa jaaye) ---- */}
        {/* history null hai jab tak search nahi hua – conditional render */}
        {history && (
          <>
            {/* Stats row – aaj aur is mahine kitne orders kiye – 2 column grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Stat label={t("myorders.today")} value={history.today} />
              <Stat label={t("myorders.month")} value={history.month} />
            </div>

            {history.orders.length === 0 ? (
              // Agar orders array empty hai AND search ho chuka hai to "no results" dikhao
              // searched flag isliye hai taaki yeh message page load pe na dikhe
              searched && (
                <Card className="text-center text-gray-400 py-6">
                  {t("myorders.noneForPhone")}
                </Card>
              )
            ) : (
              // Orders ki scrollable list – max height fix hai taaki page ka layout na tute
              <div className="space-y-2 overflow-y-auto pr-1 max-h-[45vh]">
                {/* NOTE: yahan loop variable ka naam 't' hai jo upar wale useT() 't' ko
                    shadow kar raha hai – ye naam clash hai, lekin sirf is scope mein;
                    loop ke andar t() translation function kaam nahi karega */}
                {history.orders.map((t: TicketDto): Element => (
                  // Har order card link hai – click karo to live tracking page
                  <Link key={t.id} to={`/track/${t.id}`}>
                    <Card className="flex items-center justify-between py-3 cursor-pointer hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center gap-2">
                          {/* Ticket number aur status badge side by side */}
                          <span className="font-semibold">#{t.id}</span>
                          {/* StatusBadge color-coded status dikhata hai: Pending, Ready, etc. */}
                          <StatusBadge status={t.status} />
                        </div>
                        {/* Order items summary: "Chai x2, Samosa x1" format mein */}
                        {/* Agar items array empty ho to "–" fallback dikhao */}
                        <div className="text-xs text-gray-400 mt-1">
                          {t.items.map((i: TicketItemDto): string => `${i.itemName} x${i.quantity}`).join(", ") || "–"}
                        </div>
                      </div>
                      {/* Order place karne ka time – right side mein */}
                      <div className="text-xs text-gray-400">{t.placedTime}</div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---- Footer: Naya order dene ka link ---- */}
        {/* Customer ko wapas ordering page pe le jaata hai */}
        <div className="mt-6 text-center">
          <Link to={`/q/${shopCode}`} className="text-sm text-brand hover:underline">
            {t("myorders.newOrder")}
          </Link>
        </div>

      </div>
    </>
  );
}

// ---- Stat component (local, sirf is file mein use hota hai) ----
// Ek simple stat tile dikhata hai: upar bada number, neeche label
// Props:
//   label – descriptive text (e.g. "Today", "This Month")
//   value – number jo dikhana hai (e.g. 3, 12)
function Stat({ label, value }: { label: string; value: number }): Element {
  return (
    <Card className="text-center py-3">
      {/* Bada colored number – brand color mein highlight kiya */}
      <div className="text-2xl font-bold text-brand">{value}</div>
      {/* Chhota label text neeche */}
      <div className="text-xs text-gray-400">{label}</div>
    </Card>
  );
}