// =====================================================================
// FILE: OrderPage.tsx
// =====================================================================
//
// YE FILE KYA KARTI HAI:
//   Customer kisi shop ke section (business) mein order place karta hai
//   is page pe. Custom form fields, catalog items, scheduling (abhi/baad
//   mein) — sab yahan handle hota hai. Order place hone par /track/:id
//   pe redirect ho jaata hai.
// =====================================================================

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate, useParams, useSearchParams, type NavigateFunction } from "react-router-dom";
import CustomerHeader from "../components/CustomerHeader";
import ShopContact from "../components/ShopContact";
import { Card, Button, Spinner } from "../components/ui";
import { useT } from "../i18n/LanguageContext";
import { getFormConfig, createTicket } from "../lib/api";
import { toIsoInstant, weekDayOptions, defaultTime, type DayOption } from "../lib/schedule";
import { inOrderCooldown, deviceOrderLimitReached, markOrderPlaced, pushLocalOrder } from "../lib/auth";
// FIX: ServiceSectionDto import add kiya — pehle missing tha isliye "Cannot find name" error aa raha tha
import type { FormConfigDto, FieldDto, CatalogItemDto, ServiceSectionDto, TicketDto } from "../lib/types";

// Standard template fields — inka label bhasha ke saath toggle hota hai.
// Admin ke apne banaye custom fields ka label jaisa hai waisa rehta hai.
// Ye Set isliye hai taaki O(1) me check ho sake koi field key standard hai ya nahi.
const STANDARD_FIELD_KEYS = new Set(["name", "phone", "table", "reason", "list", "requirement"]);

export default function OrderPage() {
  // URL se sectionCode nikalo — e.g. /order/cafe-main => sectionCode = "cafe-main"
  const { sectionCode = "" } = useParams();

  // Query string se ?shop=ABC123 nikalo — ye shop ka unique code hai
  const [searchParams] = useSearchParams();
  const shopCode: string = searchParams.get("shop") ?? "";

  // Page navigation ke liye — order place hone ke baad /track/:id pe jaana hai
  const navigate: NavigateFunction = useNavigate();

  // Translation function — current language me text return karta hai
  const t: (key: string, vars?: Record<string, string | number>) => string = useT();

  // -----------------------------------------------------------------
  // STATE DECLARATIONS
  // -----------------------------------------------------------------

  // config: Server se aayi form configuration — fields, catalog items, shop info
  // Pehle null hota hai, API call ke baad set hota hai
  const [config, setConfig] = useState<FormConfigDto | null>(null);

  // error: Koi bhi error message store karta hai — API failure ya validation
  const [error, setError] = useState<string | null>(null);

  // fieldValues: Har form field ki current value — key = field.key, value = user input
  // Example: { name: "Rahul", phone: "9876543210", table: "5" }
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // qty: Har catalog item ki selected quantity — key = item.id, value = quantity number
  // Example: { 3: 2, 7: 1 } means item 3 ki qty 2 hai, item 7 ki qty 1
  const [qty, setQty] = useState<Record<number, number>>({});

  // activeSection: customer ne upar jo service section (tab) chuna hai — null = "All" dikhao.
  // Admin ne jo sections banaye hain (e.g. "Pizza", "Burgers") unke hisaab se items filter hote hain.
  const [activeSection, setActiveSection] = useState<number | null>(null);

  // sectionSearch: section tabs lambe ho jaane par naam se dhundne ke liye
  const [sectionSearch, setSectionSearch] = useState("");

  // comment: Customer ka optional note/comment for the order
  const [comment, setComment] = useState<string>("");

  // shopCodeInput: Shop code input field ki value — QR se aaye to pre-fill hoga
  const [shopCodeInput, setShopCodeInput] = useState<string>(shopCode);

  // submitting: True hota hai jab API call chal rahi ho — duplicate submit rokne ke liye
  const [submitting, setSubmitting] = useState<boolean>(false);

  // URL me ?shop= aaye to code pata hai (QR/list se) — field read-only confirm; warna manual entry
  // Agar URL se shop code mila hai to customer manually change nahi kar sakta
  const shopCodeKnown: boolean = shopCode.trim().length > 0;

  // -----------------------------------------------------------------
  // SCHEDULING STATE
  // -----------------------------------------------------------------

  // whenLater: False = "Abhi order karo", True = "Schedule karo future ke liye"
  const [whenLater, setWhenLater] = useState<boolean>(false);

  // dayOptions: Is hafte ke available days ki list — shop ke operating days ke hisab se
  // useMemo isliye use kiya taaki config change hone par hi recalculate ho, har render par nahi
  const dayOptions: DayOption[] = useMemo(
    () => weekDayOptions(new Date(), config?.shopOperatingDays ?? "1,2,3,4,5,6,7"),
    [config?.shopOperatingDays]
  );

  // firstEnabledDay: dayOptions me pehla din jo disabled nahi hai — default selection ke liye
  const firstEnabledDay: string = dayOptions.find((d: DayOption): boolean => !d.disabled)?.value ?? "";

  // day: Schedule ke liye selected day (date string)
  const [day, setDay] = useState(firstEnabledDay);

  // time: Schedule ke liye selected time (HH:MM format) — defaultTime() current time ke paas koi round value return karta hai
  const [time, setTime] = useState(defaultTime());

  // -----------------------------------------------------------------
  // INITIAL DATA FETCH
  // -----------------------------------------------------------------

  // Page load hone par form config fetch karo.
  // sectionCode change hone par bhi re-fetch hoga (e.g. browser back/forward).
  // t dependency isliye hai kyunki error message translation ke liye chahiye.
  useEffect((): void => {
    getFormConfig(sectionCode)
      .then(setConfig)
      .catch((): void => setError(t("order.sectionNotFound")));
  }, [sectionCode, t]);

  // -----------------------------------------------------------------
  // EARLY RETURNS — loading aur error states
  // -----------------------------------------------------------------

  // Agar koi error aaya (e.g. section nahi mila) to error message dikhao
  if (error) return <><CustomerHeader shopCode={shopCode} /><CenteredMessage text={error} /></>;

  // Agar config abhi tak load nahi hui to spinner (loading indicator) dikhao
  if (!config) return <><CustomerHeader shopCode={shopCode} /><Spinner /></>;

  // -----------------------------------------------------------------
  // DERIVED VALUES — state se calculate kiye gaye values
  // -----------------------------------------------------------------

  // Customer ka naam — "name" field ki value
  const customerName: string = fieldValues["name"] ?? "";

  // Customer ka phone number — "phone" field ki value
  const customerPhone: string = fieldValues["phone"] ?? "";

  // selectedItems: Sirf wo items jinki qty > 0 hai — API payload ke liye format me
  const selectedItems: { catalogItemId: number; quantity: number }[] = Object.entries(qty)
    .filter(([, q]: [string, number]): boolean => q > 0)
    .map(([id, q]: [string, number]): { catalogItemId: number; quantity: number } => ({ catalogItemId: Number(id), quantity: q }));

  // Live total — selected items ka price * qty
  // Har item ka price uski quantity se multiply karke sab add karo
  const orderTotal: number = config.items.reduce(
    (sum: number, item: CatalogItemDto): number => sum + (qty[item.id] ?? 0) * item.price,
    0
  );

  // requiredOk: Saare required fields fill hain ya nahi
  // Har required field ki value trim karke check karo kuch hai ya nahi
  const requiredOk: boolean = config.fields
    .filter((f: FieldDto): boolean => f.required)
    .every((f: FieldDto): boolean => (fieldValues[f.key] ?? "").trim().length > 0);

  // itemsOk: Agar catalog items hain to kam se kam ek item select hona chahiye
  // Agar koi catalog items hi nahi hain to ye condition automatically true hai
  const itemsOk: boolean = config.items.length === 0 || selectedItems.length > 0;

  // Indian mobile: 10 digit, 6-9 se shuru (spaces/+91 ignore)
  // +91 prefix ya leading 0 hata do, phir sirf 10 digits validate karo
  const phoneDigits: string = customerPhone.replace(/\D/g, "")
    .replace(/^91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  const phoneOk: boolean = /^[6-9]\d{9}$/.test(phoneDigits);

  // canSubmit: Submit button enable/disable control
  // Sabhi conditions true honi chahiye — required fields, items, valid phone, shop code, aur submitting nahi ho raha
  const canSubmit: boolean = requiredOk && itemsOk && phoneOk && shopCodeInput.trim().length > 0 && !submitting;

  // -----------------------------------------------------------------
  // SUBMIT FUNCTION — order place karne ka main logic
  // -----------------------------------------------------------------

  // submit(): User jab "Place Order" button dabata hai tab ye function chalti hai.
  // Ye API ko ticket create karne ka request bhejti hai aur success par /track page pe redirect karti hai.
  async function submit(): Promise<void> {
    // Device anti-spam — cooldown + window limit
    // Agar user ne recently order diya hai (cooldown period) to rok do
    if (inOrderCooldown()) {
      setError(t("order.cooldown"));
      return;
    }
    // Agar is device se aaj bahut zyada orders ho gaye hain to rok do
    if (deviceOrderLimitReached()) {
      setError(t("order.deviceLimit"));
      return;
    }

    // Submitting flag set karo taaki duplicate clicks se bachein
    setSubmitting(true);
    try {
      // Agar "Later" selected hai aur din+time dono hain to ISO format me convert karo, warna null
      const scheduledFor: string | null = whenLater && day && time ? toIsoInstant(day, time) : null;

      // API call — naya ticket create karo server pe
      const ticket: TicketDto = await createTicket(sectionCode, {
        customerName,
        customerPhone,
        fieldValues,
        items: selectedItems,
        scheduledFor,
        comment: comment.trim() || null, // Empty string ko null bhejo
        shopCode: shopCodeInput.trim(),
      });

      // Order place hone ka timestamp mark karo (cooldown start ke liye)
      markOrderPlaced();

      // device history ke liye order save karo (taaki bina phone ke bhi dikhe)
      // LocalStorage me order save karo taaki /orders page pe dikhaye bina login ke
      if (shopCode && config) {
        pushLocalOrder({
          ticketId: ticket.id,
          trackingToken: ticket.trackingToken,
          shopCode,
          sectionCode,
          sectionName: config.businessName,
          placedTime: ticket.placedTime,
        });
      }

      // Success! Ticket tracking page pe redirect karo
      navigate(`/track/${ticket.trackingToken}`);
    } catch (e: unknown) {
      // Server se aaye HTTP status code aur error message nikalo
      const status: number | undefined = (e as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response?.status;
      const serverMsg: string | undefined = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message
        || (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error;

      // 409 Conflict errors — har error ka specific message dikhao
      if (status === 409 && serverMsg?.includes("DAILY_LIMIT_REACHED")) setError(t("order.shopDailyLimit"));
      else if (status === 409 && serverMsg?.includes("PHONE_DAILY_LIMIT")) setError(t("order.phoneDailyLimit"));
      else if (status === 409 && serverMsg?.includes("OUTSIDE_OPERATING_HOURS")) setError(t("order.outsideHours"));
      else if (status === 409 && serverMsg?.includes("Alag-alag numbers se bahut orders")) setError(t("order.tooManyPhoneNumbers"));
      else if (status === 409 && serverMsg?.includes("Bahut saare orders ho gaye")) setError(t("order.tooManyRecentOrders"));
      else if (status === 409) setError(t("order.duplicate")); // Koi aur 409 error — duplicate order
      else if (status === 401) setError(t("order.shopCodeWrong")); // Galat shop code
      else setError(t("order.failed")); // Koi bhi aur error — generic failure message

      // Submit fail hua to button dobara enable karo
      setSubmitting(false);
    }
  }

  // -----------------------------------------------------------------
  // JSX / UI RENDER
  // -----------------------------------------------------------------

  return (
    <>
      {/* Top navigation header — back button aur branding */}
      <CustomerHeader shopCode={shopCode} />

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ------------------------------------------------------------------ */}
        {/* SHOP INFO SECTION — Shop ka naam, city, aur contact details dikhata hai */}
        {/* ------------------------------------------------------------------ */}
        <div className="mb-6 rounded-[28px] bg-gradient-to-r from-brand via-indigo-600 to-violet-600 p-5 text-white shadow-[0_18px_45px_rgba(79,70,229,0.24)]">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-100">{config.industryType}</div>
          <h1 className="mt-2 text-3xl font-bold">{config.businessName}</h1>
          {/* Agar shopName alag hai (parent shop) to woh aur city dikhao */}
          {config.shopName && (
            <p className="text-sm text-white/90">
              {config.shopName}{config.shopCity ? ` · ${config.shopCity}` : ""}
            </p>
          )}
          {/* Shop ka phone aur address — ShopContact component handle karta hai */}
          <ShopContact phone={config.shopPhone} address={config.shopAddress} tone="inverse" />
          {/* Customer ko instruction — form fill karne ke liye */}
          <p className="mt-3 text-sm font-medium text-white/95">{t("order.fillRequirement")}</p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* CUSTOMER DETAILS CARD — Name, phone, aur custom fields ka form */}
        {/* Amber top border se ye card visually distinct hai */}
        {/* ------------------------------------------------------------------ */}
        <Card className="mb-4 border-t-4 border-t-amber-400">
          <h2 className="font-semibold mb-3">{t("order.yourDetails")}</h2>
          <div className="space-y-3">
            {/* Config me defined har field ke liye ek input render karo */}
            {config.fields.map((f: FieldDto) => (
              <div key={f.key}>
                <label className="block text-sm text-gray-600 mb-1">
                  {/* Standard field hai to translate karo, custom field ka label as-is dikhao */}
                  {STANDARD_FIELD_KEYS.has(f.key) ? t(`field.${f.key}`) : f.label}
                  {/* Required fields pe red star dikhao */}
                  {f.required && <span className="text-red-500"> *</span>}
                </label>

                {/* Field type ke hisab se input render karo */}
                {f.type === "MULTILINE" ? (
                  // Multi-line text ke liye textarea
                  <textarea
                    rows={3}
                    value={fieldValues[f.key] ?? ""}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>): void =>
                      setFieldValues((v: Record<string, string>): Record<string, string> => ({ ...v, [f.key]: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                ) : (
                  // Single line ke liye input — type PHONE/NUMBER/TEXT ke hisab se HTML type set karo
                  <input
                    type={f.type === "PHONE" ? "tel" : f.type === "NUMBER" ? "number" : "text"}
                    value={fieldValues[f.key] ?? ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                      setFieldValues((v: Record<string, string>): Record<string, string> => ({ ...v, [f.key]: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                )}

                {/* Phone field ke liye inline validation — kuch type kiya ho aur galat ho tab dikhao */}
                {f.key === "phone" && (fieldValues[f.key] ?? "").length > 0 && !phoneOk && (
                  <p className="text-xs text-red-500 mt-1">{t("order.phoneError")}</p>
                )}
              </div>
            ))}

            {/* Shop code confirm — QR/list se aaye to prefill+readonly, warna manual */}
            {/* Ye security ke liye hai — customer confirm karta hai ki sahi shop pe order ja raha hai */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("order.shopCode")} <span className="text-red-500">*</span>
              </label>
              <input
                value={shopCodeInput}
                readOnly={shopCodeKnown} /* QR se aaye to readonly — tamper proof */
                placeholder={t("order.shopCode")}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setShopCodeInput(e.target.value)}
                className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40
                  ${shopCodeKnown ? "bg-gray-50 text-gray-500" : ""}`}
              />
              {/* Agar manually enter karna hai to hint dikhao */}
              {!shopCodeKnown && (
                <p className="text-xs text-gray-400 mt-1">{t("order.shopCodeHint")}</p>
              )}
            </div>
          </div>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* CATALOG ITEMS CARD — Sirf tab dikhao jab items hain */}
        {/* Agar admin ne service sections banaye hain (e.g. "Pizza", "Burgers") */}
        {/* to unke scrollable tabs dikhte hain; warna purani category grouping */}
        {/* Orange top border se ye section visually alag hai */}
        {/* ------------------------------------------------------------------ */}
        {config.items.length > 0 && (
          <Card className="mb-4 border-t-4 border-t-orange-400">
            <h2 className="font-semibold mb-3">{t("order.chooseItems")}</h2>

            {/* --- Section Tabs (sirf tab dikhao jab admin ne sections banaye hain) --- */}
            {config.sections.length > 0 && (
              <>
                {/* Search — jab bahut saare sections hon to naam se dhundo */}
                {config.sections.length > 6 && (
                  <input
                    type="text"
                    placeholder="🔍 Search sections..."
                    value={sectionSearch}
                    onChange={(e: ChangeEvent<HTMLInputElement>): void => setSectionSearch(e.target.value)}
                    className="w-full mb-2 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                )}

                {/* Horizontally scrollable pills — jitne bhi sections hon, page neeche nahi badhta,
                    isi row ke andar left-right scroll hota hai (mobile-friendly) */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1 scrollbar-thin">
                  {/* "All" pill — filter hatao, sab sections dikhao */}
                  <button
                    onClick={(): void => setActiveSection(null)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-all ${
                      activeSection === null
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    All
                  </button>
                  {/* Har section ke liye ek pill — search text se filter hoti hain.
                      FIX: pehle yahan ': Element' return type tha (browser DOM type) jo galat tha,
                      isliye hata diya; TypeScript khud JSX.Element infer kar leta hai. */}
                  {config.sections
                    .filter((s: ServiceSectionDto): boolean =>
                      s.name.toLowerCase().includes(sectionSearch.trim().toLowerCase()))
                    .map((s: ServiceSectionDto) => (
                      <button
                        key={s.id}
                        onClick={(): void => setActiveSection(s.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-all ${
                          activeSection === s.id
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        📝 {s.name}
                      </button>
                    ))}
                </div>
              </>
            )}

            {/* --- Items List — fixed max height + scroll, taaki bahut items hone par
                page khud lamba hone ke bajaye isi box ke andar scroll ho --- */}
            <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
              {(() => {
                // Helper: ek item ki quantity update karo (ItemRow ka onChange isi ko call karta hai)
                const setItemQty = (id: number, q: number): void =>
                  setQty((prev: Record<number, number>) => ({ ...prev, [id]: q }));

                // Agar admin ne koi service section banaya hi nahi hai, to purani
                // category-based grouping use karo — backward compatible rehta hai.
                if (config.sections.length === 0) {
                  const groups: Record<string, CatalogItemDto[]> = {};
                  config.items.forEach((item: CatalogItemDto): void => {
                    const key: string = item.category ?? "";
                    (groups[key] = groups[key] ?? []).push(item);
                  });
                  return Object.entries(groups).map(([cat, groupItems]: [string, CatalogItemDto[]]) => (
                    <div key={cat} className="mb-3 last:mb-0">
                      {/* Category ka naam — khali ho to heading nahi dikhegi */}
                      {cat && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{cat}</p>}
                      <div className="space-y-2">
                        {groupItems.map((item: CatalogItemDto) => (
                          <ItemRow key={item.id} item={item} qty={qty[item.id] ?? 0}
                            onChange={(q: number): void => setItemQty(item.id, q)} />
                        ))}
                      </div>
                    </div>
                  ));
                }

                // Sections ke hisaab se items dikhao. "All" selected ho to sab sections
                // apne headings ke saath dikhte hain; ek section select karne par sirf wahi.
                const itemsToShow: CatalogItemDto[] = activeSection === null
                  ? config.items
                  : config.items.filter((it: CatalogItemDto): boolean => it.serviceSectionId === activeSection);

                // Items ko unke section ke naam ke hisaab se group karo.
                // Jis item ka section nahi mila (ya null hai) wo Uncategorized mein jaata hai.
                const bySection: Record<string, CatalogItemDto[]> = {};
                itemsToShow.forEach((item: CatalogItemDto): void => {
                  const sec: ServiceSectionDto | undefined =
                    config.sections.find((s: ServiceSectionDto): boolean => s.id === item.serviceSectionId);
                  const key: string = sec ? sec.name : "Uncategorized";
                  (bySection[key] = bySection[key] ?? []).push(item);
                });

                // Chuna hua section khali hai to message dikhao
                if (Object.keys(bySection).length === 0) {
                  return <p className="text-sm text-gray-400 text-center py-4">Is section mein koi item nahi hai</p>;
                }

                return Object.entries(bySection).map(([name, groupItems]: [string, CatalogItemDto[]]) => (
                  <div key={name} className="mb-3 last:mb-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{name}</p>
                    <div className="space-y-2">
                      {groupItems.map((item: CatalogItemDto) => (
                        <ItemRow key={item.id} item={item} qty={qty[item.id] ?? 0}
                          onChange={(q: number): void => setItemQty(item.id, q)} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* COMMENT BOX — Optional note/special instruction from customer */}
        {/* ------------------------------------------------------------------ */}
        {/* Comment (optional) */}
        <Card className="mb-4 border-t-4 border-t-gray-300">
          <h2 className="font-semibold mb-2">{t("order.commentTitle")}</h2>
          <textarea
            rows={2}
            value={comment}
            placeholder={t("order.commentPlaceholder")}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setComment(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5
              focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* SCHEDULING CARD — "Abhi" ya "Baad mein" order karna */}
        {/* Sky/blue top border se scheduling section alag dikhe */}
        {/* ------------------------------------------------------------------ */}
        {/* Kab? Abhi ya baad mein (is week tak) */}
        <Card className="mb-4 border-t-4 border-t-sky-400">
          <h2 className="font-semibold mb-3">{t("order.whenTitle")}</h2>

          {/* Toggle buttons — "Now" / "Later" pill-style selector */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-3">
            {/* "Abhi" button — active hone par white background aata hai */}
            <button
              onClick={(): void => setWhenLater(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                !whenLater ? "bg-white shadow-sm text-brand" : "text-gray-500"
              }`}
            >
              {t("order.now")}
            </button>
            {/* "Baad mein" button — active hone par white background */}
            <button
              onClick={(): void => setWhenLater(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                whenLater ? "bg-white shadow-sm text-brand" : "text-gray-500"
              }`}
            >
              {t("order.later")}
            </button>
          </div>

          {/* Agar "Later" selected hai to day aur time picker dikhao */}
          {whenLater && (
            <div className="grid grid-cols-2 gap-3">
              {/* Day dropdown — shop ke operating days ke hisab se options */}
              <select
                value={day}
                onChange={(e: ChangeEvent<HTMLSelectElement>): void => setDay(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                {dayOptions.map((d: DayOption) => (
                  // disabled days — shop us din band hai
                  <option key={d.value} value={d.value} disabled={d.disabled}>
                    {d.label}
                  </option>
                ))}
              </select>

              {/* Time picker — customer jab chahta hai schedule kare */}
              <input
                type="time"
                value={time}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setTime(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
          )}

          {/* Schedule ke notes — sirf "Later" tab dikhao */}
          {whenLater && (
            <>
              {/* Is hafte tak hi schedule kar sakte ho */}
              <p className="text-xs text-gray-400 mt-2">{t("order.weekNote")}</p>
              {/* Shop ke opening/closing time ka hint — bahar schedule kiya to reject ho sakta hai */}
              <p className="text-xs text-amber-600 mt-1">
                {t("order.scheduleHoursHint", { open: config.shopOpenTime, close: config.shopCloseTime })}
              </p>
            </>
          )}
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* ORDER TOTAL — Sirf tab dikhao jab catalog items hain */}
        {/* ------------------------------------------------------------------ */}
        {config.items.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-semibold">{t("common.total")}</span>
            {/* Total amount bold aur brand color me dikhao */}
            <span className="text-xl font-bold text-brand">₹{orderTotal}</span>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUBMIT BUTTON — Order place ya schedule karne ka main action button */}
        {/* canSubmit false ho to button disabled (gray) rahega */}
        {/* ------------------------------------------------------------------ */}
        <Button onClick={submit} disabled={!canSubmit} className="w-full">
          {/* Submitting ho to "Placing..." dikhao, warna "Place Order · ₹total" */}
          {submitting
            ? t("order.placing")
            : `${whenLater ? t("order.scheduleBtn") : t("order.placeBtn")}${orderTotal > 0 ? ` · ₹${orderTotal}` : ""}`}
        </Button>

        {/* Required fields nahi bhare to hint dikhao submit button ke neeche */}
        {!requiredOk && (
          <p className="text-xs text-gray-400 mt-2 text-center">{t("order.requiredHint")}</p>
        )}
      </div>
    </>
  );
}

// =====================================================================
// ItemRow — Ek single catalog item ka row component
// ---------------------------------------------------------------------
// Kya karta hai: Item ka naam, price, avg time dikhata hai aur
//                +/- buttons se quantity change karne deta hai.
// Props:
//   - item:     CatalogItemDto — item ki details (naam, price, time, description)
//   - qty:      number — is item ki current selected quantity
//   - onChange: function — jab quantity change ho tab parent ko notify karo
// =====================================================================
function ItemRow({
  item,
  qty,
  onChange,
}: {
  item: CatalogItemDto;
  qty: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_14px_30px_rgba(79,70,229,0.08)]">
      {/* Item ki left side info — naam, price, avg time, description */}
      <div className="min-w-0 pr-3">
        <div className="font-semibold text-gray-800 leading-tight">{item.name}</div>
        {/* Price aur estimated time — price 0 ho to dash dikhao */}
        <div className="text-xs text-gray-500 mt-1">
          {item.price > 0 ? `₹${item.price}` : "-"} · ~{item.avgMinutes} min
        </div>
        {/* Optional description — sirf tab dikhao jab ho */}
        {item.description && (
          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</div>
        )}
      </div>

      {/* Quantity controls — Minus button, current count, Plus button */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Minus button — 0 se neeche nahi jaayega (Math.max se ensure) */}
        <button
          className="h-8 w-8 rounded-full bg-gray-100 text-lg leading-none text-gray-700 shadow-inner transition hover:bg-gray-200"
          onClick={(): void => onChange(Math.max(0, qty - 1))}
        >
          -
        </button>
        {/* Current quantity display */}
        <span className="w-6 text-center text-sm font-semibold text-gray-700">{qty}</span>
        {/* Plus button — brand color me (usually orange/primary color) */}
        <button
          className="h-8 w-8 rounded-full bg-brand text-white text-lg leading-none shadow-sm transition hover:bg-brand-dark"
          onClick={(): void => onChange(qty + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// CenteredMessage — Simple centered text message component
// ---------------------------------------------------------------------
// Kya karta hai: Page ke center me ek plain text message dikhata hai.
// Use case:      Error states — jab section nahi mila ya koi aur problem ho.
// Props:
//   - text: string — dikhane wala message
// =====================================================================
function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center text-gray-500">{text}</div>
  );
}