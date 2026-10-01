// =====================================================================
// FILE: RegionDiscoveryPage.tsx
// =====================================================================
//
// YE FILE KYA KARTI HAI:
//   Customer apna country, city aur pincode daalta hai is page pe, aur
//   nearby shops ki list dikhti hai. Optional shop code bhi daal sakta hai
//   agar use specific shop ka code pata ho.
//
// KEY FEATURES:
//   - Browser Geolocation se country/city auto-fill hota hai (agar permission mile)
//   - Country change hone par cities dropdown reload hota hai
//   - Search karne par matching shops list mein aate hain
// =====================================================================

import { useEffect, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import CountryTypeahead from "../components/CountryTypeahead";
import CityTypeahead from "../components/CityTypeahead";
import CustomerHeader from "../components/CustomerHeader";
import { Card, Spinner, Button } from "../components/ui";
import { useGeolocation, type GeoLocation } from "../hooks/useGeolocation";
import { useT } from "../i18n/LanguageContext";
import { getCities, searchShops } from "../lib/api";
import type { CityDto, ShopSummaryDto } from "../lib/types";
import { useNavigate, type NavigateFunction } from "react-router-dom";

export default function RegionDiscoveryPage() {
  // navigate() — programmatically ek route se doosre route pe jaane ke liye
  const navigate: NavigateFunction = useNavigate();

  // t() — translation function; string keys ko current language ki value mein convert karta hai
  const t: (key: string, vars?: Record<string, string | number>) => string = useT();

  // geo — browser Geolocation API se user ka approximate country aur city detect karta hai
  // geo.loading: true jab tak location fetch ho rahi ho
  // geo.denied:  true agar user ne location permission deny ki ho
  // geo.country, geo.city: detected values (string ya undefined)
  const geo: GeoLocation = useGeolocation();

  // --- STATE DECLARATIONS ---

  // country: CountryTypeahead mein user ne jo country select/type ki hai uska value store karta hai
  const [country, setCountry] = useState<string>("");

  // city: CityTypeahead mein selected city ka naam store karta hai
  const [city, setCity] = useState<string>("");

  // pincode: user ka entered pincode store karta hai (required field)
  const [pincode, setPincode] = useState<string>("");

  // shopCode: optional shop code — agar customer ko specific shop ka code pata ho to seedha dhundh sake
  const [shopCode, setShopCode] = useState<string>("");

  // shops: search API se aayi shops ki list store karta hai; initial empty array
  const [shops, setShops] = useState<ShopSummaryDto[]>([]);

  // searched: track karta hai ki user ne at least ek baar search kiya ya nahi
  // Iska use "No shops found" message sirf tab dikhane ke liye hota hai jab search ho chuka ho,
  // page load pe blank message na dikhe isliye
  const [searched, setSearched] = useState<boolean>(false);

  // loadingShops: true jab searchShops API call chal rahi ho — Spinner dikhane ke liye
  const [loadingShops, setLoadingShops] = useState<boolean>(false);

  // countryError: true karna hai jab user search kare aur country field empty ho — red border + error message
  const [countryError, setCountryError] = useState<boolean>(false);

  // cityError: true karna hai jab user search kare aur city field empty ho
  const [cityError, setCityError] = useState<boolean>(false);

  // pincodeError: true karna hai jab user search kare aur pincode field empty ho
  const [pincodeError, setPincodeError] = useState<boolean>(false);

  // cities: selected country ke available cities ki list (CityTypeahead ko feed hoti hai)
  const [cities, setCities] = useState<CityDto[]>([]);

  // loadingCities: true jab getCities API call chal rahi ho — CityTypeahead mein loading state dikhane ke liye
  const [loadingCities, setLoadingCities] = useState<boolean>(false);

  // autoFilled: ek baar geolocation se country/city auto-fill ho jaaye to dobara set na ho isliye flag
  // Ye prevent karta hai ki geo values repeat mein apply na ho jab component re-render ho
  const [autoFilled, setAutoFilled] = useState<boolean>(false);

  // --- GEOLOCATION AUTO-FILL LOGIC ---
  // Ye render ke dauran synchronously run hota hai (useEffect nahi, seedha render flow mein hai).
  // Jab geo loading complete ho jaaye (geo.loading === false) aur abhi auto-fill na hua ho,
  // tab detected country aur city automatically form mein bhar do.
  // autoFilled flag set karte hain taaki ye sirf ek baar chale — infinite loop avoid hoga.
  if (!geo.loading && !autoFilled) {
    if (geo.country) setCountry(geo.country);
    if (geo.city) setCity(geo.city);
    setAutoFilled(true);
  }

  // --- useEffect: Country change hone par Cities reload karo ---
  // Ye effect tab chalega jab bhi `country` state ki value change ho.
  // Agar country empty ho to cities list saaf kar do aur return karo.
  // Warna getCities(country) API call karo aur result cities state mein store karo.
  // Error aane par cities ko empty array set karo taaki UI broken na rahe.
  // loadingCities flag se CityTypeahead ko pata chalega ki data load ho raha hai.
  useEffect((): void => {
      if (!country.trim()) { setCities([]); return; }
      setLoadingCities(true);
      getCities(country.trim())
        .then((data: unknown): void => setCities(Array.isArray(data) ? data as CityDto[] : []))
        .catch((): void => setCities([]))
        .finally((): void => setLoadingCities(false));
    }, [country]);

  // --- HANDLER: Country change hone par ---
  // CountryTypeahead se nayi value aane par:
  //   1. Naya country state set karo
  //   2. City reset karo — kyunki naye country ki cities alag hoti hain, purani city invalid ho jaati hai
  //   3. Country aur city ke error states clear karo taaki stale error message na dikhein
  function handleCountryChange(v: string): void {
    setCountry(v);
    setCity("");
    setCountryError(false);
    setCityError(false);
  }

  // --- FUNCTION: runSearch — Search button click hone par ya Enter press hone par chalti hai ---
  // Pehle validation karta hai: country, city, pincode teeno required hain.
  // Agar koi bhi missing ho to error flag set karo aur function se return kar do (API call mat karo).
  // Agar sab fields filled hain to:
  //   - loadingShops true karo (spinner dikhao)
  //   - searched true karo (ab "no results" message show karna valid hoga)
  //   - searchShops API call karo with trimmed values; shopCode optional hai
  //   - Results aane par shops state update karo
  //   - Finally block mein loadingShops false karo (spinner hatao)
  function runSearch(): void {
    const noCountry: boolean = !country.trim();
    const noCity: boolean = !city.trim();
    const noPincode: boolean = !pincode.trim();
    setCountryError(noCountry);
    setCityError(noCity);
    setPincodeError(noPincode);
    // Agar koi bhi required field empty ho to search rok do
    if (noCountry || noCity || noPincode) return;
    setLoadingShops(true);
    setSearched(true);
    // searchShops ko undefined pass karo agar value empty ho — API unnecessary empty params handle kare
    searchShops(country.trim() || undefined, city.trim() || undefined, pincode.trim(), shopCode.trim() || undefined)
      .then(setShops)
      .finally((): void => setLoadingShops(false));
  }

  // --- JSX / RENDER ---
  return (
    <>
      {/* CustomerHeader: Page ka top navigation bar — logo, language switcher, etc. */}
      <CustomerHeader />

      {/* Main container: max width 448px, centered, with horizontal padding aur vertical spacing */}
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Page heading section: Title aur subtitle centered dikhata hai */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold">{t("discovery.title")}</h1>
          <p className="text-gray-500 text-sm">{t("discovery.subtitle")}</p>
        </div>

        {/* Form section: Teeno required inputs (country, city, pincode) aur ek optional input (shop code) */}
        <div className="space-y-3 mb-5">

          {/* CountryTypeahead: Searchable country dropdown
              - value/onChange: controlled input
              - loading: geo detect ho rahi hai tab loading state dikhao
              - loadingText: loading ke dauran dikhane wala text
              - required + error: validation ke liye */}
          <CountryTypeahead
            value={country}
            onChange={handleCountryChange}
            label={t("discovery.country")}
            loading={geo.loading}
            loadingText={t("discovery.detectingLocation")}
            required
            error={countryError ? t("discovery.countryRequired") : undefined}
          />

          {/* Location denied warning: Agar user ne browser location permission deny ki ho to
              amber colored warning message dikhao — location detect nahi ho paayi yeh batane ke liye */}
          {geo.denied && !geo.loading && (
            <p className="text-xs text-amber-600 -mt-2">{t("discovery.locationDenied")}</p>
          )}

          {/* City section: CityTypeahead aur uske neeche optional city error message */}
          <div>
            {/* CityTypeahead: Country ke cities ka searchable dropdown
                - cities: getCities API se loaded list
                - onChange: city set karo aur cityError clear karo */}
            <CityTypeahead
              cities={cities}
              value={city}
              onChange={(v: string): void => { setCity(v); setCityError(false); }}
              label={t("discovery.city")}
              loading={loadingCities}
            />
            {/* City validation error: City empty hone par red text mein error dikhao */}
            {cityError && <p className="text-xs text-red-500 mt-1">{t("discovery.cityRequired")}</p>}
          </div>

          {/* Pincode — mandatory */}
          {/* Pincode input: Required field — bina pincode ke search nahi hoga
              - onKeyDown: Enter key press karne par bhi search chal jaaye (UX improvement)
              - Border color: error hone par red, warna default gray */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t("discovery.pincode")} <span className="text-red-500">*</span>
            </label>
            <input
              value={pincode}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => { setPincode(e.target.value); setPincodeError(false); }}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") runSearch(); }}
              placeholder="e.g. 400001"
              className={`w-full border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40 ${
                pincodeError ? "border-red-400" : "border-gray-200"
              }`}
            />
            {/* Pincode validation error: pincode empty hone par error message */}
            {pincodeError && (
              <p className="text-xs text-red-500 mt-1">{t("discovery.pincodeRequired")}</p>
            )}
          </div>

          {/* Shop code — optional */}
          {/* ShopCode input: Optional field — agar customer ko specific shop ka code pata ho
              to seedha filter kar sake. Koi validation error nahi kyunki ye mandatory nahi.
              Enter key se bhi search trigger hoga. */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">{t("discovery.shopCode")}</label>
            <input
              value={shopCode}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setShopCode(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") runSearch(); }}
              placeholder={t("discovery.shopCodePlaceholder")}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40 text-sm"
            />
          </div>
        </div>

        {/* Search Button: Full width; geo.loading ke dauran disable rahega
            taaki location detect hone se pehle user galti se submit na kare */}
        <Button onClick={runSearch} disabled={geo.loading} className="w-full mb-5">
          {t("discovery.searchBtn")}
        </Button>

        {/* Results section: Teen possible states handle karta hai —
            1. loadingShops true: Spinner dikhao (API call chal rahi hai)
            2. Search hua lekin results empty: "No shops found" card dikhao
            3. Results available: Scrollable shops list dikhao */}
        {loadingShops ? (
          /* Loading state: Search chal rahi hai, spinner dikhao */
          <Spinner />
        ) : searched && shops.length === 0 ? (
          /* Empty state: Search ho chuka hai lekin koi shop nahi mili is area mein */
          <Card className="text-center text-gray-400 py-8">{t("discovery.noShops")}</Card>
        ) : (
          /* Shops list: max height set hai taaki page overflow na ho — inner scroll hoga
             pr-1 se scrollbar ke neeche content clip na ho */
          <div className="space-y-3 overflow-y-auto pr-1 max-h-[calc(100vh-420px)]">
            {shops.map((s: ShopSummaryDto) => (
              /* Shop Card: Har shop ek clickable card hai
                 - key: s.code unique identifier hai React rendering ke liye
                 - onClick: shop ke queue page pe navigate karo — /q/:shopCode */
              <Card
                key={s.code}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/q/${s.code}`)}
              >
                {/* Card top row: Shop naam left mein, status badge + "Open" link right mein */}
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{s.name}</div>
                  <div className="flex items-center gap-2">
                    {/* Open/Offline badge: s.open true ho to green "Live" badge, warna red "Offline" badge
                        Ye snapshot status hai — real-time nahi, search ke time ka status hai */}
                    {s.open
                      ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{t("shop.live")}</span>
                      : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{t("shop.offline")}</span>}
                    <span className="text-brand text-sm font-medium">{t("discovery.open")}</span>
                  </div>
                </div>

                {/* Card bottom row: Shop ke section types (e.g. "Haircut · Beard") aur location info
                    - sectionTypes.join(" · "): array ko readable dot-separated string mein convert karta hai
                    - State aur city dono hain to "State – City" format, warna jo available ho
                    - Pincode agar available ho to append karo */}
                <div className="text-xs text-gray-400 mt-1">
                  {s.sectionTypes.join(" · ")}
                  {(s.state || s.city) && (
                    <span className="ml-2">
                      · {s.state && s.city ? `${s.state} – ${s.city}` : s.state || s.city}
                    </span>
                  )}
                  {s.pincode && <span className="ml-1">· {s.pincode}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}