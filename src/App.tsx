// =====================================================================
// FILE: App.tsx
// =====================================================================
//
// YE FILE KYA KARTI HAI:
//   Ye poori React application ka ROOT COMPONENT hai.
//   Jaise ek building ka blueprint hota hai, waise hi App.tsx poori app ka
//   blueprint define karta hai – kaunsi URL pe kaunsa page dikhega, ye sab
//   yahan decide hota hai.
//
// YE KIS LAYER KA HISSA HAI:
//   App.tsx – Root component layer.
//   Iska kaam sirf ROUTING hai, matlab:
//     - Browser mein jo URL type karo (jaise /order/abc123)
//     - App.tsx decide karta hai ki kaunsa component render hoga
//
// POORI APP KI FILE STRUCTURE KA ROLE SAMJHO:
//   - main.tsx    : React app ka entry point – browser mein sabse pehle yahi
//                   load hota hai, ReactDOM.render() yahan call hoti hai
//   - App.tsx     : Root component – saari routes aur global providers yahan
//                   hain (YE FILE)
//   - index.css   : Global styles – poori app pe apply hoti hain
//   - api.ts      : Backend se baat karne ka ek jagah – saare HTTP calls
//                   yahan se jaate hain (Axios use hota hai)
//   - auth.ts     : Login/logout/token store karne ka logic
//   - types.ts    : Poori app ke TypeScript types/interfaces – data ka shape
//                   define karta hai
//   - countries.ts: Country/city data – dropdowns ke liye
//   - schedule.ts : Shop timing/schedule related utility functions
//
// KAUN SE PAGES/COMPONENTS IS FILE KO USE KARTE HAIN:
//   - main.tsx is file ko directly import karke <App /> render karta hai
//   - Koi aur file App.tsx ko import nahi karti – ye top-level hai
//
// IMPORTANT CONCEPTS (simple Hinglish mein):
//   1. REACT ROUTER (react-router-dom):
//      - Ye ek library hai jo "client-side routing" karta hai.
//      - Matlab: page reload kiye bina URL change hoti hai aur alag component
//        render hota hai – jaise single page app mein hota hai.
//      - <Routes> ek container hai jisme saare <Route> rakhte hain.
//      - <Route path="/abc" element={<MyPage />} /> ka matlab:
//        "Agar URL /abc hai toh <MyPage /> dikhao."
//
//   2. URL PARAMETERS (:shopCode, :sectionCode, :ticketId):
//      - Route mein colon (:) lagakar dynamic values pass karte hain.
//      - Jaise "/q/:shopCode" mein ":shopCode" ek placeholder hai.
//      - Actual URL hogi "/q/salon-pk42" – toh shopCode = "salon-pk42" milega.
//      - Component ke andar useParams() hook se ye value milti hai.
//
//   3. <Navigate> COMPONENT:
//      - Ye user ko automatically ek URL se doosri URL pe bhej deta hai
//        (redirect karta hai).
//      - replace={true} matlab: browser history mein purani URL replace ho
//        jaati hai, yani back button dabane pe wahan nahi jaata.
//
//   4. DEFAULT EXPORT:
//      - "export default function App()" matlab: doosri files ye component
//        import karein toh koi bhi naam de sakti hain, jaise:
//        import MyApp from './App' – ye bhi kaam karega.
// =====================================================================

import { Navigate, Route, Routes } from "react-router-dom";
// React Router se teen cheezein import ki hain:
//   - Routes   : Saare Route ko wrap karne wala container
//   - Route    : Ek specific URL path ko ek component se map karta hai
//   - Navigate : Redirect karne ke liye – user ko doosre page pe bhejta hai

import LandingPage from "./pages/LandingPage";
// App ka home page – sabse pehle "/" pe dikhta hai

import RegionDiscoveryPage from "./pages/RegionDiscoveryPage";
// Customer apna pincode/location enter karta hai yahan aur nearby shops dhundhta hai

import ShopLandingPage from "./pages/ShopLandingPage";
// Jab customer QR code scan karta hai toh yahan land karta hai
// Shop ke saare sections (e.g. "Haircut", "Shave") yahan list hote hain

import OrderPage from "./pages/OrderPage";
// Customer kisi ek section mein apna order/token leta hai is page pe

import TrackPage from "./pages/TrackPage";
// Customer apne ticket ka live status track karta hai – queue mein kitne log hain etc.

import MyOrdersPage from "./pages/MyOrdersPage";
// Customer ke saare orders ek jagah – ek shop ke liye

import ShopAuthPage from "./pages/ShopAuthPage";
// Shop owner ya staff ka login/signup page

import StaffPage from "./pages/StaffPage";
// Staff member ka dashboard – queue manage karta hai, tokens call karta hai

import AdminPage from "./pages/AdminPage";
// Shop owner ka admin dashboard – sections, staff, settings manage karta hai

import MenuPage from "./pages/MenuPage";
// Ek specific section ka menu manage karne ka page (admin ke andar)

import FieldsPage from "./pages/FieldsPage";
// Ek specific section ke custom fields manage karne ka page (admin ke andar)
// Example: "Customer ka naam" ya "Mobile number" jaise fields add/edit karo

import SuperAdminPage from "./pages/SuperAdminPage";
// Superadmin ka page – poori app ka highest level admin, sabhi shops dekh sakta hai

// =====================================================================
// App COMPONENT – Root routing component
// =====================================================================
// Ye function poori app ka routing structure return karta hai.
// Isko main.tsx mein render kiya jaata hai.
// Iska koi apna state ya props nahi hain – sirf routes define karta hai.
export default function App() {
  return (
    // <Routes> ek special wrapper hai jo browser ki current URL check karta hai
    // aur usse match karne wala pehla <Route> render karta hai.
    <Routes>

      {/* HOME PAGE — "/" URL pe LandingPage dikhao */}
      <Route path="/" element={<LandingPage />} />

      {/* ---------------------------------------------------------------- */}
      {/* CUSTOMER FLOW: location -> shop -> section -> order -> track      */}
      {/* Customer: location (pincode) -> shop -> section */}

      {/* Step 1: Customer apna area/pincode enter karta hai shops dhundhne ke liye */}
      <Route path="/customer" element={<RegionDiscoveryPage />} />

      {/* Step 2: QR scan yahan land karta hai – shop ke sections dikhte hain
          ":shopCode" dynamic hai – har shop ka alag code hota hai
          Example URL: /q/barber-shop-001 */}
      <Route path="/q/:shopCode" element={<ShopLandingPage />} />

      {/* Step 3: Customer kisi section ko choose karta hai aur order deta hai
          ":sectionCode" us specific section ka unique code hai
          Example URL: /order/haircut-section-42 */}
      <Route path="/order/:sectionCode" element={<OrderPage />} />

      {/* Step 4: Order dene ke baad customer apna token track karta hai
          ":ticketId" us specific token/ticket ka ID hai
          Example URL: /track/ticket-789 */}
      <Route path="/track/:ticketId" element={<TrackPage />} />

      {/* Ek shop ke saare orders ek jagah dekhne ke liye
          Example URL: /my-orders/barber-shop-001 */}
      <Route path="/my-orders/:shopCode" element={<MyOrdersPage />} />

      {/* ------------------------------------------------------------------ */}
      {/* SHOP FLOW: owner/staff signup + signin */}
      {/* Shop: owner/staff signup + signin */}

      {/* Shop owner ya staff yahan login/signup karta hai */}
      <Route path="/shop" element={<ShopAuthPage />} />

      {/* /login pe aane walo ko /shop pe redirect karo (purani URL support ke liye)
          "replace" isliye use kiya hai taaki browser history mein /login na rahe
          – back button dabane pe user /login loop mein na fase */}
      <Route path="/login" element={<Navigate to="/shop" replace />} />

      {/* Staff member ka page – ek specific section ka queue manage karta hai
          Example URL: /staff/haircut-section-42 */}
      <Route path="/staff/:sectionCode" element={<StaffPage />} />

      {/* Shop owner ka admin dashboard – poori shop manage karta hai
          Example URL: /admin/barber-shop-001 */}
      <Route path="/admin/:shopCode" element={<AdminPage />} />

      {/* Admin ke andar ek section ka menu edit karne ka page
          Do dynamic params hain: shopCode aur sectionCode
          Example URL: /admin/barber-shop-001/menu/haircut-section-42 */}
      <Route path="/admin/:shopCode/menu/:sectionCode" element={<MenuPage />} />

      {/* Admin ke andar ek section ke custom fields edit karne ka page
          Example URL: /admin/barber-shop-001/fields/haircut-section-42 */}
      <Route path="/admin/:shopCode/fields/:sectionCode" element={<FieldsPage />} />

      {/* ------------------------------------------------------------------ */}
      {/* SUPERADMIN PAGE — poori platform ka highest level admin */}
      <Route path="/superadmin" element={<SuperAdminPage />} />

      {/* CATCH-ALL ROUTE — koi bhi unknown URL aaye toh home page pe bhejo
          path="*" matlab: upar ke kisi bhi route se match na ho toh ye chalega
          "replace" isliye taaki history mein galat URL na save ho */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}