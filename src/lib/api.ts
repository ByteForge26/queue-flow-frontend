// ============================================================================
// FILE: api.ts
// ============================================================================
// YE FILE KYA KARTI HAI:
// Poore application ke saare HTTP/network calls ek jagah (single file) mein
// rakhti hai. Iska matlab hai ki agar kabhi URL badalna ho, ya koi header add
// karna ho, to sirf yahan ek jagah change karna padega - baaki components ko
// chhhuna nahi padega.
//
// YE KIS LAYER KA HISSA HAI:
//   api.ts => Backend se baat karne ka ek jagah - saare HTTP calls yahan se
//             jaate hain. Ye "service layer" ya "data access layer" hai.
//
// (Context ke liye baaki files:)
//   main.tsx   : React app ka entry point - browser mein base pehle yahi
//               load hota hai
//   App.tsx    : Root component - saari routes aur global providers yahan hain
//   .index.css : Global styles - poori app pe apply hoti hain
//   auth.ts    : Login/logout/token store karne ka logic (getToken/clearAuth)
//   types.ts   : Poori app ke TypeScript types/interfaces - data ka shape
//               define karta hai
//   countries.ts: Country/city data - dropdowns ke liye
//   schedule.ts : Shop timing/schedule related utility functions
//
// KAUN SE PAGES/COMPONENTS IS FILE KO USE KARTE HAIN:
//   - Customer-facing pages : ShopPage, TicketPage, HistoryPage, etc.
//   - Staff pages            : StaffDashboard, QueuePage, etc.
//   - Admin pages            : AdminDashboard, ShopSettings, StaffManagement, etc.
//   - SuperAdmin pages       : SuperAdminPanel, etc.
//
// IMPORTANT CONCEPTS (simple Hinglish mein):
//
// 1. AXIOS:
//    Axios ek popular HTTP client library hai (browser ka built-in fetch()
//    se zyada convenient). Ye automatically JSON parse karta hai aur error
//    handling easy banata hai.
//    `axios.create({ baseURL })` se ek custom instance banta hai jisme
//    default settings (jaise base URL) pehle se set hoti hain.
//
// 2. INTERCEPTORS (request/response):
//    Interceptors middleware ki tarah kaam karte hain - har request jaane se
//    pehle ya har response aane ke baad ek function run hota hai.
//    - Request interceptor: yahan hum JWT token header mein lagaate hain.
//    - Response interceptor: yahan hum 401 (unauthorized) error pakad ke
//      user ko logout/login page pe redirect karte hain.
//
// 3. JWT (JSON Web Token):
//    Login ke baad server ek encrypted token deta hai. Ye token hum har
//    request ke Authorization header mein bhejte hain taaki server jaane ki
//    "yeh authenticated user hai". Format hota hai: "Bearer <token>"
//
// 4. async/await:
//    JavaScript mein network calls asynchronous hoti hain (time lagta hai).
//    `async function` + `await` se hum code ko readable tarike se likh sakte
//    hain bina nested callbacks ke. Agar error aaye to `try/catch` se pakad
//    sakte hain.
//
// 5. TypeScript generics (Promise<SomeType>):
//    `Promise<TicketDto>` matlab: "ye function ek Promise return karta hai
//    jo resolve hone pe TicketDto type ka data dega." Isse TypeScript ko pata
//    chalta hai return value ka shape kya hoga.
//
// 6. DO ALAG AXIOS INSTANCES (api vs saApi):
//    - `api`   : Normal users (customers, staff, admin) ke liye. Base URL
//                `/api` hai. Token `auth.ts` se aata hai.
//    - `saApi` : SuperAdmin ke liye alag instance. Base URL `/api/superadmin`
//                hai. Token `localStorage` mein `sa_token` key pe store hota
//                hai (normal user ke token se alag rakha gaya hai security
//                ke liye).
// ============================================================================

// IMPORT BLOCK PDF ke screenshot mein IntelliJ folding ki wajah se hidden tha.
// Neeche imports visible code ke basis par reconstruct kiye gaye hain.
import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { getToken, clearAuth } from "./auth";
import type {
  AuthDto,
  CityDto,
  ShopDto,
  LocalOrder,
  CreateTicketCommand,
  DashboardStatsDto,
  FormConfigDto,
  FormFieldDto,
  HistoryDto,
  LoginCommand,
  MenuItemCommand,
  MenuItemDto,
  OwnerSignupCommand,
  PlatformConfigDto,
  ShopDetailDto,
  ShopSummaryDto,
  StaffStatsDto,
  StaffUserDto,
  SuperAdminShopDto,
  TicketDto,
  TicketStatus,
  UpdateShopCommand,
} from "./types";

// ============================================================================
// MAIN API INSTANCE
// ============================================================================
// Ye saare regular (non-superadmin) API calls ke liye use hota hai.
// baseURL "/api" matlab har request automatically "/api/..." pe jaayegi.
// Example: api.get("/public/config") => GET /api/public/config
const api: AxiosInstance = axios.create({ baseURL: "/api" });

// Har request pe JWT (agar logged in) attach karo
// Request interceptor: har HTTP call jaane se PEHLE ye function chalega.
// Agar user logged in hai (token hai), to "Authorization: Bearer <token>"
// header add karo - isse backend jaanta hai ki request kaun kar raha hai.
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig<any>): InternalAxiosRequestConfig<any> => {
    const token: string | null = getToken(); // auth.ts se stored token lo
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // standard JWT format
    }
    return config; // modified config wapas karo, tabhi request aage jayegi
  }
);

// 401 -> session khatam, login pe bhejo. (signup/login khud handle karte hain)
// Response interceptor: har HTTP response aane ke BAAD ye function chalega.
// - Pehla argument: success (2xx) responses ke liye - yahan kuch nahi karna,
//   seedha response wapas karo.
// - Doosra argument: error responses ke liye - 401 ka matlab "unauthorized",
//   yaani token expired ya invalid. Tab user ka session clear karo aur
//   staff/admin ko login page pe redirect karo.
api.interceptors.response.use(
  (res: AxiosResponse<any, any>): AxiosResponse<any, any> => res,
  (error: any): Promise<never> => {
    const status: any = error?.response?.status; // HTTP status code (401, 403, etc.)
    const url: string = error?.config?.url ?? ""; // kaun sa URL fail hua

    if (status === 401 && !url.startsWith("/auth/")) {
      // /auth/ URLs (login, signup) ko skip karo - wahan 401 expected hai
      // (wrong password dene pe), aur logout loop nahi banana hai
      clearAuth(); // auth.ts: token aur user info localStorage se hata do

      if (
        window.location.pathname.startsWith("/staff") ||
        window.location.pathname.startsWith("/admin")
      ) {
        // Sirf staff/admin pages se redirect karo - customer pages pe
        // logged-out state gracefully handle hoti hai bina redirect ke
        window.location.href = "/shop";
      }
    }

    return Promise.reject(error); // error aage propagate karo taaki caller handle kar sake
  }
);

// ============================================================================
// SUPER-ADMIN API INSTANCE
// ============================================================================
// SuperAdmin ke liye ALAG axios instance. Iski zaroorat isliye hai kyunki:
// 1. Base URL alag hai (/api/superadmin)
// 2. Token alag localStorage key ("sa_token") mein store hota hai
// 3. Normal user ka token aur superadmin ka token mix nahi hona chahiye
const saApi: AxiosInstance = axios.create({ baseURL: "/api/superadmin" });

// SuperAdmin request interceptor: sa_token ko Authorization header mein lagao
saApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig<any>): InternalAxiosRequestConfig<any> => {
    const token: string | null = localStorage.getItem("sa_token"); // sa_token: superadmin-specific token
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  }
);

// ============================================================================
// SUPER-ADMIN FUNCTIONS
// ============================================================================

// SuperAdmin ka login - username/password bhejo, JWT token wapas milta hai.
// Caller is token ko "sa_token" key mein localStorage mein save karega.
export async function superAdminLogin(username: string, password: string): Promise<string> {
  const { data } = await saApi.post("/login", { username, password });
  return data.token; // sirf token string return karo (poora response nahi)
}

// Saari registered shops ki list - SuperAdmin dashboard ke liye
export async function superAdminListShops(): Promise<SuperAdminShopDto[]> {
  const { data } = await saApi.get("/shops");
  return data;
}

// Kisi bhi shop owner ka password reset karo (shopCode se identify karke)
export async function superAdminResetPassword(
  shopCode: string,
  newPassword: string
): Promise<void> {
  await saApi.patch(`/shops/${shopCode}/password`, { newPassword });
  // void return: hume response data ki zaroorat nahi, sirf success/failure kaafi hai
}

// Kisi shop ka QR code image fetch karo (binary blob ke roop mein)
// responseType: "blob" - axios ko batao ki response JSON nahi, binary data hai
// URL.createObjectURL: blob se ek temporary browser URL banao jo <img src> mein use ho sake
export async function superAdminFetchQr(shopCode: string): Promise<string> {
  const res: AxiosResponse<any, any> = await saApi.get(`/shops/${shopCode}/qr`, {
    responseType: "blob",
  });
  return URL.createObjectURL(res.data); // e.g. "blob:http://localhost:3000/abc-123"
}

// ============================================================================
// PUBLIC (CUSTOMER-FACING) FUNCTIONS
// ============================================================================
// Yahan koi authentication nahi chahiye - customers bina login ke access kar sakte hain.

// Platform-level configuration fetch karo (features on/off, pricing, etc.)
// CustomerApp ka starting point - pehle yahi call hoti hai.
export async function getPlatformConfig(): Promise<PlatformConfigDto> {
  const { data } = await api.get("/public/config");
  return data;
}

// Shop ko open ya band karo (admin toggle ke liye)
// null body isliye kyunki hum sirf query param bhej rahe hain (actual body nahi)
export async function setShopOpen(value: boolean): Promise<void> {
  await api.patch("/admin/shop/open", null, { params: { value } });
}

// SuperAdmin: platform-wide custom fields feature enable/disable karo
export async function superAdminSetCustomFieldsEnabled(value: boolean): Promise<void> {
  await saApi.patch("/config/custom-fields-enabled", null, { params: { value } });
}

// SuperAdmin: tier/plan system feature enable/disable karo
export async function superAdminSetTierSystemEnabled(value: boolean): Promise<void> {
  await saApi.patch("/config/tier-system-enabled", null, { params: { value } });
}

// SuperAdmin: UI mein plan info icon dikhao ya chhupao
export async function superAdminSetShowPlanInfoIcon(value: boolean): Promise<void> {
  await saApi.patch("/config/show-plan-info-icon", null, { params: { value } });
}

// SuperAdmin: UI mein plan badge dikhao ya chhupao
export async function superAdminSetShowPlanBadge(value: boolean): Promise<void> {
  await saApi.patch("/config/show-plan-badge", null, { params: { value } });
}

// SuperAdmin: paid plan ki price aur currency set karo
// price string hai (float precision issues se bachne ke liye)
export async function superAdminSetPaidPrice(
  price: string,
  currency: string
): Promise<void> {
  await saApi.patch("/config/paid-price", null, { params: { price, currency } });
}

// SuperAdmin: kisi specific shop ka plan change karo
// keepSectionCodes: plan downgrade pe kaunse sections rakhne hain uski list
export async function superAdminSetPlan(
  shopCode: string,
  plan: string,
  keepSectionCodes: string[]
): Promise<SuperAdminShopDto> {
  const { data } = await saApi.patch(`/shops/${shopCode}/plan`, {
    plan,
    keepSectionCodes,
  });
  return data; // updated shop info wapas milti hai
}

// Diye gaye country ke cities ki list fetch karo (customer signup dropdown ke liye)
export async function getCities(country: string): Promise<CityDto[]> {
  const { data } = await api.get("/public/cities", { params: { country } });
  return data;
}

// Shops dhundho - country, city, pincode ya direct shop code se filter kar sakte ho
// Optional params: sirf jo values diye hain wahi query string mein jaayenge
export async function searchShops(
  country?: string,
  city?: string,
  pincode?: string,
  code?: string
): Promise<ShopSummaryDto[]> {
  const params: Record<string, string> = {}; // pehle empty object banao
  // Sirf defined values add karo - undefined values URL mein "undefined" string
  // ban jaati hain jo backend ko confuse karti hain
  if (country) params.country = country;
  if (city) params.city = city;
  if (pincode) params.pincode = pincode;
  if (code) params.code = code;
  const { data } = await api.get("/public/shops", { params });
  return data;
}

// Kisi customer ki us shop mein purani visits/tickets ki history
// phone aur name dono se identify karte hain (koi unique ID nahi customer ke paas)
export async function getCustomerHistory(
  shopCode: string,
  phone: string,
  name: string
): Promise<HistoryDto> {
  const { data } = await api.get(`/public/shop/${shopCode}/history`, {
    params: { phone, name }, // GET request mein body nahi hoti, isliye params use karo
  });
  return data;
}

// Shop ke custom form ka configuration fetch karo - kaunse fields dikhane hain
// customer ko ticket lene se pehle (e.g., "service type", "preferred time", etc.)
export async function getFormConfig(code: string): Promise<FormConfigDto> {
  const { data } = await api.get(`/public/business/${code}/form-config`);
  return data;
}

// Shop ki basic public details fetch karo (naam, timing, sections, etc.)
// Customer-facing pages jaise MyOrdersPage isko use karte hain
export async function getShop(code: string): Promise<ShopDto> {
  const { data } = await api.get(`/public/shop/${code}`);
  return data;
}

// Browser localStorage se is shop ke liye saved local orders padho
// Server call nahi hai - synchronous function hai
export function getLocalOrders(shopCode: string): LocalOrder[] {
  try {
    const raw = localStorage.getItem(`localOrders:${shopCode}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Naya order localStorage mein save karo (createTicket ke baad call karna)
export function saveLocalOrder(shopCode: string, order: LocalOrder): void {
  const existing = getLocalOrders(shopCode);
  const updated = [order, ...existing].slice(0, 20);
  localStorage.setItem(`localOrders:${shopCode}`, JSON.stringify(updated));
}

// Naya ticket banao - customer queue mein join karta hai. Is function se
// cmd mein customer ka naam, phone, selected fields, etc. hota hai.
export async function createTicket(
  code: string,
  cmd: CreateTicketCommand
): Promise<TicketDto> {
  const { data } = await api.post(`/public/business/${code}/tickets`, cmd);
  return data; // naya ticket milta hai jisme queue number, status, etc. hota hai
}

// Ticket ID se ek specific ticket ki current status fetch karo
// Customer "Track my ticket" page pe yahi use karta hai
export async function getTicket(id: number): Promise<TicketDto> {
  const { data } = await api.get(`/public/tickets/${id}`);
  return data;
}

// Customer apna ticket cancel kar sakta hai (queue se hata sakta hai)
export async function cancelTicket(id: number): Promise<TicketDto> {
  const { data } = await api.post(`/public/tickets/${id}/cancel`);
  return data; // cancelled ticket ki updated info wapas milti hai
}

// ============================================================================
// AUTH FUNCTIONS (Login / Signup)
// ============================================================================

// Staff ya admin ka login - credentials bhejo, JWT token + user info wapas milta hai
// AuthDto mein token aur user role hota hai
export async function login(cmd: LoginCommand): Promise<AuthDto> {
  const { data } = await api.post("/auth/login", cmd);
  return data;
}

// Naye shop owner ka signup - shop details ke saath account banao
// Signup ke baad directly logged in ho jata hai (AuthDto return hota hai)
export async function ownerSignup(cmd: OwnerSignupCommand): Promise<AuthDto> {
  const { data } = await api.post("/auth/owner/signup", cmd);
  return data;
}

// ============================================================================
// STAFF FUNCTIONS
// ============================================================================
// JWT interceptor automatically token attach karta hai - upar dekho

// Kisi section ki current queue fetch karo (waiting/serving tickets)
// Staff dashboard pe real-time queue dikhane ke liye
export async function getQueue(sectionCode: string): Promise<TicketDto[]> {
  const { data } = await api.get(`/staff/${sectionCode}/queue`);
  return data;
}

// Kisi ticket ka status update karo (e.g., WAITING -> SERVING -> DONE)
// Optional payment info bhi attach kar sakte hain ek saath
// payment?.paymentReceived ?? null : agar payment info nahi di to null bhejo
export async function updateStatus(
  sectionCode: string,
  ticketId: number,
  status: TicketStatus,
  payment?: { paymentReceived?: number | null; paymentNote?: string | null }
): Promise<TicketDto> {
  const { data } = await api.patch(`/staff/${sectionCode}/tickets/${ticketId}/status`, {
    status,
    paymentReceived: payment?.paymentReceived ?? null, // ?? null: undefined ko null mein convert karo
    paymentNote: payment?.paymentNote ?? null,
  });
  return data;
}

// Ticket ko "payment pending" state mein mark karo - reason bhi note karo
// Ye special state hai jab service ho gayi lekin payment abhi pending hai
export async function markPaymentPending(
  sectionCode: string,
  ticketId: number,
  reason: string
): Promise<TicketDto> {
  const { data } = await api.patch(
    `/staff/${sectionCode}/tickets/${ticketId}/payment-pending`,
    { reason }
  );
  return data;
}

// Aaj ke din ki statistics fetch karo - total served, avg wait time, etc.
// Staff dashboard ka summary card yahi data dikhata hai
export async function getStats(sectionCode: string): Promise<DashboardStatsDto> {
  const { data } = await api.get(`/staff/${sectionCode}/stats/today`);
  return data;
}

// Future (scheduled/upcoming) tickets ki list - aaj ke baad ke appointments
export async function getFutureQueue(sectionCode: string): Promise<TicketDto[]> {
  const { data } = await api.get(`/staff/${sectionCode}/queue/future`);
  return data;
}

// Section ki poori ticket history fetch karo (completed/cancelled tickets)
export async function getStaffHistory(sectionCode: string): Promise<HistoryDto> {
  const { data } = await api.get(`/staff/${sectionCode}/history`);
  return data;
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================
// (Shop JWT se identify hoti hai - sectionCode ya shopCode URL mein nahi dena)

// Shop ki detailed settings fetch karo (name, address, schedule, sections, etc.)
// Admin settings page ka main data source
export async function getShopDetails(): Promise<ShopDetailDto> {
  const { data } = await api.get("/admin/shop/details");
  return data;
}

// Shop ka QR code binary blob ke roop mein fetch karo
// Blob: raw binary data - image file ki tarah. Download karne ke liye useful.
export async function getAdminQrBlob(): Promise<Blob> {
  const res: AxiosResponse<any, any> = await api.get("/admin/shop/qr", {
    responseType: "blob",
  });
  return res.data;
}

// Shop ke QR code ka shareable URL string fetch karo
// Blob create karne ki jagah sirf URL string chahiye to yahi use karo
export async function getAdminQrUrl(): Promise<string> {
  const { data } = await api.get("/admin/shop/qr-url");
  return data;
}

// Basic plan pe kaunse sections active rakhne hain wo select karo
// keepSectionCodes: jin sections ko rakho, baaki ko remove/disable karo
export async function selectBasicServices(
  keepSectionCodes: string[]
): Promise<ShopDetailDto> {
  const { data } = await api.post("/admin/shop/select-basic-services", {
    keepSectionCodes,
  });
  return data;
}

// Shop ki details update karo (naam, address, timings, etc.)
// UpdateShopCommand mein saare updatable fields hain
export async function updateShopDetails(
  cmd: UpdateShopCommand
): Promise<ShopDetailDto> {
  const { data } = await api.patch("/admin/shop/details", cmd);
  return data;
}

// Poori orders history CSV file ke roop mein download karo
// Blob return hota hai - caller ise file download trigger karne ke liye use karega
export async function exportOrdersCsv(): Promise<Blob> {
  const res: AxiosResponse<any, any> = await api.get("/admin/shop/export-csv", {
    responseType: "blob",
  }); // CSV file = binary
  return res.data;
}

// Staff members ki analytics fetch karo - kaun kitna kaam kiya, performance, etc.
export async function getStaffAnalytics(): Promise<StaffStatsDto[]> {
  const { data } = await api.get("/admin/shop/staff-analytics");
  return data;
}

// SuperAdmin: ek saath saari shops ka plan change karo (bulk operation)
// Return: kitni shops update hui aur unka naya plan kya hai
export async function superAdminBulkSetPlan(
  plan: string
): Promise<{ updated: number; plan: string }> {
  const { data } = await saApi.patch(`/shops/bulk-plan?plan=${plan}`);
  return data;
}

// SuperAdmin: globally banned services ki list fetch karo
// import("./types") - inline dynamic import, types file se GlobalBanStatusDto use karo
export async function superAdminGetServiceBans(): Promise<import("./types").GlobalBanStatusDto> {
  const { data } = await saApi.get("/service-bans");
  return data;
}

// SuperAdmin: kisi specific service type ko globally ban karo
// type: service type string (e.g., "QUEUE", "APPOINTMENT")
export async function superAdminBanService(
  type: string
): Promise<import("./types").GlobalBanStatusDto> {
  const { data } = await saApi.post(`/service-bans/${type}`);
  return data;
}

// SuperAdmin: kisi banned service type ko unban karo (ban hatao)
export async function superAdminUnbanService(
  type: string
): Promise<import("./types").GlobalBanStatusDto> {
  const { data } = await saApi.delete(`/service-bans/${type}`);
  return data;
}

// SuperAdmin: audit log fetch karo - kaun ne kya kiya, kab kiya
// Security aur compliance ke liye useful
export async function superAdminAuditLog(): Promise<import("./types").AuditLogEntryDto[]> {
  const { data } = await saApi.get("/audit-log");
  return data;
}

// SuperAdmin: currently locked IP addresses ki list - brute force protection
export async function superAdminGetLockedIps(): Promise<string[]> {
  const { data } = await saApi.get("/locked-ips");
  return data;
}

// SuperAdmin: kisi IP address ko lock manually hatao
// encodeURIComponent: IP address mein dots (.) hote hain jo URL mein safe encode karna zaroori hai
export async function superAdminClearIpLock(ip: string): Promise<void> {
  await saApi.delete(`/locked-ips/${encodeURIComponent(ip)}`); // "192.168.1.1" -> "192.168.1.1" (dots safe hain, but IPv6 mein colons hote hain)
}

// Admin ka overview data - sections, staff count, today's summary, plan info, etc.
// Admin dashboard ka main landing page yahi data use karta hai
export async function getAdminOverview(): Promise<import("./types").AdminOverviewDto> {
  const { data } = await api.get("/admin/shop/overview");
  return data;
}

// Admin ke liye shop ki poori ticket history
export async function getAdminHistory(): Promise<HistoryDto> {
  const { data } = await api.get("/admin/shop/history");
  return data;
}

// Naya section (queue/service type) add karo shop mein
// industryType: "QUEUE", "APPOINTMENT", ya koi custom type - section ka behavior decide karta hai
export async function addSection(
  industryType: string
): Promise<import("./types").AdminOverviewDto> {
  const { data } = await api.post("/admin/sections", { industryType });
  return data; // updated overview milti hai naye section ke saath
}

// Section ko active ya inactive karo (band karo bina delete kiye)
// value=false karne pe staff us section mein naye tickets nahi le sakti
export async function setSectionActive(
  sectionCode: string,
  value: boolean
): Promise<import("./types").AdminOverviewDto> {
  const { data } = await api.patch(`/admin/sections/${sectionCode}/active`, null, {
    params: { value }, // null body + query param pattern (simple toggle ke liye common pattern)
  });
  return data;
}

// Section permanently delete karo
// Saavdhani: ye saara section data hata deta hai
export async function deleteSection(
  sectionCode: string
): Promise<import("./types").AdminOverviewDto> {
  const { data } = await api.delete(`/admin/sections/${sectionCode}`);
  return data;
}

// Saare staff users ki list fetch karo (admin ke shop ke liye)
export async function getStaffUsers(): Promise<StaffUserDto[]> {
  const { data } = await api.get("/admin/staff");
  return data;
}

// Naya staff user banao - username, password aur assigned sections ke saath
// sectionCodes: ye staff member kaunse sections manage kar sakta hai
export async function createStaff(cmd: {
  username: string;
  password: string;
  sectionCodes: string[];
}): Promise<StaffUserDto> {
  const { data } = await api.post("/admin/staff", cmd);
  return data;
}

// Staff user delete karo (woh login nahi kar payega)
export async function deleteStaff(staffUsername: string): Promise<void> {
  await api.delete(`/admin/staff/${staffUsername}`);
}

// Admin apna khud ka password change kare
// Security: purana password bhi dena padta hai verification ke liye
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.patch("/admin/password", { currentPassword, newPassword });
}

// Admin kisi staff member ka password reset kare (bina purana jaane)
// Ye admin-only operation hai - staff khud nahi kar sakta
export async function resetStaffPassword(
  staffUsername: string,
  newPassword: string
): Promise<void> {
  await api.patch("/admin/staff/password", { staffUsername, newPassword });
}

// Staff member ke assigned sections update karo
// sectionCodes: nayi list - purani list replace ho jayegi
export async function assignStaffSections(
  staffUsername: string,
  sectionCodes: string[]
): Promise<StaffUserDto> {
  const { data } = await api.patch("/admin/staff/sections", {
    staffUsername,
    sectionCodes,
  });
  return data; // updated staff user info wapas milti hai
}

// ============================================================================
// ADMIN MENU MANAGEMENT
// ============================================================================
// (Menu items = services/products jo customer ticket lene pe select karta hai)
// ============================================================================

// Kisi section ke saare menu items fetch karo
export async function getMenu(sectionCode: string): Promise<MenuItemDto[]> {
  const { data } = await api.get(`/admin/sections/${sectionCode}/menu`);
  return data;
}

// Naya menu item add karo ek section mein (e.g., "Haircut", "Beard Trim")
export async function addMenuItem(
  sectionCode: string,
  cmd: MenuItemCommand
): Promise<MenuItemDto> {
  const { data } = await api.post(`/admin/sections/${sectionCode}/menu`, cmd);
  return data;
}

// Existing menu item update karo (naam, price, description, etc.)
// itemId se specific item identify hoti hai (sectionCode ki zaroorat nahi yahan)
export async function updateMenuItem(
  itemId: number,
  cmd: MenuItemCommand
): Promise<MenuItemDto> {
  const { data } = await api.patch(`/admin/menu/${itemId}`, cmd);
  return data;
}

// Menu item ko active ya inactive toggle karo
// Inactive items customer ko nahi dikhenge - delete kiye bina hide karne ke liye
export async function setMenuItemActive(
  itemId: number,
  value: boolean
): Promise<MenuItemDto> {
  const { data } = await api.patch(`/admin/menu/${itemId}/active`, null, {
    params: { value },
  });
  return data;
}

// Menu item permanently delete karo
export async function deleteMenuItem(itemId: number): Promise<void> {
  await api.delete(`/admin/menu/${itemId}`);
}

// ============================================================================
// ADMIN FIELD MANAGEMENT
// ============================================================================
// (Custom form fields - admin define karta hai, customer ticket lene pe fill karta hai)
// ============================================================================

// Kisi section ke saare custom form fields fetch karo
// FormFieldDto mein field ka type (text, select, etc.), label, options, etc. hota hai
export async function getFields(sectionCode: string): Promise<FormFieldDto[]> {
  const { data } = await api.get(`/admin/sections/${sectionCode}/fields`);
  return data;
}

// Naya custom field add karo section ke form mein
// e.g., "Vehicle Number", "Preferred Stylist", "Appointment Time"
export async function addField(
  sectionCode: string,
  cmd: import("./types").FieldCommand
): Promise<FormFieldDto> {
  const { data } = await api.post(`/admin/sections/${sectionCode}/fields`, cmd);
  return data;
}

// Existing field ki settings update karo (label, options, required/optional, etc.)
export async function updateField(
  fieldId: number,
  cmd: import("./types").FieldCommand
): Promise<FormFieldDto> {
  const { data } = await api.patch(`/admin/fields/${fieldId}`, cmd);
  return data;
}

// Field ko active ya inactive toggle karo
// Inactive fields customer form mein nahi dikhenge
export async function setFieldActive(
  fieldId: number,
  value: boolean
): Promise<FormFieldDto> {
  const { data } = await api.patch(`/admin/fields/${fieldId}/active`, null, {
    params: { value },
  });
  return data;
}

// Custom field permanently delete karo
export async function deleteField(fieldId: number): Promise<void> {
  await api.delete(`/admin/fields/${fieldId}`);
}
