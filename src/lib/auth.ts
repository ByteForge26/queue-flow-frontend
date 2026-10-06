import type { AuthDto } from "./types";

// ---- Staff/Admin session (demo-grade, localStorage) ----

// localStorage mein is key ke naam se staff/admin ka auth data save hoga
const AUTH_KEY = "qf.auth";

// Staff/Admin login ke baad backend se mila AuthDto (token + user info)
// localStorage mein save karta hai taaki page refresh pe bhi login rahe
export function saveAuth(auth: AuthDto): void {
  // AuthDto object ko string mein convert karke localStorage mein rakhte hain
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

// localStorage se staff/admin ka auth data padhta hai
// Agar kuch nahi mila ya data corrupt hai toh null return karta hai
export function getAuth(): AuthDto | null {
  const raw: string | null = localStorage.getItem(AUTH_KEY); // string ya null milega

  if (!raw) return null; // pehli baar ya logout ke baad - kuch nahi milega

  try {
    return JSON.parse(raw) as AuthDto; // string ko wapas AuthDto object banao
  } catch {
    // JSON.parse fail ho sakta hai agar data manually corrupt ho gaya ho
    // is case mein null return karo taaki app crash na kare
    return null;
  }
}

// Logout karte waqt call hota hai - localStorage se auth data hata deta hai
export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

// Sirf JWT token return karta hai (puri AuthDto nahi)
// API calls mein Authorization header ke liye use hota hai
export function getToken(): string | null {
  // getAuth() null bhi return kar sakta hai, isliye optional chaining (?.)
  // aur nullish coalescing (??) use ki hai - agar null aaye toh null do
  return getAuth()?.token ?? null;
}

// ---- Customer device order history (no login) ----

// Customers bina login ke order karte hain, isliye unki order history
// sirf is device ke localStorage mein saved hoti hai

// localStorage mein is key se customer ke orders store honge
const ORDERS_KEY = "qf.orders";

// Customer ke ek local order ka shape define karta hai ye interface
// (Staff/Admin ke liye nahi - woh backend pe tracked hote hain)
export interface LocalOrder {
  ticketId: number;       // unique ticket number jo backend ne assign kiya
  trackingToken?: string; // Private tracking key (older saved orders may not have one)
  shopCode: string;       // kis shop ka order hai - filtering ke liye
  sectionCode: string;    // kis section/counter pe - e.g. "BILLING"
  sectionName: string;    // section ka human-readable naam - UI display ke liye
  placedTime: string | null; // order kab place hua (ISO string) - null agar unknown
}

// localStorage se customer ke orders laata hai
// Optional shopCode dene par sirf us shop ke orders filter karke deta hai
export function getLocalOrders(shopCode?: string): LocalOrder[] {
  const raw: string | null = localStorage.getItem(ORDERS_KEY);

  if (!raw) return []; // pehli baar - koi orders nahi hain

  try {
    const all = JSON.parse(raw) as LocalOrder[];

    // agar shopCode diya hai toh sirf us shop ke orders return karo
    // nahi diya toh poori list return karo
    return shopCode
      ? all.filter((o) => o.shopCode?.toLowerCase() === shopCode.toLowerCase())
      : all;
  } catch {
    // corrupt data - empty array do taaki UI crash na kare
    return [];
  }
}

// Nayi order localStorage mein add karta hai
// Duplicate hata deta hai aur list ko 50 tak limit karta hai
export function pushLocalOrder(order: LocalOrder): void {
  const all: LocalOrder[] = getLocalOrders(); // pehle se saved saari orders lo

  // newest first, dedupe by ticketId, keep last 50
  // - nayi order sabse aage rakhte hain (newest first) - UI mein latest upar dikhe
  // - same ticketId wali purani entry hata dete hain (dedupe) - duplicate na ho
  // - slice(0, 50): max 50 orders hi rakhte hain taaki localStorage bhari na ho
  const next: LocalOrder[] = [
    order,
    ...all.filter(
      (o: LocalOrder): boolean => o.ticketId !== order.ticketId
    ),
  ].slice(0, 50);

  localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
}

// ---- Anti-spam: device cooldown + window limit (same browser se rapid orders block) ----

// Koi bhi customer same device se bahut jaldi jaldi order na kare,
// isliye do tarah ki checking hoti hai: cooldown aur window limit

// localStorage keys anti-spam data ke liye
const LAST_ORDER_KEY = "qf.lastOrderAt"; // pichli order ki exact timestamp
const ORDER_TIMES_KEY = "qf.orderTimes"; // last 10 min ke saare order timestamps

// Time constants - inhe change karke spam policy adjust ki ja sakti hai
const COOLDOWN_MS = 30_000; // 30s between orders - ek order ke baad 30 second rukna padega
const WINDOW_MS: number = 10 * 60_000; // 10 min window - 10 minute ki sliding time window
const MAX_IN_WINDOW = 3; // max 3 orders / 10 min from this device

/** true = abhi cooldown me hai (last order ke 30s ke andar). */
// Check karta hai ki pichli order ke baad 30 second guzre hain ya nahi
// agar nahi guzre toh true return karta hai - order block ho jaega
export function inOrderCooldown(): boolean {
  const raw: string | null = localStorage.getItem(LAST_ORDER_KEY); // pichli order ka timestamp (ms)

  if (!raw) return false; // pehli baar order kar raha hai - cooldown nahi hai

  const last: number = Number(raw); // string ko number mein convert karo

  if (Number.isNaN(last)) return false; // corrupt data - let them through

  // Date.now() current time hai milliseconds mein
  // agar difference 30s se kam hai toh cooldown active hai
  return Date.now() - last < COOLDOWN_MS;
}

// Internal helper - last 10 minute ke andar place ki gayi orders ki timestamps laata hai
// Purani (10 min se zyada) automatically filter ho jaati hain - sliding window effect
function recentOrderTimes(): number[] {
  const raw: string | null = localStorage.getItem(ORDER_TIMES_KEY);
  const now: number = Date.now();

  try {
    const all: number[] = raw ? (JSON.parse(raw) as number[]) : [];

    // sirf wahi timestamps rakho jo abhi bhi 10-minute window ke andar hain
    // purani timestamps automatically discard ho jaati hain
    return all.filter((tms: number): boolean => now - tms < WINDOW_MS);
  } catch {
    return []; // corrupt data - empty array do
  }
}

/** true = is device se 10 min me 3 order ho chuke (4th block). */
// Check karta hai ki is device ne last 10 minute mein already 3 orders place ki hain ya nahi
// agar kar chuka hai toh true - order block ho jaega
export function deviceOrderLimitReached(): boolean {
  return recentOrderTimes().length >= MAX_IN_WINDOW;
}

// Successful order placement ke baad call karna zaroori hai
// Ye function do kaam karta hai:
// 1. LAST_ORDER_KEY update karta hai - cooldown reset ke liye
// 2. ORDER_TIMES_KEY mein nayi timestamp add karta hai - window limit tracking ke liye
export function markOrderPlaced(): void {
  const now: number = Date.now(); // current time milliseconds mein

  localStorage.setItem(LAST_ORDER_KEY, String(now)); // cooldown clock reset

  // recentOrderTimes() se already filtered (fresh) list lo, usme nayi timestamp add karo
  const times: number[] = [...recentOrderTimes(), now];

  localStorage.setItem(
    ORDER_TIMES_KEY,
    JSON.stringify(times)
  ); // updated list save karo
}
