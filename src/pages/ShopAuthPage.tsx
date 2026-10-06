// =====================================================================
// ShopAuthPage.tsx
// (Header comment block collapsed in screenshots — original comments
//  above this point were not visible and are not reconstructed here.)
// =====================================================================
import { useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";
import { login, ownerSignup } from "../lib/api";
import { saveAuth } from "../lib/auth";
import type { AuthDto } from "../lib/types";
import { Button, Card } from "../components/ui";
import { useT } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import { useGeolocation } from "../hooks/useGeolocation";
import type { GeoLocation } from "../hooks/useGeolocation";
import CountryTypeahead from "../components/CountryTypeahead";
import { validatePhone } from "../lib/countries";

// Tab type: "owner" tab ya "staff" tab — page ka main switch
type Tab = "owner" | "staff";

// Mode type: "signin" ya "signup" — owner ke liye dono options hain
type Mode = "signin" | "signup";

// Ye wo section types hain jo ek shop ke andar ho sakti hain.
// Owner signup ke waqt inme se ek ya zyada select karna hota hai.
const SECTION_TYPES: string[] = ["SALON", "FOOD", "CLINIC", "GROCERY", "ROOMS", "GENERAL"];

export default function ShopAuthPage() {
  // navigate hook — login success ke baad user ko sahi route pe bhejna hai
  const navigate: NavigateFunction = useNavigate();

  // t() function — i18n translation helper; t("key") se localized string milti hai
  const t: (key: string, vars?: Record<string, string>) => string = useT();

  // geo — user ka approximate location (country, city) browser geolocation se
  const geo: GeoLocation = useGeolocation();

  // tab — "owner" ya "staff"; konsa tab active hai
  const [tab, setTab] = useState<Tab>("owner");

  // mode — "signin" ya "signup"; sirf owner ke liye relevant hai
  const [mode, setMode] = useState<Mode>("signin");

  // error — global form error message (e.g. "Invalid credentials"); null matlab koi error nahi
  const [error, setError] = useState<string | null>(null);

  // submitting — true hota hai jab API call chal rahi ho; button disable ho jaata hai
  const [submitting, setSubmitting] = useState(false);

  // ---- Shared fields (dono signin aur signup mein use hote hain) ----

  // username — login/signup ke liye user ka chosen username
  const [username, setUsername] = useState("");

  // password — user ka password
  const [password, setPassword] = useState("");

  // ---- Owner Signup ke additional fields ----

  // shopName — naye shop ka naam
  const [shopName, setShopName] = useState("");

  // country — shop ka country (CountryTypeahead se select hota hai; geo se auto-fill bhi)
  const [country, setCountry] = useState("");

  // state — shop ka state/province
  const [state, setState] = useState("");

  // city — shop ka city (geo se auto-fill bhi hota hai)
  const [city, setCity] = useState("");

  // pincode — shop area ka postal/zip code
  const [pincode, setPincode] = useState("");

  // phone — shop ka contact phone number
  const [phone, setPhone] = useState("");

  // address — shop ki full street address
  const [address, setAddress] = useState("");

  // recoveryCode — owner-defined backup code jo password bhool jane par kaam aata hai
  // Ye user khud banata hai, backend store karta hai; always uppercase save hota hai
  const [recoveryCode, setRecoveryCode] = useState("");

  // types — owner ne kaun kaun si section types select ki hain (e.g. ["SALON", "FOOD"])
  const [types, setTypes] = useState<string[]>([]);

  // ---- Validation & UI state ----

  // fieldErrors — per-field validation errors ka map; key = field name, value = error string
  // e.g. { shopName: "Required", phone: "Enter valid 10-digit number (+91)" }
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // showCredWarning — true hone par ek modal dikhata hai jisme user ko unke
  // username/password/recoveryCode confirm karne ka mauka milta hai signup se pehle
  const [showCredWarning, setShowCredWarning] = useState(false);

  // showForgotPw — true hone par "Forgot Password" instructions modal open hota hai
  const [showForgotPw, setShowForgotPw] = useState(false);

  // geoFilled — ye flag ensure karta hai ki geolocation se auto-fill sirf ek baar ho
  // (component re-render pe baar baar override na ho)
  const [geoFilled, setGeoFilled] = useState(false);

  // Geolocation auto-fill logic:
  // Jab geo loading khatam ho aur abhi tak fill nahi hua ho, tab country aur city
  // ko browser location se pre-populate karo. geoFilled flag set karo taaki dobara na chale.
  if (!geo.loading && !geoFilled) {
    if (geo.country) setCountry(geo.country);
    if (geo.city) setCity(geo.city);
    setGeoFilled(true);
  }

  // afterAuth — login ya signup success ke baad call hoti hai.
  // Auth data localStorage mein save karta hai, phir role ke hisaab se redirect karta hai:
  //   ADMIN => /admin/:shopCode (owner ka dashboard)
  //   STAFF => /staff/:sectionCode (staff ka pehla section)
  //   Agar staff ka koi section nahi => error dikhao
  function afterAuth(auth: AuthDto): void {
    saveAuth(auth);
    if (auth.role === "ADMIN") navigate(`/admin/${auth.shopCode}`);
    else if (auth.sections[0]) navigate(`/staff/${auth.sections[0].code}`);
    else setError(t("auth.noSection"));
  }

  // toggle — ek array mein value ko add ya remove karta hai (toggle behavior).
  // Agar value already list mein hai => remove, nahi hai => add.
  // Section types ke multi-select chips ke liye use hota hai.
  function toggle(list: string[], v: string): string[] {
    return list.includes(v) ? list.filter((x: string): boolean => x !== v) : [...list, v];
  }

  // validateSignup — owner signup form ke saare fields validate karta hai.
  // Agar koi field empty ya invalid hai to fieldErrors state update karta hai
  // aur false return karta hai. Sab theek ho to true return karta hai.
  function validateSignup(): boolean {
    const errs: Record<string, string> = {};
    if (!shopName.trim()) errs.shopName = t("common.required");
    if (!country.trim()) errs.country = t("common.required");
    if (!state.trim()) errs.state = t("common.required");
    if (!city.trim()) errs.city = t("common.required");
    if (!pincode.trim()) errs.pincode = t("auth.pincodeRequired");
    if (!address.trim()) errs.address = t("auth.shopAddressRequired");
    if (!phone.trim()) {
      errs.phone = t("auth.shopPhoneRequired");
    } else if (!validatePhone(phone, country)) {
      // Phone valid format nahi hai selected country ke liye — helpful hint dikhao
      errs.phone = phoneHint(country);
    }
    if (!recoveryCode.trim()) errs.recoveryCode = t("common.required");
    if (types.length === 0) errs.types = t("auth.pickSection");
    if (!username.trim()) errs.username = t("common.required");
    if (!password.trim()) errs.password = t("common.required");
    setFieldErrors(errs);
    // Agar errors object empty hai to validation pass hua
    return Object.keys(errs).length === 0;
  }

  // phoneHint — selected country ke liye phone number format ka helpful error message banata hai.
  // COUNTRIES_MAP se us country ka dial code aur digit range nikalta hai.
  // e.g. India ke liye: "Enter a valid 10-digit number (+91)."
  function phoneHint(countryName: string): string {
    // dynamic hint based on selected country
    const info: { minDigits: number; maxDigits: number; dialCode: string } = (COUNTRIES_MAP as Record<string, { minDigits: number; maxDigits: number; dialCode: string }>)[countryName];
    if (!info) return "Enter a valid phone number.";
    if (info.minDigits === info.maxDigits) return `Enter a valid ${info.minDigits}-digit number (${info.dialCode}).`;
    return `Enter a valid ${info.minDigits}-${info.maxDigits}-digit number (${info.dialCode}).`;
  }

  // submit — main form submit handler; "Sign In" ya "Sign Up" button click pe call hota hai.
  // Signup mode mein pehle validateSignup() chalaata hai, phir credential warning modal dikhata hai.
  // Signin mode mein seedha doLogin() call karta hai.
  async function submit(): Promise<void> {
    setError(null);
    if (mode === "signup") {
      if (!validateSignup()) return;
      // Validation pass — credential warning dikhao, taaki user apne credentials note kar sake
      setShowCredWarning(true);
      return;
    }
    await doLogin();
  }

  // doLogin — API call: POST /auth/login
  // Backend se AuthDto milta hai jisme role, shopCode, sections hote hain.
  // Role mismatch check karta hai (e.g. owner tab pe staff login karne ki koshish).
  // Error cases handle karta hai: wrong credentials (401), shop not found (404),
  // login blocked (409 LOGIN_BLOCKED), ya role mismatch.
  async function doLogin(): Promise<void> {
    setSubmitting(true);
    try {
      const auth: AuthDto = await login({ username, password });
      // Agar owner tab pe koi STAFF role wala login kare => error
      if (tab === "owner" && auth.role !== "ADMIN") throw new Error("not-owner");
      // Agar staff tab pe koi ADMIN role wala login kare => error
      if (tab === "staff" && auth.role !== "STAFF") throw new Error("not-staff");
      afterAuth(auth);
    } catch (e: unknown) {
      // HTTP status code nikalo response se (agar available ho)
      const status: number | undefined = (e as { response?: { status?: number } })?.response?.status;
      const msg: string = (e as Error)?.message;
      // Backend ka error message nikalo (different API shapes handle karo)
      const serverMsg: string | undefined =
        (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error;
      if (msg === "not-owner") setError(t("auth.notOwner"));
      else if (msg === "not-staff") setError(t("auth.notStaff"));
      // 409 + LOGIN_BLOCKED = account temporarily locked (too many failed attempts etc.)
      else if (status === 409 && serverMsg?.includes("LOGIN_BLOCKED")) setError(t("auth.loginBlocked"));
      else if (status === 401) setError(t("auth.badCreds"));
      else if (status === 404) setError(t("auth.shopNotFound"));
      else setError(t("common.somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  // doSignup — API call: POST /auth/owner-signup
  // Credential warning modal se "Confirm" button click karne ke baad call hota hai.
  // Naya shop + owner account banata hai; success pe afterAuth() se redirect karta hai.
  // 409 error = username/shopName already exists (duplicate).
  async function doSignup(): Promise<void> {
    setShowCredWarning(false);
    setSubmitting(true);
    try {
      const auth: AuthDto = await ownerSignup({
        shopName, country, state, city,
        pincode: pincode.trim(),
        phone: phone.trim(),
        address, username, password,
        // Recovery code ko uppercase mein send karo — consistent storage ke liye
        recoveryCode: recoveryCode.trim().toUpperCase(),
        sectionTypes: types,
      });
      afterAuth(auth);
    } catch (e: unknown) {
      const status: number | undefined = (e as { response?: { status?: number } })?.response?.status;
      // 409 = conflict — username ya shop name already liya ja chuka hai
      if (status === 409) setError(t("auth.dupUser"));
      else setError(t("common.somethingWrong"));
      setSubmitting(false);
    }
  }

  // isOwnerSignup — shorthand flag: true sirf tab === "owner" && mode === "signup" hone par.
  // Signup-only fields (shopName, country, etc.) render karne ke liye use hota hai.
  const isOwnerSignup: boolean = tab === "owner" && mode === "signup";

  // effectiveMode — staff tab hamesha "signin" mode mein hota hai kyunki
  // staff ka signup exist nahi karta. Owner ke liye actual mode use hota hai.
  const effectiveMode: Mode = tab === "staff" ? "signin" : mode;

  // fe(key) — field error helper; ek specific field ka error string return karta hai (ya undefined)
  function fe(key: string): string {
    return fieldErrors[key];
  }

  // clearFe(key) — ek specific field ka error clear karta hai jab user us field mein type kare.
  // Immutable update: purana object copy karo, key delete karo, naya set karo.
  function clearFe(key: string): void {
    setFieldErrors((p: Record<string, string>): Record<string, string> => {
      const n: Record<string, string> = { ...p };
      delete n[key];
      return n;
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
              QF
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">QueueFlow</div>
              <div className="font-semibold text-slate-900">{t("auth.title")}</div>
            </div>
          </div>
          <LanguageToggle />
        </div>

        <div className="premium-shell p-4 sm:p-5">
          <div className="mb-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-brand p-4 text-white shadow-xl shadow-indigo-500/20">
            <div className="text-xs uppercase tracking-[0.2em] text-indigo-100">Business access</div>
            <h1 className="mt-2 text-2xl font-black">{t("auth.title")}</h1>
            <p className="mt-1 text-sm text-indigo-100">{t("auth.subtitle")}</p>
          </div>

          <div className="mb-4 flex rounded-2xl bg-slate-100 p-1">
            {(["owner", "staff"] as Tab[]).map((tb: Tab) => (
              <button
                key={tb}
                onClick={(): void => { setTab(tb); setError(null); setFieldErrors({}); }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                  tab === tb ? "bg-white text-brand shadow-sm" : "text-slate-500"
                }`}
              >
                {tb === "owner" ? t("auth.ownerTab") : t("auth.staffTab")}
              </button>
            ))}
          </div>

      {/* ------------------------------------------------------------- */}
      {/* SIGN IN / SIGN UP TOGGLE: Sirf Owner tab ke liye dikhta hai. */}
      {/* Staff ke liye signup nahi hota, isliye ye toggle staff tab pe */}
      {/* hide hota hai. */}
      {/* ------------------------------------------------------------- */}
          {tab === "owner" && (
            <div className="mb-4 flex justify-center gap-4 text-sm">
              {(["signin", "signup"] as Mode[]).map((m: Mode) => (
                <button
                  key={m}
                  onClick={(): void => { setMode(m); setError(null); setFieldErrors({}); }}
                  className={effectiveMode === m ? "font-semibold text-brand" : "text-slate-400"}
                >
                  {m === "signin" ? t("auth.signin") : t("auth.signup")}
                </button>
              ))}
            </div>
          )}

          {tab === "staff" && (
            <p className="mb-4 text-center text-xs text-slate-400">{t("auth.staffLoginOnly")}</p>
          )}

          <Card className="border-slate-200/80 bg-slate-50/60 p-4 shadow-none">
            <div className="space-y-3">

          {/* ------------------------------------------------------------- */}
          {/* OWNER SIGNUP FIELDS: Ye fields sirf tab dikhti hain jab */}
          {/* tab === "owner" && mode === "signup" ho. */}
          {/* Inme shop ka poora detail fill karna hota hai. */}
          {/* ------------------------------------------------------------- */}
          {isOwnerSignup && (
            <>
              {/* Shop ka naam */}
              <Field
                label={`${t("auth.shopName")} *`}
                value={shopName}
                onChange={(v: string): void => { setShopName(v); clearFe("shopName"); }}
                error={fe("shopName")}
              />

              {/* Country typeahead — searchable dropdown; geo se auto-filled bhi ho sakta hai */}
              <CountryTypeahead
                value={country}
                onChange={(v: string): void => { setCountry(v); clearFe("country"); clearFe("phone"); }}
                label={t("auth.country")}
                required
                error={fe("country")}
                loading={geo.loading}
                loadingText={t("auth.detectingLocation")}
              />
              {/* Agar user ne location permission deny ki hai to amber warning dikhao */}
              {geo.denied && !geo.loading && (
                <p className="text-xs text-amber-600 -mt-1">{t("auth.locationDenied")}</p>
              )}

              {/* State / Province */}
              <Field
                label={`${t("auth.state")} *`}
                value={state}
                onChange={(v: string): void => { setState(v); clearFe("state"); }}
                error={fe("state")}
              />

              {/* City — geo se auto-filled ho sakta hai */}
              <Field
                label={`${t("auth.city")} *`}
                value={city}
                onChange={(v: string): void => { setCity(v); clearFe("city"); }}
                error={fe("city")}
              />

              {/* Pincode / ZIP code */}
              <Field
                label={`${t("auth.pincode")} *`}
                value={pincode}
                onChange={(v: string): void => { setPincode(v); clearFe("pincode"); }}
                error={fe("pincode")}
              />

              {/* Shop phone number — country ke hisaab se validate hota hai */}
              <Field
                label={`${t("auth.shopPhone")} *`}
                value={phone}
                onChange={(v: string): void => { setPhone(v); clearFe("phone"); }}
                type="tel"
                error={fe("phone")}
              />

              {/* Shop ki full address */}
              <Field
                label={`${t("auth.shopAddress")} *`}
                value={address}
                onChange={(v: string): void => { setAddress(v); clearFe("address"); }}
                error={fe("address")}
              />

              {/* ------------------------------------------------------------- */}
              {/* RECOVERY CODE input: */}
              {/* Ye owner ka self-defined backup code hai. */}
              {/* Password bhool jane par is code se account recover kar sakte hain. */}
              {/* Automatically uppercase mein convert hota hai (e.g. "myshop" => "MYSHOP"). */}
              {/* font-mono + tracking-widest styling se code clearly readable lagta hai. */}
              {/* ------------------------------------------------------------- */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t("auth.recoveryCode")} *
                </label>
                <input
                  value={recoveryCode}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => { setRecoveryCode(e.target.value.toUpperCase()); clearFe("recoveryCode"); }}
                  placeholder="e.g. MYSHOP2025"
                  className={`w-full border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40 font-mono tracking-widest ${
                    fe("recoveryCode") ? "border-red-400" : "border-gray-200"
                  }`}
                />
                <p className="text-xs text-gray-400 mt-1">{t("auth.recoveryCodeHint")}</p>
                {fe("recoveryCode") && <p className="text-xs text-red-500 mt-0.5">{fe("recoveryCode")}</p>}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SECTION TYPES multi-select chips: */}
              {/* Owner ko select karna hai ki uski shop mein kaun kaun si */}
              {/* services hain (e.g. SALON, FOOD, CLINIC). */}
              {/* Ek ya zyada select karna zaroori hai — toggle() function */}
              {/* se add/remove hota hai. */}
              {/* CheckChip component render karta hai colored toggle button. */}
              {/* ------------------------------------------------------------- */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t("auth.facilities")} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTION_TYPES.map((st: string) => (
                    <CheckChip
                      key={st}
                      label={st}
                      checked={types.includes(st)}
                      onClick={(): void => { setTypes((l: string[]): string[] => toggle(l, st)); clearFe("types"); }}
                    />
                  ))}
                </div>
                {fe("types") && <p className="text-xs text-red-500 mt-1">{fe("types")}</p>}
              </div>
            </>
          )}

          {/* ------------------------------------------------------------- */}
          {/* USERNAME & PASSWORD fields: */}
          {/* Ye dono fields hamesha dikhti hain — signin aur signup dono mein */}
          {/* Signup mein asterisk (*) lagta hai required mark ke liye */}
          {/* ------------------------------------------------------------- */}
          <Field
            label={`${t("auth.username")}${isOwnerSignup ? " *" : ""}`}
            value={username}
            onChange={(v: string): void => { setUsername(v); clearFe("username"); }}
            error={fe("username")}
          />
          <Field
            label={`${t("auth.password")}${isOwnerSignup ? " *" : ""}`}
            value={password}
            onChange={(v: string): void => { setPassword(v); clearFe("password"); }}
            type="password"
            error={fe("password")}
          />

          {/* Global error message — e.g. "Invalid credentials" ya "Something went wrong" */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* ------------------------------------------------------------- */}
          {/* SUBMIT BUTTON: */}
          {/* - Submitting ke dauraan disabled rahta hai (double-submit rok) */}
          {/* - Signin mein username aur password dono required hain (empty */}
          {/*   string pe disabled) */}
          {/* - Button text: loading => "doing...", signin => "Sign In", */}
          {/*   signup => "Sign Up" */}
          {/* ------------------------------------------------------------- */}
          <Button
            onClick={submit}
            disabled={submitting || (!isOwnerSignup && (!username || !password))}
            className="w-full"
          >
            {submitting
              ? t("auth.doing")
              : effectiveMode === "signin"
              ? t("auth.signin")
              : t("auth.signup")}
          </Button>
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* FORGOT PASSWORD LINK: */}
      {/* Sirf Owner + Sign-In mode mein dikhta hai. */}
      {/* Click karne pe showForgotPw true hota hai => modal open hota hai. */}
      {/* ------------------------------------------------------------- */}
      {effectiveMode === "signin" && tab === "owner" && (
        <div className="mt-3 text-center">
          <button
            onClick={(): void => setShowForgotPw(true)}
            className="text-xs text-brand hover:underline"
          >
            {t("auth.forgotPwLink")}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DEMO CREDENTIALS SECTION: */}
      {/* Sign-In mode mein demo login credentials dikhata hai. */}
      {/* Ye development/demo purposes ke liye hai taaki new users */}
      {/* easily try kar sakein bina account banaye. */}
      {/* ------------------------------------------------------------- */}
      {effectiveMode === "signin" && (
        <div className="mt-5 text-xs text-gray-400 text-center leading-relaxed">
          <p className="font-medium text-gray-500 mb-1">{t("auth.demoLogins")}</p>
          <p>glamour-admin / admin123 (admin)</p>
          <p>gp-food-staff / staff123 (staff - Food)</p>
          <p>gp-multi-staff / staff123 (staff - Salon+Food)</p>
        </div>
      )}

      {/* ========================================================= */}
      {/* FORGOT PASSWORD MODAL */}
      {/* showForgotPw === true hone par full-screen overlay ke upar dikhta */}
      {/* hai. Mobile pe bottom sheet style, desktop pe centered modal. */}
      {/* User ko password reset ke steps aur support email milti hai. */}
      {/* ========================================================= */}
      {showForgotPw && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center px-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm pb-safe">

            {/* Modal Header: icon + title + subtitle */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-t-3xl sm:rounded-t-2xl px-6 pt-6 pb-4 text-center border-b border-amber-100">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-2h2m-2-2H10m0-6V4a4 4 0 000 8 4 4 0 000-8z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">{t("auth.forgotPwTitle")}</h2>
              <p className="text-xs text-gray-500 mt-1">{t("auth.forgotPwBody")}</p>
            </div>

            {/* Details list: numbered steps jo user ko follow karne hain */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t("auth.forgotPwDetails")}</p>
              <div className="space-y-2">
                {/* 5 steps dynamically render karo i18n keys se */}
                {[
                  t("auth.forgotPwDetail1"),
                  t("auth.forgotPwDetail2"),
                  t("auth.forgotPwDetail3"),
                  t("auth.forgotPwDetail4"),
                  t("auth.forgotPwDetail5"),
                ].map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    {/* Numbered circle badge */}
                    <span className="w-5 h-5 bg-brand/10 text-brand rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>

              {/* Email CTA button — support email pe mailto: link open karta hai */}
              <a
                href={`mailto:${t("auth.forgotPwEmail")}?subject=Password Reset Request`}
                className="mt-4 flex items-center justify-between w-full bg-brand/5 hover:bg-brand/10 border border-brand/20 rounded-xl px-4 py-3 transition"
              >
                <div className="text-left">
                  <p className="text-xs text-gray-400">{t("auth.forgotPwDetails").replace(":", "")}</p>
                  <p className="text-sm font-bold text-brand">{t("auth.forgotPwEmail")}</p>
                </div>
                {/* Arrow icon */}
                <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              {/* Amber warning note — e.g. "Recovery code zaroori hoga" */}
              <p className="text-xs text-amber-600 text-center mt-3">{t("auth.forgotPwNote")}</p>
            </div>

            {/* Close button — modal band karta hai */}
            <div className="px-6 pb-6">
              <Button onClick={(): void => setShowForgotPw(false)} className="w-full">
                {t("auth.forgotPwClose")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CREDENTIAL WARNING MODAL — signup se pehle */}
      {/* validateSignup() pass hone ke baad yahan rukta hai. */}
      {/* User ko unke chosen username, password (masked), aur recovery code */}
      {/* dikhata hai — "Yaad rakhna, nahi toh account kho doge" warning. */}
      {/* "Confirm" => doSignup() call karta hai */}
      {/* "Cancel" => modal band, form wapas editable */}
      {/* ========================================================= */}
      {showCredWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full">
            <div className="text-3xl text-center mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-center mb-2">{t("auth.credWarnTitle")}</h2>
            <p className="text-sm text-gray-600 text-center mb-4">{t("auth.credWarnBody")}</p>

            {/* Credentials summary box: username, masked password, recovery code */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">{t("auth.username")}</span>
                <span className="font-semibold text-gray-800">{username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("auth.password")}</span>
                {/* Password ko dots se mask karo — actual characters nahi dikhate */}
                <span className="font-semibold text-gray-800">{"•".repeat(password.length)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-gray-500">{t("auth.recoveryCode")}</span>
                {/* Recovery code brand color mein monospace font se dikhao */}
                <span className="font-semibold text-brand font-mono tracking-widest">{recoveryCode}</span>
              </div>
            </div>

            {/* Amber hint — e.g. "Screenshot le lo ya likh lo" */}
            <p className="text-xs text-amber-600 text-center mb-4">{t("auth.credWarnHint")}</p>

            {/* Confirm button — doSignup() call karta hai aur actual account banata hai */}
            <Button onClick={doSignup} className="w-full mb-2">
              {t("auth.credWarnConfirm")}
            </Button>

            {/* Cancel button — modal band, wapas form pe */}
            <Button variant="ghost" onClick={(): void => setShowCredWarning(false)} className="w-full">
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

// lazy import to avoid circular — just re-read from the module
// COUNTRIES list ko naam => object map mein convert karta hai taaki O(1) lookup ho sake.
// phoneHint() function is map ko use karta hai country ke dial code aur digit range ke liye.
import { COUNTRIES } from "../lib/countries";
import type { CountryInfo } from "../lib/countries";
const COUNTRIES_MAP: { [k: string]: CountryInfo } =
  Object.fromEntries(COUNTRIES.map((c: CountryInfo): [string, CountryInfo] => [c.name, c]));

// =========================================================================
// HELPER COMPONENT: Field
// -------------------------------------------------------------------------
// Ek simple reusable labeled text input hai jo:
//   - label: input ke upar dikhne wala text
//   - value: controlled input ki current value
//   - onChange: parent ko updated value deta hai
//   - type: input type (default "text"; password ke liye "password", phone ke liye "tel")
//   - error: agar error string hai to red border aur error message dikhata hai
// =========================================================================

function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      {/* Field label */}
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      {/* Input — red border agar error hai, normal border agar nahi */}
      <input
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
        className={`w-full rounded-2xl border bg-white/90 px-3 py-2.5 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 ${
          error ? "border-red-300 bg-red-50/60" : "border-slate-200"
        }`}
      />
      {/* Inline error message neeche dikhata hai */}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// =========================================================================
// HELPER COMPONENT: CheckChip
// -------------------------------------------------------------------------
// Toggle chip button hai — selected hone par brand color fill, nahi to outlined.
// Section types ke multi-select grid mein use hota hai.
//   - label: chip pe dikhne wala text (lowercase mein render hota hai)
//   - checked: kya ye chip currently selected hai
//   - onClick: parent ko toggle event bhejta hai
// =========================================================================

function CheckChip({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-sm capitalize transition ${
        checked
          ? "border-brand bg-gradient-to-r from-brand to-indigo-600 text-white shadow-[0_12px_28px_rgba(79,70,229,0.18)]"
          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-brand"
      }`}
    >
      {/* label.toLowerCase() — "SALON" ko "salon" karke display karo (CSS capitalize ke saath "Salon" banega) */}
      {label.toLowerCase()}
    </button>
  );
}