// ============================================================
// ui.tsx
// Chhote reusable UI components — Card, Button, StatusBadge, Spinner.
// ============================================================

// ReactNode: React ka built-in type — iska matlab hai "kuch bhi jo React render
// kar sake" — jaise JSX, string, number, ya null. Children prop ke liye use hota hai.
import type { ReactNode } from "react";

// TicketStatus: Ek TypeScript union type hai jo ek order/ticket ki possible
// states define karta hai (PLACED, ACCEPTED, IN_PROGRESS, READY, COMPLETED, CANCELLED).
// Ye types.ts file se aata hai taaki poori app mein consistent rahe.
import type { TicketStatus } from "../lib/types";

// useT: Ye custom hook hai jo current selected language ke hisaab se
// translation function return karta hai. Isse hum UI text ko Hindi/English/etc.
// mein dikha sakte hain bina hardcode kiye.
import { useT } from "../i18n/LanguageContext";

// ============================================================
// COMPONENT: Card
// ------------------------------------------------------------
// KYA KARTA HAI:
//   Ek styled white rounded box (card) render karta hai jo kisi bhi
//   content ko wrap kar sakta hai — jaise order details, menu item info, etc.
//
// PROPS:
//   - children  : Card ke andar jo bhi content render karna ho (required)
//                 Kuch bhi ho sakta hai — text, buttons, images, aur components.
//   - className : Extra Tailwind CSS classes agar parent ko aur styling add
//                 karni ho (optional, default empty string "").
//   - onClick   : Agar card clickable banana ho to ye function pass karo.
//                 Optional hai — nahi diya to card sirf display element rahega.
//
// USE CASE EXAMPLE:
//   <Card onClick={() => openDetails(order)}>
//     <p>{order.title}</p>
//   </Card>
// ============================================================
export function Card({
  children,
  className = "",
  onClick,
}: {
  // children: Card ke andar render hone wala koi bhi React content
  children: ReactNode;
  // className: Optional extra CSS classes — default empty string taaki
  // template literal mein error na aaye jab className pass na ho
  className?: string;
  // onClick: Optional click handler — agar diya to card ek clickable element
  // ban jata hai (jaise ek selectable order card)
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      // Base styles: white background, rounded corners (rounded-2xl),
      // halki shadow (shadow-sm), light border, aur internal padding (p-5).
      // ${className} se parent ki extra classes merge ho jaati hain.
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}
    >
      {/* children yahan render hoga — Card ke andar jo bhi content diya */}
      {children}
    </div>
  );
}

// ============================================================
// COMPONENT: Button
// ------------------------------------------------------------
// KYA KARTA HAI:
//   Ek styled clickable button render karta hai. Iske paas 4 alag
//   "variant" hain jo alag-alag use cases ke liye alag colors dete hain.
//
// PROPS:
//   - children  : Button ke andar dikhne wala text ya icon (required)
//   - onClick   : Button press hone par kya karna hai (optional)
//   - disabled  : true karne par button gray ho jata hai aur click nahi
//                 hota — form submit hone ke baad ya loading ke waqt use karo
//   - variant   : Button ka visual style (optional, default "primary"):
//                   "primary" — brand color (app ka main color), white text
//                   "ghost"   — light gray background, dark text — secondary actions
//                   "success" — green — confirm/complete actions ke liye
//                   "staff"   — teal — staff-specific actions ke liye
//   - className : Optional extra CSS classes for fine-tuning
//
// USE CASE EXAMPLE:
//   <Button variant="success" onClick={handleAccept}>Accept Order</Button>
//   <Button variant="ghost" onClick={handleCancel} disabled={isLoading}>Cancel</Button>
// ============================================================
export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
}: {
  // children: Button label ya icon — jo user ko button par dikhega
  children: ReactNode;
  // onClick: Button click hone par call hoga — optional kyunki kabhi kabhi
  // button type="submit" hota hai aur form ko handle karna hota hai
  onClick?: () => void;
  // disabled: Button ko inactive banana ke liye — loading state ya
  // validation fail hone par use karo
  disabled?: boolean;
  // variant: Button ka color theme — 4 predefined options hain.
  // Default "primary" hai taaki har jagah explicitly nahi likhna pade.
  variant?: "primary" | "ghost" | "success" | "staff";
  // className: Extra Tailwind classes — size ya margin adjust karne ke liye
  className?: string;
}) {
  // styles: Har variant ke liye corresponding Tailwind CSS classes ka map.
  // Record<string, string> matlab: keys strings hain, values bhi strings hain.
  // Ye object ek lookup table ki tarah kaam karta hai — variant naam deke
  // uski CSS class string milti hai.
  const styles: Record<string, string> = {
    // primary: App ka main brand color — most important actions ke liye
    primary: "bg-brand text-white hover:bg-brand-dark",
    // ghost: Subtle gray button — secondary ya less important actions ke liye
    ghost: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    // success: Green button — kuch complete ya confirm karne ke liye
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    // staff: Teal button — staff dashboard mein use hone wale actions ke liye
    staff: "bg-teal-600 text-white hover:bg-teal-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      // Base styles sabke liye common hain: padding, rounded corners, font weight,
      // smooth color transition, aur disabled state styles (opacity kam, pointer disabled).
      // ${styles[variant]} se variant ke hisaab se sahi color class inject hoti hai.
      // ${className} se parent ki custom classes merge ho jaati hain.
      className={`px-4 py-2.5 rounded-xl font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ============================================================
// STATUS_STYLE: Ticket Status ke liye Color Map
// ------------------------------------------------------------
// KYA HAI:
//   Ye ek constant object hai jo har possible TicketStatus ke liye
//   Tailwind CSS classes store karta hai. StatusBadge component ise
//   use karta hai taaki har status ko alag color mein dikhaya ja sake.
//
// KYUN ALAG RAKHA:
//   Component ke bahar define kiya taaki har render par naya object
//   create na ho — ye optimization hai (performance ke liye).
//
// COLOR LOGIC:
//   PLACED      — Amber/yellow  : Naya order, abhi kuch nahi hua
//   ACCEPTED    — Blue          : Staff ne order accept kar liya
//   IN_PROGRESS — Indigo/purple : Kitchen mein ban raha hai
//   READY       — Green         : Order taiyar hai, pickup ke liye
//   COMPLETED   — Gray          : Order deliver/complete ho gaya
//   CANCELLED   — Red           : Order cancel ho gaya
// ============================================================
const STATUS_STYLE: Record<TicketStatus, string> = {
  // PLACED: Amber — order abhi sirf place hua hai, staff ne dekha nahi
  PLACED: "bg-amber-100 text-amber-800",
  // ACCEPTED: Blue — staff ne order accept kar liya, kaam shuru hoga
  ACCEPTED: "bg-blue-100 text-blue-800",
  // IN_PROGRESS: Indigo — actively ban raha hai
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  // READY: Green — order taiyar, customer pick up kar sakta hai
  READY: "bg-emerald-100 text-emerald-800",
  // COMPLETED: Gray (muted) — done and dusted, archived jaisa feel
  COMPLETED: "bg-gray-200 text-gray-600",
  // CANCELLED: Red — order cancel ho gaya
  CANCELLED: "bg-red-100 text-red-700",
};

// ============================================================
// COMPONENT: StatusBadge
// ------------------------------------------------------------
// KYA KARTA HAI:
//   Ek small colored "pill" (rounded tag) render karta hai jo
//   ek ticket/order ka current status dikhata hai.
//   Jaise: [In Progress] [Ready] [Cancelled]
//
// PROPS:
//   - status: TicketStatus type ka value — order ka current state.
//             Ye value STATUS_STYLE map se color dhundhta hai aur
//             translation function se human-readable label nikalta hai.
//
// IMPORTANT:
//   - useT() hook yahan isliye use hota hai taaki status label
//     current language mein show ho (e.g., Hindi mein "तैयार है" ya
//     English mein "Ready"). Translation key format hai: "status.READY" etc.
//
// USE CASE EXAMPLE:
//   <StatusBadge status={ticket.status} />
// ============================================================
export function StatusBadge({ status }: { status: TicketStatus }) {
  // useT() — current language ka translation function deta hai.
  // t("status.READY") jaisi call karne par "Ready" ya translated string milti hai.
  const t = useT();

  return (
    // span use kiya hai kyunki ye inline element hai — text ke saath
    // flow mein fit ho jata hai bina line break ke.
    // STATUS_STYLE[status] — status ke hisaab se background aur text color inject karta hai.
    // rounded-full — corners bilkul round karta hai (pill shape ke liye).
    // text-xs font-semibold — chhota bold text, badge jaisa lagta hai.
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {/* t(`status.${status}`) — dynamic translation key banata hai.
          Example: status="READY" → key="status.READY" → "Ready" ya "तैयार" */}
      {t(`status.${status}`)}
    </span>
  );
}

// ============================================================
// COMPONENT: Spinner
// ------------------------------------------------------------
// KYA KARTA HAI:
//   Ek animated loading indicator dikhata hai — ek ghumta hua circle.
//   Jab bhi data fetch ho raha ho ya koi async operation chal raha ho,
//   user ko ye dikhao taaki wo samjhe ki kuch ho raha hai.
//
// PROPS:
//   - Koi props nahi — ye fully self-contained component hai.
//     Sirf import karo aur <Spinner /> likh do.
//
// USE CASE EXAMPLE:
//   {isLoading ? <Spinner /> : <OrderList orders={orders} />}
// ============================================================
export function Spinner() {
  return (
    // Outer div: flex layout se horizontally center karta hai spinner ko.
    // py-10 — upar neeche spacing taaki spinner crowded na lage.
    <div className="flex justify-center py-10">
      {/* Inner div: actual spinning circle.
          h-8 w-8 — fixed 32px size ka circle.
          border-2 — 2px ki border.
          border-brand — border ka color app ka brand color hai (poora circle).
          border-t-transparent — top side ki border transparent hai — isse ek
            "gap" banta hai jo spin hote waqt loading effect deta hai.
          rounded-full — div ko perfect circle banata hai.
          animate-spin — Tailwind ka built-in CSS animation jo infinite rotation
            karta hai — isi se "spinning" effect aata hai. */}
      <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}