// =====================================================================
// SuperAdminPage.tsx
// (Header comment block was collapsed in the screenshots — original
//  imports/comments above this point were not visible and are not
//  reconstructed here. Add your actual imports back, e.g.:)
// =====================================================================
// import { useState, useEffect } from "react";
// import {
//   superAdminLogin,
//   superAdminListShops,
//   getPlatformConfig,
//   superAdminGetAuditLog,
//   superAdminGetLockedIps,
//   superAdminGetServiceBans,
//   superAdminBanService,
//   superAdminUnbanService,
//   superAdminClearIpLock,
//   superAdminSetCustomFieldsEnabled,
//   superAdminSetTierSystemEnabled,
//   superAdminSetShowPlanInfoIcon,
//   superAdminSetShowPlanBadge,
//   superAdminSetPaidPrice,
//   superAdminBulkSetPlan,
//   superAdminSetPlan,
//   superAdminFetchQr,
//   superAdminResetPassword,
// } from "../lib/api";
// import type { SuperAdminShopDto, AuditLogEntryDto, GlobalBanStatusDto } from "../lib/types";

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

  // search: Shops list me live search/filter ke liye input value
  const [search, setSearch] = useState("");

  // loading: Shops data fetch ho raha hai ya nahi — loading spinner ke liye
  const [loading, setLoading] = useState(false);

  // customFieldsEnabled: Kya platform pe custom intake fields feature ON hai?
  // Shop owners custom fields add kar sakte hain ya nahi — ye global toggle hai
  const [customFieldsEnabled, setCustomFieldsEnabledState] = useState(true);

  // tierSystemEnabled: Kya BASIC/PAID plan restrictions enforce ho rahi hain?
  // Agar true hai toh BASIC shops pe limits lagti hain (max 2 services, etc.)
  const [tierSystemEnabled, setTierSystemEnabledState] = useState(false);

  // showPlanInfoIcon: Shop admin dashboard pe plan info icon (i) dikhaye ya nahi
  const [showPlanInfoIcon, setShowPlanInfoIconState] = useState(false);

  // showPlanBadge: Shop admin dashboard pe PAID/BASIC badge dikhaye ya nahi
  const [showPlanBadge, setShowPlanBadgeState] = useState(false);

  // paidPrice: PAID plan ki price (e.g. "299") — upgrade button pe yahi dikhega
  const [paidPrice, setPaidPriceState] = useState("");

  // paidCurrency: PAID plan ki currency (default INR)
  const [paidCurrency, setPaidCurrencyState] = useState("INR");

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
      const [data, cfg] = await Promise.all([superAdminListShops(), getPlatformConfig()]);
      setShops(data);
      setCustomFieldsEnabledState(cfg.customFieldsEnabled);
      setTierSystemEnabledState(cfg.tierSystemEnabled);
      setShowPlanInfoIconState(cfg.showPlanInfoIcon);
      setShowPlanBadgeState(cfg.showPlanBadge);
      setPaidPriceState(cfg.paidPrice ?? "");
      setPaidCurrencyState(cfg.paidCurrency ?? "INR");
    } catch {
      // Token invalid ya expire ho gaya — localStorage clean karke logout
      localStorage.removeItem(SA_TOKEN_KEY);
      setToken("");
    } finally {
      setLoading(false);
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

  // tierConfirm: Tier system toggle ke liye confirm modal me next value store hoti hai.
  // null = modal band hai; true/false = enable/disable confirm kar raha hai
  const [tierConfirm, setTierConfirm] = useState<boolean | null>(null); // next value to confirm

  // confirmToggleTierSystem: Tier system ka pending toggle actually execute karta hai.
  // tierConfirm state me jo value hai woh API ko bhejta hai, phir state reset karta hai.
  // Modal ke "Yes, enable/disable" button se yahi function call hota hai.
  async function confirmToggleTierSystem(): Promise<void> {
    if (tierConfirm === null) return;
    await superAdminSetTierSystemEnabled(tierConfirm);
    setTierSystemEnabledState(tierConfirm);
    setTierConfirm(null);
  }

  // toggleShowPlanInfoIcon: Shop admin dashboard pe plan info icon (i) show/hide toggle.
  async function toggleShowPlanInfoIcon(): Promise<void> {
    const next: boolean = !showPlanInfoIcon;
    await superAdminSetShowPlanInfoIcon(next);
    setShowPlanInfoIconState(next);
  }

  // savePaidPrice: PAID plan ki price aur currency API me save karta hai.
  // Save hone ke baad 2 second ke liye button pe "✓" dikhata hai (priceSaved flag).
  async function savePaidPrice(): Promise<void> {
    await superAdminSetPaidPrice(paidPrice, paidCurrency);
    setPriceSaved(true);
    setTimeout((): void => setPriceSaved(false), 2000);
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
  }

  // confirmPlanChange: Plan change confirm hone pe actual API call karta hai.
  // Agar shop abhi PAID hai toh BASIC karega, agar BASIC hai toh PAID karega.
  // Downgrade (PAID → BASIC) me backend saari sections disable karega, admin khud
  // re-select karega. Upgrade (BASIC → PAID) me seedha switch ho jaata hai.
  async function confirmPlanChange(): Promise<void> {
    if (!planTarget) return;
    const newPlan: "BASIC" | "PAID" = planTarget.plan === "PAID" ? "BASIC" : "PAID";
    // Downgrade: backend saari sections disable karega, admin khud select karega
    // Upgrade: seedha PAID kar do
    await doSetPlan(newPlan, []);
  }

  // doSetPlan: Ek specific shop ka plan API ke zariye set karta hai.
  // Success pe shops list me sirf woh shop update hoti hai (poori list re-fetch nahi).
  // planTarget null ho jaata hai jisse modal band ho jaata hai.
  async function doSetPlan(plan: string, keepCodes: string[]): Promise<void> {
    if (!planTarget) return;
    try {
      const updated: SuperAdminShopDto = await superAdminSetPlan(planTarget.code, plan, keepCodes);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-center mb-1">Super Admin</h1>
          <p className="text-xs text-gray-400 text-center mb-5">Developer access only</p>
          {/* Login form — username, password, error message, aur login button */}
          <div className="space-y-3">
            <input
              value={loginUser}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setLoginUser(e.target.value)}
              placeholder="Username"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <input
              type="password"
              value={loginPw}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setLoginPw(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>): false | Promise<void> => e.key === "Enter" && handleLogin()}
              placeholder="Password"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {loginErr && <p className="text-xs text-red-500">{loginErr}</p>}
            <button
              onClick={handleLogin}
              className="w-full bg-brand text-white py-2.5 rounded-xl font-medium hover:bg-brand-dark transition"
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
    <div className="h-screen flex flex-col max-w-5xl mx-auto px-4">
      {/* Fixed header — hamesha upar dikhai deta hai, scroll ke saath nahi jaata */}
      <div className="py-4 border-b border-gray-100 bg-white">
        {/* Header bar — title, shops count, Refresh aur Logout buttons */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Super Admin Panel</h1>
            <p className="text-xs text-slate-300">{shops.length} shops registered</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadShops} className="text-sm text-slate-300 hover:text-white">
              Refresh
            </button>
            {/* Logout: localStorage se token hatao aur token state empty karo */}
            <button
              onClick={(): void => {
                localStorage.removeItem(SA_TOKEN_KEY);
                setToken("");
              }}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab navigation — shops, services, audit, security, settings
            Har tab click pe appropriate data load function call hota hai */}
        <div className="flex gap-2">
          {(["shops", "services", "audit", "security", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={(): void => {
                if (tab === "audit") loadAuditLog();
                else if (tab === "security") loadLockedIps();
                else if (tab === "services") loadServiceBans();
                else setActiveTab(tab);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                activeTab === tab ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-600"
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
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 mt-2"
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

        {/* Tier system toggle confirm modal — destructive action isliye confirm liya jaata hai
            Tier system ON karne pe BASIC shops par limits lagti hain, OFF karne pe sab unlimited */}
        {tierConfirm !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h2 className="font-bold mb-2">{tierConfirm ? "Enable Tier System?" : "Disable Tier System?"}</h2>
              <p className="text-sm text-gray-600 mb-3">
                {tierConfirm ? "BASIC plan shops will be restricted:" : "All shops will work without any plan restrictions:"}
              </p>
              {/* Conditional bullet list — enable karne pe restrictions, disable karne pe freedoms */}
              <ul className="space-y-1.5 mb-4 text-sm text-gray-700">
                {tierConfirm ? (
                  <>
                    <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">×</span>Max 2 active services per BASIC shop</li>
                    <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">×</span>Max 2 staff accounts per BASIC shop</li>
                    <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">×</span>Max 5 orders per day per service (2 services = 10 total)</li>
                    <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">×</span>Max 10 menu items per service (BASIC)</li>
                    <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">×</span>No custom intake fields for BASIC shops</li>
                  </>
                ) : (
                  <>
                    <li className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">✓</span>All BASIC shops get unlimited access</li>
                    <li className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">✓</span>No service / staff / order limits enforced</li>
                    <li className="flex gap-2"><span className="text-amber-500 flex-shrink-0">▲</span>BASIC shops already over limit will not be auto-restricted — only new actions will be unrestricted</li>
                  </>
                )}
              </ul>
              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmToggleTierSystem}
                  className={`w-full py-2.5 rounded-xl font-medium text-white ${
                    tierConfirm ? "bg-brand hover:opacity-90" : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  Yes, {tierConfirm ? "enable" : "disable"} tier system
                </button>
                <button onClick={(): void => setTierConfirm(null)} className="w-full bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-sm">
                  Cancel
                </button>
              </div>
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

        {/* Platform settings tab — sirf "settings" tab active hone pe dikhta hai
            Yahan tier system, pricing, custom fields, badges sab configure hote hain */}
        {activeTab === "settings" && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 space-y-3 border-t-4 border-t-slate-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Platform Settings</p>

            {/* Tier system toggle — array me isliye hai ki baad me aur toggles add karna aasan rahe */}
            {[
              { label: "Tier system (BASIC/PAID limits)", desc: "Enforce limits on BASIC shops", val: tierSystemEnabled, toggle: (): void => setTierConfirm(!tierSystemEnabled) },
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

            {/* Pricing section — PAID plan ke liye price aur currency set karna */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-sm font-medium mb-2">PAID subscription price</p>
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
              <p className="text-xs text-gray-400 mt-1">Shown to BASIC shop owners on upgrade button</p>
            </div>

            {/* Bulk plan change section — ek click se saare shops ka plan badlo */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-sm font-medium mb-1">Bulk Plan Change</p>
              <p className="text-xs text-gray-400 mb-3">Convert all shops to BASIC or PAID in one click.</p>
              {/* Result message — bulk operation complete hone ke baad 4 second ke liye dikhata hai */}
              {bulkPlanResult && <p className="text-xs text-emerald-700 font-medium mb-2">{bulkPlanResult}</p>}
              <div className="flex gap-2">
                {/* "All → PAID" button confirm modal kholta hai */}
                <button
                  onClick={(): void => setBulkPlanConfirm("PAID")}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium py-2 rounded-xl transition"
                >
                  All → PAID
                </button>
                {/* "All → BASIC" button confirm modal kholta hai */}
                <button
                  onClick={(): void => setBulkPlanConfirm("BASIC")}
                  className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium py-2 rounded-xl transition"
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
      {planTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold mb-2">
              {planTarget.plan === "PAID" ? "Downgrade to BASIC?" : "Upgrade to PAID?"}
            </h2>
            <p className="text-sm text-gray-600 mb-1">
              Shop: <span className="font-semibold">{planTarget.name}</span>
            </p>
            {/* Downgrade warning (data loss) ya upgrade confirmation — context ke hisaab se */}
            <p className="text-sm text-gray-500 mb-4">
              {planTarget.plan === "PAID"
                ? "Are you sure? Shop will be downgraded to BASIC. All staff will be deleted. " +
                  "All services will be disabled — the shop owner will be logged out and forced to choose 1-2 services on next login."
                : "Payment confirmed? Shop will be upgraded to PAID — all limits removed."}
            </p>
            {/* planMsg: agar pichli attempt fail hui thi toh error dikhega */}
            {planMsg && <p className="text-xs text-red-500 mb-2">{planMsg}</p>}
            <div className="flex flex-col gap-2">
              {/* Button color aur label plan ke hisaab se badalta hai */}
              <button
                onClick={confirmPlanChange}
                className={`w-full py-2.5 rounded-xl font-medium text-white ${
                  planTarget.plan === "PAID" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                }`}
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