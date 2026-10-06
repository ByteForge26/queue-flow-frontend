// ============================================================================
// FILE: main.tsx
// ----------------------------------------------------------------------
// YE FILE KYA KARTI HAI:
//   Ye poori React application ka ENTRY POINT hai.
//   Matlab — jab browser pehli baar app load karta hai,
//   toh sabse pehle yahi file execute hoti hai.
//   Iska kaam sirf ek hai: React app ko HTML page ke
//   ek specific element (id="root") ke andar "mount" karna.
//
// YE KIS LAYER KA HISSA HAI:
//   main.tsx    — React app ka entry point: browser mein sabse
//                 pehle yahi load hota hai. Ye "root" div dhundta
//                 hai aur uske andar poori app inject karta hai.
//   App.tsx     — Root component: saari routes aur global
//                 providers yahan define hote hain.
//   index.css   — Global styles: poori app pe apply hoti hain,
//                 isme fonts, resets, aur base classes hoti hain.
//   api.ts      — Backend se baat karne ki ek jagah: saare HTTP
//                 calls (GET/POST/PUT/DELETE) yahan se jaate hain.
//   auth.ts     — Login/logout aur token store karne ka logic:
//                 user kaun hai ye yahan manage hota hai.
//   types.ts    — Poori app ke TypeScript types/interfaces:
//                 data ka shape (structure) yahan define hota hai.
//   countries.ts — Country/city data: dropdowns ke liye static
//                  list yahan stored hai.
//   schedule.ts  — Shop timing/schedule related utility functions:
//                  opening hours calculate karne ka logic yahan hai.
//
// KAUN SE PAGES/COMPONENTS IS FILE KO USE KARTE HAIN:
//   Koi bhi component is file ko directly import nahi karta.
//   Balki ye FILE sabko wrap karti hai yani App.tsx aur uske
//   andar ke saare pages (Dashboard, Login, BookingPage etc.)
//   sab is file ki wajah se browser mein dikhte hain.
//
// IMPORTANT CONCEPTS (simple Hinglish mein):
//
//   React StrictMode:
//     Development mode mein React double-renders components
//     taaki bugs jaldi pakad mein aa sakein. Production mein
//     iska koi asar nahi hota — ye sirf dev time helper hai.
//
//   ReactDOM.createRoot():
//     React 18 ka naya API hai root banane ke liye. Pehle
//     ReactDOM.render() use hota tha. createRoot() se
//     "concurrent features" (jaise automatic batching) milti hain
//     jo app ko faster banati hain.
//
//   BrowserRouter (React Router):
//     Ye URL bar ko React ke saath sync karta hai. Jab user
//     /dashboard ya /login jaise URL pe jaata hai, BrowserRouter
//     sahi component render karta hai bina page reload ke.
//     Iska matlab hai app ek SPA (Single Page Application) hai.
//
//   LanguageProvider (i18n):
//     Ye ek Context Provider hai jo poori app ko multi-language
//     support deta hai (e.g., English/Hindi toggle). Har component
//     is context se current language aur translations le sakta hai.
//
//   index.css import:
//     CSS file ko yahan import karna suffices — Vite/Webpack
//     automatically ise HTML mein inject kar deta hai. Koi alag
//     <link> tag likhne ki zaroorat nahi hoti.
// ============================================================================

// React library ka core import — JSX syntax (HTML jaisi writing)
// compile hone ke baad React.createElement() calls mein convert
// hoti hai, isliye React in-scope hona zaroori hai.
import React from "react";

// ReactDOM specifically browser ke liye hai. React Native mein
// alag renderer hota hai. createRoot() se hum batate hain ki
// React ko DOM ka kaunsa element "control" karna hai.
import ReactDOM from "react-dom/client";

// BrowserRouter: URL-based navigation enable karta hai.
// Ye History API use karta hai jisse page bina reload ke
// navigate kar sakta hai — yahi SPA ka core mechanism hai.
import { BrowserRouter } from "react-router-dom";

// App component: poori application ka root component.
// Iske andar saari routes aur top-level layout defined hain.
import App from "./App";

// LanguageProvider: multi-language (i18n) context provider.
// Isko BrowserRouter ke bahar rakhna bhi valid hai kyunki
// language preference routing se independent hai.
import { LanguageProvider } from "./i18n/LanguageContext";

// Global CSS import — poori app pe ye styles apply hongi.
// Isko yahan (entry point mein) import karte hain taaki
// sabse pehle load ho aur koi FOUC (Flash of Unstyled Content)
// na aaye.
import "./index.css";

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// ReactDOM.createRoot():
//   - document.getElementById("root") — index.html mein ek
//     <div id="root"></div> hota hai; React wahan mount hota hai.
//   - "!" (non-null assertion) — TypeScript ko batata hai ki
//     ye element kabhi null nahi hoga. Agar HTML mein "root"
//     div missing ho toh runtime error aayega — isliye !
//     yahan safe assumption hai kyunki index.html hamesha
//     ye div include karta hai.
//   - .render(...) — React component tree ko DOM mein inject
//     karta hai.
ReactDOM.createRoot(document.getElementById("root")!).render(
  // React.StrictMode: sirf development build mein active hota hai.
  // Ye components ko intentionally double-invoke karta hai taaki
  // side-effects aur deprecated patterns pakad sakein.
  // Production build mein ye wrapper completely ignored hota hai.
  <React.StrictMode>
    {/* LanguageProvider sabse bahar hai taaki language setting
        routes ke andar ke har component tak pahunch sake.
        Context "top se neeche" flow karta hai (prop drilling nahi). */}
    <LanguageProvider>
      {/* BrowserRouter: React Router ka context provide karta hai.
          Iske andar koi bhi component <Link>, <Route>, useNavigate()
          etc. use kar sakta hai. Isko App ke bahar rakhte hain
          taaki App.tsx ke andar seedha <Routes> likh sakein. */}
      <BrowserRouter>
        {/* App: poori application ka starting component.
            Yahan se routes, layouts, aur global state (auth, theme)
            sab kuch unfold hota hai. */}
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
);