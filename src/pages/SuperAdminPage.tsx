// =====================================================================
// SuperAdminPage.tsx
// =====================================================================
import { useState, useEffect } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement as Element } from "react";
import {
  superAdminLogin,
  superAdminListShops,
  getPlatformConfig,
  superAdminGetAuditLog,
  superAdminGetLockedIps,
  superAdminGetServiceBans,
  superAdminBanService,
  superAdminUnbanService,
  superAdminClearIpLock,
  superAdminSetCustomFieldsEnabled,
  superAdminSetShowPlanInfoIcon,
  superAdminSetShowPlanBadge,
  superAdminSetPaidPrice,
  superAdminSetPaymentQrEnabled,
  superAdminSetUpgradeContact,
  superAdminBulkSetPlan,
  superAdminSetPlan,
  superAdminFetchQr,
  superAdminResetPassword,
  superAdminGetServiceAccessRequests,
  superAdminResolveServiceAccessRequest,
} from "../lib/api";
import type { SuperAdminShopDto, AuditLogEntryDto, GlobalBanStatusDto, ServiceAccessRequestDto } from "../lib/types";

// LocalStorage me SuperAdmin ka auth token store karne ke liye key
// Token yahan save hota hai taaki page refresh pe bhi login session bana rahe
const SA_TOKEN_KEY = "sa_token";

export default function SuperAdminPage(): Element {
  // token: SuperAdmin ka auth token — agar empty hai toh login form dikhega,
  // agar set hai toh full admin panel dikhega.
  // Lazy initializer se localStorage se token seedha uthate hain page load pe.
  const [token, setToken] = useState<string>(() => localStorage.getItem(SA_TOKEN_KEY) ?? "");

  // loginUser: Login form me dala hua username
  const [loginUser, setLoginUser] = useState("");

  // loginPw: Login form me dala hua password
  const [loginPw, setLoginPw] = useState("");

  // loginErr: Agar login fail ho toh yahan error message store hota hai
  const [loginErr, setLoginErr] = useState("");

  // shops: Saare registered shops ki list (SuperAdminShopDto type)
  // Ye list "Shops" tab me dikhti hai
  const [shops, setShops] = useState<SuperAdminShopDto[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceAccessRequestDto[]>([]);
  const [resolvingRequestId, setResolvingRequestId] = useState<number | null>(null);
  const [serviceRequestError, setServiceRequestError] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
  const [serviceRequestRejectionReason, setServiceRequestRejectionReason] = useState("");

  // search: Shops list me live search/filter ke liye input value
  const [search, setSearch] = useState("");

  // loading: Shops data fetch ho raha hai ya nahi — loading spinner ke liye
  const [loading, setLoading] = useState(false);

  // customFieldsEnabled: Kya platform pe custom intake fields feature ON hai?
  // Shop owners custom fields add kar sakte hain ya nahi — ye global toggle hai
  const [customFieldsEnabled, setCustomFieldsEnabledState] = useState(true);

  // showPlanInfoIcon: Shop admin dashboard pe plan info icon (i) dikhaye ya nahi
  const [showPlanInfoIcon, setShowPlanInfoIconState] = useState(false);

  // showPlanBadge: Shop admin dashboard pe PAID/BASIC badge dikhaye ya nahi
  const [showPlanBadge, setShowPlanBadgeState] = useState(false);

  // paymentQrEnabled: Payment QR (UPI etc.) feature globally on hai ya superadmin ne ban kiya hai.
  // Disable karne par koi bhi shop (chahe PAID ho) naya QR upload nahi kar sakti, aur jo
  // pehle se upload hai wo bhi customers ko dikhna band ho jaata hai.
  const [paymentQrEnabled, setPaymentQrEnabledState] = useState<boolean>(true);

  // paidPrice: PAID plan ki price (e.g. "299") — upgrade button pe yahi dikhega
  const [paidPrice, setPaidPriceState] = useState("");

  // paidCurrency: PAID plan ki currency (default INR)
  const [paidCurrency, setPaidCurrencyState] = useState("INR");
  const [upgradeContactEnabled, setUpgradeContactEnabledState] = useState(false);
  const [upgradeContactPhone, setUpgradeContactPhoneState] = useState("");

  // priceSaved: Price save karne ke baad 2 second ke liye "✓" dikhane ka flag
  const [priceSaved, setPriceSaved] = useState(false);

  // bulkPlanConfirm: Bulk plan change ke liye confirm modal — "BASIC" ya "PAID"
  // ya null (agar modal band hai)
  const [bulkPlanConfirm, setBulkPlanConfirm] = useState<"BASIC" | "PAID" | null>(null);

  // bulkPlanResult: Bulk plan change complete hone ke baad success message
  // (e.g. "✓ 12 shops → PAID"), 4 second baad clear ho jaata hai
  const [bulkPlanResult, setBulkPlanResult] = useState<string | null>(null);

  // qrModal: Agar QR modal open hai toh yahan shop code aur QR image URL hota hai,
  // warna null. Modal close hone pe URL.revokeObjectURL() call karke memory free ki jaati hai
  const [qrModal, setQrModal] = useState<{ code: string; url: string } | null>(null);

  // resetTarget: Jis shop ka password reset karna hai uska data yahan store hota hai
  // Agar null hai toh Reset Password modal band hai
  const [resetTarget, setResetTarget] = useState<SuperAdminShopDto | null>(null);

  // newPw: Reset Password modal me dala hua naya password
  const [newPw, setNewPw] = useState("");

  // resetMsg: Password reset ke baad success ya error message (modal ke andar dikhta hai)
  const [resetMsg, setResetMsg] = useState("");

  // activeTab: Abhi kaun sa tab active hai — shops / audit / security / services / settings
  const [activeTab, setActiveTab] = useState<"shops" | "audit" | "security" | "services" | "settings">("shops");

  // bannedTypes: Currently globally banned service types ki array (e.g. ["FOOD", "SALON"])
  const [bannedTypes, setBannedTypes] = useState<string[]>([]);

  // banConfirm: Jis service type ka ban confirm karna hai uska naam — null agar modal band hai
  const [banConfirm, setBanConfirm] = useState<string | null>(null); // type being confirmed

  // auditLog: Audit Log tab ke liye entries ki array — kaun ne kya kiya, kab
  const [auditLog, setAuditLog] = useState<AuditLogEntryDto[]>([]);

  // lockedIps: Security tab ke liye locked IP addresses ki list
  // Ye IPs brute-force login attempts ki wajah se block hui hain
  const [lockedIps, setLockedIps] = useState<string[]>([]);

  // plan set flow
  // planTarget: Jis shop ka plan change karna hai uska data — null agar modal band hai
  const [planTarget, setPlanTarget] = useState<SuperAdminShopDto | null>(null);
  const [renewTarget, setRenewTarget] = useState<SuperAdminShopDto | null>(null);
  const [selectedPaidCodes, setSelectedPaidCodes] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");

  // planMsg: Plan change ke baad success ya error message (modal ke andar)
  const [planMsg, setPlanMsg] = useState("");

  // Ye effect tab chalega jab token change ho (login/logout pe).
  // Token set hote hi shops load karta hai — page refresh pe bhi kaam karta hai
  // kyunki token localStorage se seedha milta hai.
  useEffect((): void => {
    if (token) loadShops();
  }, [token]);

  // handleLogin: Login form submit karta hai.
  // API se SuperAdmin token fetch karta hai aur localStorage me save karta hai.
  // Agar credentials galat hain toh error message dikhata hai.
  async function handleLogin(): Promise<void> {
    setLoginErr("");
    try {
      const t: string = await superAdminLogin(loginUser, loginPw);
      localStorage.setItem(SA_TOKEN_KEY, t);
      setToken(t);
    } catch {
      setLoginErr("Invalid credentials");
    }
  }

  // loadShops: Do API calls parallel me karta hai —
  //   1. superAdminListShops() — saari shops ki list
  //   2. getPlatformConfig()   — platform-wide settings (toggles, price, etc.)
  // Dono ka data ek saath state me set karta hai.
  // Agar koi error aaye (e.g. token expired) toh logout kar deta hai.
  async function loadShops(): Promise<void> {
    setLoading(true);
    try {
      const [data, cfg, requests] = await Promise.all([
        superAdminListShops(),
        getPlatformConfig(),
        superAdminGetServiceAccessRequests(),
      ]);
      setShops(data);
      setServiceRequests(requests);
      setCustomFieldsEnabledState(cfg.customFieldsEnabled);
      setShowPlanInfoIconState(cfg.showPlanInfoIcon);
      setShowPlanBadgeState(cfg.showPlanBadge);
      setPaidPriceState(cfg.paidPrice ?? "");
      setPaidCurrencyState(cfg.paidCurrency ?? "INR");
      setPaymentQrEnabledState(cfg.paymentQrEnabled);
      setUpgradeContactEnabledState(cfg.upgradeContactEnabled);
      setUpgradeContactPhoneState(cfg.upgradeContactPhone ?? "");
    } catch {
      // Token invalid ya expire ho gaya — localStorage clean karke logout
      localStorage.removeItem(SA_TOKEN_KEY);
      setToken("");
    } finally {
      setLoading(false);
    }
  }

  async function resolveServiceRequest(
    requestId: number,
    action: "approve" | "reject",
    reason?: string
  ): Promise<void> {
    setResolvingRequestId(requestId);
    setServiceRequestError("");
    try {
      await superAdminResolveServiceAccessRequest(requestId, action, reason);
      setServiceRequests((current) => current.filter((request) => request.id !== requestId));
      setRejectingRequestId(null);
      setServiceRequestRejectionReason("");
      if (action === "approve") {
        const updatedShops = await superAdminListShops();
        setShops(updatedShops);
      }
    } catch {
      setServiceRequestError("Could not resolve this request. Verify the current price and service status, then try again.");
    } finally {
      setResolvingRequestId(null);
    }
  }

  // loadAuditLog: Audit log entries fetch karta hai API se aur "audit" tab pe le jaata hai.
  // Ye function tab chalega jab user "audit" tab pe click kare.
  async function loadAuditLog(): Promise<void> {
    const data: AuditLogEntryDto[] = await superAdminGetAuditLog();
    setAuditLog(data);
    setActiveTab("audit");
  }

  // loadLockedIps: Brute-force se locked IP addresses fetch karta hai aur "security" tab dikhata hai.
  async function loadLockedIps(): Promise<void> {
    const data: string[] = await superAdminGetLockedIps();
    setLockedIps(data);
    setActiveTab("security");
  }

  // loadServiceBans: Currently banned service types fetch karta hai aur "services" tab dikhata hai.
  async function loadServiceBans(): Promise<void> {
    const data: GlobalBanStatusDto = await superAdminGetServiceBans();
    setBannedTypes(data.bannedTypes);
    setActiveTab("services");
  }

  // doBanService: Ek service type (e.g. "FOOD") ko globally ban karta hai.
  // API call ke baad updated banned list state me set karta hai aur confirm modal band karta hai.
  async function doBanService(type: string): Promise<void> {
    const data: GlobalBanStatusDto = await superAdminBanService(type);
    setBannedTypes(data.bannedTypes);
    setBanConfirm(null);
  }

  // doUnbanService: Kisi banned service type ka ban hata deta hai.
  // API call ke baad updated banned list state me set karta hai.
  async function doUnbanService(type: string): Promise<void> {
    const data: GlobalBanStatusDto = await superAdminUnbanService(type);
    setBannedTypes(data.bannedTypes);
  }

  // clearIpLock: Ek specific IP address ka lock hata deta hai.
  // API call ke baad state se us IP ko filter kar ke hata deta hai — re-fetch ki zaroorat nahi.
  async function clearIpLock(ip: string): Promise<void> {
    await superAdminClearIpLock(ip);
    setLockedIps((prev: string[]) => prev.filter((i: string) => i !== ip));
  }

  // toggleCustomFields: Platform pe custom intake fields feature on/off karta hai.
  // Current value ka ulta (next) value API ko bhejta hai, phir state update karta hai.
  async function toggleCustomFields(): Promise<void> {
    const next: boolean = !customFieldsEnabled;
    await superAdminSetCustomFieldsEnabled(next);
    setCustomFieldsEnabledState(next);
  }

  // toggleShowPlanInfoIcon: Shop admin dashboard pe plan info icon (i) show/hide toggle.
  async function toggleShowPlanInfoIcon(): Promise<void> {
    const next: boolean = !showPlanInfoIcon;
    await superAdminSetShowPlanInfoIcon(next);
    setShowPlanInfoIconState(next);
  }

  // togglePaymentQrEnabled: Payment QR feature ko globally on/off (ban) karta hai.
  // Disable karte hi sab shops ke customers ko QR dikhna band ho jaata hai.
  async function togglePaymentQrEnabled(): Promise<void> {
    const next: boolean = !paymentQrEnabled;
    await superAdminSetPaymentQrEnabled(next);
    setPaymentQrEnabledState(next);
  }

  // savePaidPrice: PAID plan ki price aur currency API me save karta hai.
  // Save hone ke baad 2 second ke liye button pe "✓" dikhata hai (priceSaved flag).
  async function savePaidPrice(): Promise<void> {
    await superAdminSetPaidPrice(paidPrice, paidCurrency);
    setPriceSaved(true);
    setTimeout((): void => setPriceSaved(false), 2000);
  }

  async function saveUpgradeContact(): Promise<void> {
    await superAdminSetUpgradeContact(upgradeContactEnabled, upgradeContactPhone);
    await loadShops();
  }

  // doBulkPlan: Saare shops ka plan ek saath "BASIC" ya "PAID" me convert karta hai.
  // API call ke baad confirm modal band karta hai, result message 4 second ke liye dikhata hai,
  // aur shops list refresh karta hai.
  async function doBulkPlan(plan: "BASIC" | "PAID"): Promise<void> {
    const result: { updated: number; plan: string } = await superAdminBulkSetPlan(plan);
    setBulkPlanConfirm(null);
    setBulkPlanResult(`✓ ${result.updated} shops → ${result.plan}`);
    await loadShops();
    setTimeout((): void => setBulkPlanResult(null), 4000);
  }

  // toggleShowPlanBadge: Shop admin dashboard pe PAID/BASIC badge show/hide toggle.
  async function toggleShowPlanBadge(): Promise<void> {
    const next: boolean = !showPlanBadge;
    await superAdminSetShowPlanBadge(next);
    setShowPlanBadgeState(next);
  }

  // openPlanFlow: Kisi shop ka plan change karne ka flow start karta hai.
  // Shop data planTarget me set karta hai, jisse confirm modal khulta hai.
  // planMsg clear karta hai taaki pichla koi message na dikhta rahe.
  function openPlanFlow(shop: SuperAdminShopDto): void {
    setPlanTarget(shop);
    setPlanMsg("");
    setPaymentAmount("");
    setSelectedPaidCodes(shop.sections.filter((section) => section.active && !section.globallyBanned)
      .map((section) => section.code));
  }

  function openRenewalFlow(shop: SuperAdminShopDto): void {
    setRenewTarget(shop);
    setPlanMsg("");
    setPaymentAmount("");
    setSelectedPaidCodes(shop.sections.filter((section) => section.active && !section.globallyBanned)
      .map((section) => section.code));
  }

  // A payment covers only the services explicitly selected by Super Admin.
  function togglePaidService(code: string): void {
    setSelectedPaidCodes((current) =>
      current.includes(code) ? current.filter((value) => value !== code) : [...current, code]);
  }

  function paidAmountMatchesSelection(): boolean {
    const unitPrice = Number(paidPrice);
    const enteredAmount = Number(paymentAmount);
    return selectedPaidCodes.length > 0 && Number.isFinite(unitPrice) && unitPrice > 0
      && Number.isFinite(enteredAmount)
      && Math.abs(enteredAmount - unitPrice * selectedPaidCodes.length) < 0.000001;
  }

  function formatMoney(amount: number, currency = paidCurrency): string {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  function renderPaidServiceSelection(shop: SuperAdminShopDto): Element {
    const expectedAmount = Number(paidPrice) * selectedPaidCodes.length;
    return (
      <div className="mb-4 space-y-3">
        <p className="text-sm font-semibold">Mark the services covered by this payment</p>
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-gray-100 p-2">
          {shop.sections.map((section) => (
            <label key={section.code} className={`flex items-center gap-2 rounded-lg p-2 text-sm ${
              section.globallyBanned ? "text-gray-400" : "text-gray-700"
            }`}>
              <input
                type="checkbox"
                checked={selectedPaidCodes.includes(section.code)}
                disabled={section.globallyBanned}
                onChange={() => togglePaidService(section.code)}
              />
              <span className="min-w-0 flex-1 truncate">{section.displayName}</span>
              {section.globallyBanned && <span className="text-xs">Banned</span>}
            </label>
          ))}
          {shop.sections.length === 0 && <p className="p-2 text-sm text-gray-400">Shop has no services.</p>}
        </div>
        <p className="text-xs text-gray-600">
          Expected: {selectedPaidCodes.length} × {formatMoney(Number(paidPrice) || 0)} = {formatMoney(expectedAmount || 0)} for 30 days
        </p>
        <label className="block text-sm">
          Amount received
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={paymentAmount}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPaymentAmount(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            placeholder="Enter received amount"
          />
        </label>
        {!paidAmountMatchesSelection() && (
          <p className="text-xs text-amber-700">Amount must exactly match the selected services.</p>
        )}
      </div>
    );
  }

  // A PAID plan update requires both the verified amount and its covered service list.
  async function confirmPlanChange(): Promise<void> {
    if (!planTarget) return;
    const newPlan: "BASIC" | "PAID" = planTarget.plan === "PAID" ? "BASIC" : "PAID";
    await doSetPlan(newPlan, newPlan === "PAID" ? selectedPaidCodes : [],
      newPlan === "PAID" ? paymentAmount : undefined);
  }

  async function confirmRenewal(): Promise<void> {
    if (!renewTarget) return;
    try {
      const updated = await superAdminSetPlan(renewTarget.code, "PAID", selectedPaidCodes, paymentAmount);
      setShops((current) => current.map((shop) => shop.code === updated.code ? updated : shop));
      setRenewTarget(null);
      setPlanMsg(`✓ ${updated.name} renewed for 30 days`);
    } catch {
      setPlanMsg("Payment amount or service selection is invalid.");
    }
  }

  // doSetPlan: Ek specific shop ka plan API ke zariye set karta hai.
  // Success pe shops list me sirf woh shop update hoti hai (poori list re-fetch nahi).
  // planTarget null ho jaata hai jisse modal band ho jaata hai.
  async function doSetPlan(plan: string, keepCodes: string[], amountPaid?: string): Promise<void> {
    if (!planTarget) return;
    try {
      const updated: SuperAdminShopDto = await superAdminSetPlan(planTarget.code, plan, keepCodes, amountPaid);
      // Sirf woh ek shop update karo jis pe action hua — baki list waise hi rahe
      setShops((prev: SuperAdminShopDto[]) => prev.map((s: SuperAdminShopDto) => (s.code === updated.code ? updated : s)));
      setPlanMsg(`✓ ${planTarget.name} is now ${plan}`);
      setPlanTarget(null);
    } catch {
      setPlanMsg("Failed. Try again.");
    }
  }

  // openQr: Kisi shop ka QR code image URL fetch karta hai aur QR modal kholta hai.
  // Agar fetch fail ho toh alert dikhata hai.
  async function openQr(code: string): Promise<void> {
    try {
      const url: string = await superAdminFetchQr(code);
      setQrModal({ code, url });
    } catch {
      alert("QR load failed");
    }
  }

  // doReset: Kisi shop ke admin ka password API ke zariye reset karta hai.
  // Blank password allow nahi — trim ke baad empty ho toh kuch nahi karta.
  // Success ya failure ka message resetMsg state me store hota hai.
  async function doReset(): Promise<void> {
    if (!resetTarget || !newPw.trim()) return;
    try {
      await superAdminResetPassword(resetTarget.code, newPw.trim());
      setResetMsg(`✓ Password reset for ${resetTarget.adminUsername}`);
      setNewPw("");
    } catch {
      setResetMsg("Reset failed. Try again.");
    }
  }

  // filtered: Search query ke hisaab se shops ki filtered list.
  // Search blank ho toh sab dikhate hain; warna name ya code me match dhundhte hain.
  // Case-insensitive search ke liye dono ko lowercase kiya jata hai.
  const filtered: SuperAdminShopDto[] = shops.filter((s: SuperAdminShopDto): boolean => {
    const q: string = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  // Agar token nahi hai (user logged out hai ya pehli baar aa raha hai)
  // toh sirf login form dikhao — poora admin panel mat dikhao
  if (!token) {
    return (
      // Login screen — centered card layout
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-xl text-white">⚙️</div>
            <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">Developer access only</p>
          </div>
          <div className="space-y-3">
            <input
              value={loginUser}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setLoginUser(e.target.value)}
              placeholder="Username"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <input
              type="password"
              value={loginPw}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setLoginPw(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>): false | Promise<void> => e.key === "Enter" && handleLogin()}
              placeholder="Password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {loginErr && <p className="text-xs text-red-500">{loginErr}</p>}
            <button
              onClick={handleLogin}
              className="min-h-11 w-full rounded-xl bg-brand px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    // Main panel layout — full height, max-width centered, flex column
    <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-3 py-3 sm:h-screen sm:px-4 sm:py-4">
      {/* Fixed header — hamesha upar dikhai deta hai, scroll ke saath nahi jaata */}
      <div className="border-b border-slate-200 bg-white/80 pb-4 backdrop-blur-xl">
        {/* Header bar — title, shops count, Refresh aur Logout buttons */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Super Admin Panel</h1>
            <p className="text-xs text-slate-500">{shops.length} shops registered</p>
          </div>
          <div className="flex gap-4">
            <button onClick={loadShops} className="min-h-11 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              Refresh
            </button>
            <button
              onClick={(): void => {
                localStorage.removeItem(SA_TOKEN_KEY);
                setToken("");
              }}
              className="min-h-11 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab navigation — shops, services, audit, security, settings
            Har tab click pe appropriate data load function call hota hai */}
        <div className="flex flex-wrap gap-2">
          {(["shops", "services", "audit", "security", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={(): void => {
                if (tab === "audit") loadAuditLog();
                else if (tab === "security") loadLockedIps();
                else if (tab === "services") loadServiceBans();
                else setActiveTab(tab);
              }}
              className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                activeTab === tab ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search bar — sirf "shops" tab pe dikhta hai, doosre tabs pe nahi */}
        {activeTab === "shops" && (
          <input
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        )}
      </div>

      {/* Scrollable content area — tab ke hisaab se alag alag content dikhata hai */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Audit log tab — saare admin actions ki chronological list */}
        {activeTab === "audit" && (
          <div className="space-y-2 mb-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {auditLog.length === 0 && <p className="text-center text-gray-400 py-8">No audit log entries yet.</p>}
            {auditLog.map((e: AuditLogEntryDto, i: number): Element => (
              // Har entry: action type badge (color-coded), target, by, kab
              <div key={i} className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm">
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${
                    e.action === "PASSWORD_RESET" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {e.action}
                </span>
                <span className="text-gray-700">{e.target}</span>
                <span className="text-gray-400 ml-2 text-xs">by {e.by} · {new Date(e.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Security tab — locked IPs dikhata hai aur unlock karne ka option deta hai */}
        {activeTab === "security" && (
          <div className="mb-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            <p className="text-sm font-medium mb-3">Locked IPs (login brute force)</p>
            {lockedIps.length === 0 && <p className="text-center text-gray-400 py-8">No locked IPs.</p>}
            {lockedIps.map((ip: string) => (
              // Har IP ke saath "Unlock" button — click pe clearIpLock() call hoga
              <div key={ip} className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm flex items-center justify-between mb-2">
                <span className="font-mono">{ip}</span>
                <button onClick={(): Promise<void> => clearIpLock(ip)} className="text-xs text-emerald-600 hover:underline">
                  Unlock
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Services tab — global service ban/unban controls */}
        {activeTab === "services" && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-1">Global Service Ban</p>
            <p className="text-xs text-gray-400 mb-4">
              Ek service type ban karo — sabhi shops ke us type ke sections disable ho jaayenge.
              2 din baad data permanently delete ho jaayega. PAID shops export kar sakte hain.
            </p>
            {/* Har hardcoded service type ke liye ek row — ban ya unban button */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {["FOOD", "SALON", "CLINIC", "GROCERY", "ROOMS", "GENERAL", "OTHER"].map((type: string) => {
                const isBanned: boolean = bannedTypes.includes(type);
                return (
                  <div key={type} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{type}</span>
                      {/* Agar currently banned hai toh red "BANNED" badge dikhao */}
                      {isBanned && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">BANNED</span>
                      )}
                    </div>
                    {/* Agar banned hai toh "Unban" button, warna "Ban" button (confirm ke saath) */}
                    {isBanned ? (
                      <button
                        onClick={(): Promise<void> => doUnbanService(type)}
                        className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-medium"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={(): void => setBanConfirm(type)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium"
                      >
                        Ban
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bulk plan change confirm modal — bahut bada action hai (saare shops affect) isliye confirm */}
        {bulkPlanConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h2 className="font-bold mb-2">{bulkPlanConfirm === "PAID" ? "Upgrade all shops to PAID?" : "Downgrade all shops to BASIC?"}</h2>
              {/* Warning message — downgrade pe data loss aur limits remove */}
              <p className="text-sm text-gray-600 mb-4">
                {bulkPlanConfirm === "BASIC"
                  ? "All PAID shops will be downgraded. All staff deleted, all services disabled. Each shop owner will be logged out and forced to re-select their services."
                  : "All BASIC shops will be upgraded to PAID — all limits removed."}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={(): Promise<void> => doBulkPlan(bulkPlanConfirm)}
                  className={`w-full py-2.5 rounded-xl font-medium text-white ${
                    bulkPlanConfirm === "PAID" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  Yes, convert all
                </button>
                <button onClick={(): void => setBulkPlanConfirm(null)} className="w-full bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Service ban confirm modal — ye action irreversible feel karta hai (data delete schedule)
            isliye warning ke saath explicit confirm liya jaata hai */}
        {banConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h2 className="font-bold mb-2 text-red-600">Ban Service: {banConfirm}</h2>
              <p className="text-sm text-gray-600 mb-4">
                Sabhi shops ke <b>{banConfirm}</b> sections immediately disable ho jaayenge. Shop owners unhe enable nahi kar paayenge.
                <br />
                <br />
                <span className="text-amber-700 font-medium">2 din baad saara data permanently delete ho jaayega.</span> PAID shops ke owners CSV export kar sakte hain usse pehle.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={(): Promise<void> => doBanService(banConfirm)} className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium">
                  Haan, ban karo
                </button>
                <button onClick={(): void => setBanConfirm(null)} className="w-full bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Platform settings tab — sirf "settings" tab active hone pe dikhta hai */}
        {activeTab === "settings" && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 space-y-3 border-t-4 border-t-slate-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Platform Settings</p>

            {[
              { label: "Payment QR (UPI etc.)", desc: "PAID shops apna payment QR upload/dikha sakti hain - disable karna global ban jaisa hai.", val: paymentQrEnabled, toggle: togglePaymentQrEnabled }, // FIX: pehle '(): void => togglePaymentQrEnabled' tha, jo function ko call kiye bina return kar raha tha (type error)
            ].map((item: { label: string; desc: string; val: boolean; toggle: () => void }): Element => (
              // Toggle switch UI — green jab ON, gray jab OFF
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                <button
                  onClick={item.toggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    item.val ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      item.val ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}

            {/* Pricing is charged per selected service for each 30-day paid period. */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-sm font-medium mb-2">PAID price per service (30 days)</p>
              <div className="flex gap-2">
                {/* Price input — number string (e.g. "299") */}
                <input
                  value={paidPrice}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setPaidPriceState(e.target.value)}
                  placeholder="e.g. 299"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
                {/* Currency dropdown — INR default, USD/EUR/GBP bhi available */}
                <select
                  value={paidCurrency}
                  onChange={(e: ChangeEvent<HTMLSelectElement>): void => setPaidCurrencyState(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
                {/* Save button — save hone ke 2 second baad "✓" se wapas "Save" ho jaata hai */}
                <button
                  onClick={savePaidPrice}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                    priceSaved ? "bg-emerald-500 text-white" : "bg-brand text-white hover:opacity-90"
                  }`}
                >
                  {priceSaved ? "✓" : "Save"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Each paid service costs this amount for 30 days.</p>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Support &amp; payment WhatsApp number</p>
                  <p className="text-xs text-gray-400">Show this number for PAID requests, support queries, and password recovery.</p>
                </div>
                <button
                  type="button"
                  aria-label="Toggle WhatsApp support contact visibility"
                  aria-pressed={upgradeContactEnabled}
                  onClick={() => setUpgradeContactEnabledState((enabled) => !enabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                    upgradeContactEnabled ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    upgradeContactEnabled ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  inputMode="tel"
                  value={upgradeContactPhone}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setUpgradeContactPhoneState(event.target.value)}
                  placeholder="Support / payment WhatsApp number"
                  className="min-w-0 flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
                <button
                  onClick={() => void saveUpgradeContact()}
                  disabled={upgradeContactEnabled && !upgradeContactPhone.trim()}
                  className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Bulk plan change section — ek click se saare shops ka plan badlo */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-sm font-medium mb-1">Bulk Plan Change</p>
              <p className="text-xs text-gray-400 mb-3">Convert all shops to BASIC or PAID in one click.</p>
              {/* Result message — bulk operation complete hone ke baad 4 second ke liye dikhata hai */}
              {bulkPlanResult && <p className="text-xs text-emerald-700 font-medium mb-2">{bulkPlanResult}</p>}
              <div>
                {/* "All → BASIC" button confirm modal kholta hai */}
                <button
                  onClick={(): void => setBulkPlanConfirm("BASIC")}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium py-2 rounded-xl transition"
                >
                  All → BASIC
                </button>
              </div>
            </div>

            {/* Remaining feature toggles — custom fields, plan badge, plan info icon
                Ye sab array me mapped hain isliye ek jaisi toggle UI repeat nahi karni padti */}
            {[
              { label: "Custom Fields (shop owners)", desc: "Allow shop owners to add custom intake fields", val: customFieldsEnabled, toggle: toggleCustomFields },
              { label: "Show plan badge to owners", desc: "Show PAID/BASIC badge on admin dashboard (all shops)", val: showPlanBadge, toggle: toggleShowPlanBadge },
              { label: "Show plan info icon to owners", desc: "Show (i) icon with plan details on admin dashboard", val: showPlanInfoIcon, toggle: toggleShowPlanInfoIcon },
            ].map((item: { label: string; desc: string; val: boolean; toggle: () => void }): Element => (
              // Toggle switch UI — same pattern jo upar tier system ke liye use kiya
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                <button
                  onClick={item.toggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    item.val ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      item.val ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Shops tab content — loading state ya filtered shops list */}
        {activeTab === "shops" && loading ? (
          // Data fetch ho raha hai — loading placeholder
          <p className="text-center text-gray-400 py-10">Loading...</p>
        ) : activeTab === "shops" ? (
          // Shops ki scrollable list — search se filtered
          <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Registered Shops</p>
            {serviceRequests.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
                <p className="text-sm font-bold text-indigo-900">Service payment requests</p>
                {serviceRequestError && <p className="text-xs text-red-600">{serviceRequestError}</p>}
                {serviceRequests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-gray-100 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{request.shopName} <span className="text-xs font-normal text-gray-500">({request.shopCode})</span></p>
                        {request.phone && <p className="text-xs text-gray-500">{request.phone}</p>}
                      </div>
                      <p className="text-sm font-bold text-emerald-700">{formatMoney(request.amount, request.currency)}</p>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Owner selected these services; verify payment before approval:</p>
                    <div className="mt-2 space-y-1">
                      {request.sections.map((section) => (
                        <label key={section.code} className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked disabled />
                          <span>{section.displayName}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      {request.sections.length} requested services for 30 days · {new Date(request.createdAt).toLocaleString()}
                    </p>
                    {rejectingRequestId === request.id && (
                      <div className="mt-3 space-y-2">
                        <label htmlFor={`service-request-reason-${request.id}`} className="block text-xs font-medium text-gray-700">
                          Rejection reason (required)
                        </label>
                        <textarea
                          id={`service-request-reason-${request.id}`}
                          value={serviceRequestRejectionReason}
                          onChange={(event) => setServiceRequestRejectionReason(event.target.value)}
                          maxLength={1000}
                          rows={3}
                          placeholder="Explain why this payment request is being rejected."
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => void resolveServiceRequest(request.id, "approve")}
                        disabled={resolvingRequestId !== null}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {resolvingRequestId === request.id ? "Processing..." : "Payment verified — approve"}
                      </button>
                      <button
                        onClick={() => {
                          if (rejectingRequestId !== request.id) {
                            setRejectingRequestId(request.id);
                            setServiceRequestRejectionReason("");
                            return;
                          }
                          if (!serviceRequestRejectionReason.trim()) {
                            setServiceRequestError("Enter a reason before rejecting this request.");
                            return;
                          }
                          void resolveServiceRequest(request.id, "reject", serviceRequestRejectionReason.trim());
                        }}
                        disabled={resolvingRequestId !== null}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        {rejectingRequestId === request.id
                          ? (resolvingRequestId === request.id ? "Rejecting..." : "Confirm rejection")
                          : "Reject"}
                      </button>
                      {rejectingRequestId === request.id && (
                        <button
                          onClick={() => {
                            setRejectingRequestId(null);
                            setServiceRequestRejectionReason("");
                            setServiceRequestError("");
                          }}
                          disabled={resolvingRequestId !== null}
                          className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {filtered.map((s: SuperAdminShopDto): Element => (
              // Har shop card — name, plan badge, code, location, phone, admin info, aur action buttons
              <div key={s.code} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {/* Shop name + plan badge (green = PAID, amber = BASIC) */}
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-800">{s.name}</div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        s.plan === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {s.plan}
                    </span>
                  </div>
                </div>

                {/* Shop code (unique identifier) aur optional city/phone info */}
                <div className="text-xs text-gray-400 mt-0.5">
                  <span className="font-mono text-brand">{s.code}</span>
                  {s.city && <span className="ml-2">· {s.state ? `${s.state}, ` : ""}{s.city}</span>}
                  {s.phone && <span className="ml-2">· {s.phone}</span>}
                </div>

                {/* Admin username aur recovery code (agar available ho) */}
                <div className="text-xs text-gray-500 mt-1">
                  Admin: <span className="font-medium">{s.adminUsername}</span>
                  {s.recoveryCode && (
                    <span className="ml-3">Recovery: <span className="font-mono text-gray-700">{s.recoveryCode}</span></span>
                  )}
                </div>
                {(s.trialEndsAt || s.paidUntil || s.subscriptionLocked) && (
                  <p className={`mt-1 text-xs ${s.subscriptionLocked ? "font-semibold text-red-600" : "text-gray-500"}`}>
                    {s.subscriptionLocked
                      ? "Subscription expired / shop locked"
                      : `${s.paidUntil ? "PAID until" : "Trial until"} ${new Date(s.paidUntil ?? s.trialEndsAt ?? "").toLocaleDateString()}`}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-600">
                  Services: {s.sections.length} configured · {s.sections.filter((section) => section.active).length} paid/enabled
                </p>
                {Number.isFinite(Number(paidPrice)) && Number(paidPrice) > 0 && (
                  <p className="text-xs font-medium text-gray-700">
                    All services: {s.sections.length} × {formatMoney(Number(paidPrice))} = {formatMoney(Number(paidPrice) * s.sections.length)} / 30 days
                  </p>
                )}
                {s.lastPaymentAmount !== null && s.lastPaymentAmount !== undefined && (
                  <p className="text-xs text-gray-500">
                    Last received: {formatMoney(s.lastPaymentAmount, s.lastPaymentCurrency ?? paidCurrency)}
                    {s.lastPaymentAt ? ` · ${new Date(s.lastPaymentAt).toLocaleDateString()}` : ""}
                  </p>
                )}

                {/* Action buttons: QR dikhao, Password reset, Plan change */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={(): Promise<void> => openQr(s.code)} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
                    Show QR
                  </button>
                  <button
                    onClick={(): void => {
                      setResetTarget(s);
                      setNewPw("");
                      setResetMsg("");
                    }}
                    className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg"
                  >
                    Reset PW
                  </button>
                  {/* Plan toggle button — label aur color plan ke hisaab se badalta hai */}
                  <button
                    onClick={(): void => openPlanFlow(s)}
                    className={`text-sm px-3 py-1.5 rounded-lg ${
                      s.plan === "PAID" ? "bg-amber-50 hover:bg-amber-100 text-amber-700" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {s.plan === "PAID" ? "→ BASIC" : "→ PAID"}
                  </button>
                  {s.plan === "PAID" && (
                    <button
                      onClick={(): void => openRenewalFlow(s)}
                      className="text-sm rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100"
                    >
                      Renew +30d
                    </button>
                  )}
                </div>
              </div>
            ))}
            {/* Agar search ke baad koi shop nahi mili */}
            {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No shops found.</p>}
          </div>
        ) : null}
      </div>

      {/* QR Code modal — shop ka QR image dikhata hai, download link bhi deta hai
          Close karne pe URL.revokeObjectURL() call hoti hai — memory leak na ho isliye */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center">
            <h2 className="font-bold mb-3">QR - {qrModal.code}</h2>
            <img src={qrModal.url} alt="QR" className="mx-auto mb-4 rounded-xl border border-gray-100" />
            {/* Download link — browser QR PNG seedha download karega */}
            <a href={qrModal.url} download={`qr-${qrModal.code}.png`} className="text-sm text-brand hover:underline block mb-3">
              Download PNG
            </a>
            {/* Close karne pe Object URL revoke karna zaroori hai — memory free karta hai */}
            <button
              onClick={(): void => {
                URL.revokeObjectURL(qrModal.url);
                setQrModal(null);
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-xl text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reset password modal — kisi shop ke admin ka password forcefully change karna */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold mb-1">Reset Password</h2>
            {/* Confirmation ke liye shop naam aur admin username dikhao */}
            <p className="text-sm text-gray-500 mb-3">
              Shop: <span className="font-medium">{resetTarget.name}</span> ({resetTarget.code})<br />
              Admin: <span className="font-medium">{resetTarget.adminUsername}</span>
            </p>
            {/* New password input — Enter key se bhi submit ho sakta hai */}
            <input
              type="password"
              value={newPw}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewPw(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>): false | Promise<void> => e.key === "Enter" && doReset()}
              placeholder="New password (min 4 chars)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {/* Success (green) ya error (red) message — "✓" se start ho toh success */}
            {resetMsg && (
              <p className={`text-xs mb-2 ${resetMsg.startsWith("✓") ? "text-emerald-700" : "text-red-500"}`}>
                {resetMsg}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {/* Reset button — password blank hone pe disabled */}
              <button
                onClick={doReset}
                disabled={!newPw.trim()}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium disabled:opacity-40"
              >
                Reset Password
              </button>
              <button
                onClick={(): void => {
                  setResetTarget(null);
                  setResetMsg("");
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan change confirm modal — individual shop ka plan upgrade/downgrade */}
      {renewTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 py-3 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-6 sm:rounded-2xl">
            <h2 className="mb-2 font-bold">Confirm 30-day renewal</h2>
            <p className="mb-4 text-sm text-gray-600">
              Enter the received amount and mark the services covered for <b>{renewTarget.name}</b>. This adds 30 PAID days.
            </p>
            {renderPaidServiceSelection(renewTarget)}
            {planMsg && <p className="mb-2 text-xs text-red-600">{planMsg}</p>}
            <div className="flex flex-col gap-2">
              <button onClick={() => void confirmRenewal()} disabled={!paidAmountMatchesSelection()}
                className="w-full rounded-xl bg-emerald-500 py-2.5 font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                Confirm payment & renew
              </button>
              <button onClick={() => setRenewTarget(null)}
                className="w-full rounded-xl bg-gray-100 py-2.5 text-sm hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {planTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 py-3 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-6 sm:rounded-2xl">
            <h2 className="font-bold mb-2">
              {planTarget.plan === "PAID" ? "Downgrade to BASIC?" : "Upgrade to PAID?"}
            </h2>
            <p className="text-sm text-gray-600 mb-1">
              Shop: <span className="font-semibold">{planTarget.name}</span>
            </p>
            {/* Downgrade warning (data loss) ya upgrade confirmation — context ke hisaab se */}
            <p className="text-sm text-gray-500 mb-4">
              {planTarget.plan === "PAID"
                ? "Are you sure? Shop will be locked on BASIC until PAID is activated. Services will be disabled; shop, staff, and history will be preserved."
                : "Enter the verified payment and mark the services it covers. The shop will be PAID for 30 days."}
            </p>
            {planTarget.plan === "BASIC" && renderPaidServiceSelection(planTarget)}
            {/* planMsg: agar pichli attempt fail hui thi toh error dikhega */}
            {planMsg && <p className="text-xs text-red-500 mb-2">{planMsg}</p>}
            <div className="flex flex-col gap-2">
              {/* Button color aur label plan ke hisaab se badalta hai */}
              <button
                onClick={confirmPlanChange}
                disabled={planTarget.plan === "BASIC" && !paidAmountMatchesSelection()}
                className={`w-full py-2.5 rounded-xl font-medium text-white ${
                  planTarget.plan === "PAID" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                } disabled:opacity-50`}
              >
                Yes, {planTarget.plan === "PAID" ? "downgrade" : "upgrade"}
              </button>
              <button onClick={(): void => setPlanTarget(null)} className="w-full bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}