// =====================================================================
// FILE: useGeolocation.ts
// =====================================================================
import { useEffect, useState } from "react";

// GeoLocation interface – ye TypeScript ka type definition hai.
// Iska matlab hai ki useGeolocation() hook hamesha is shape ka object return
// karega. Junior devs ke liye: interface ek "contract" hai jo batata hai ki
// object mein kaun se fields honge aur unka type kya hoga.
export interface GeoLocation {
    country: string;   // User ka desh (e.g., "India") – reverse geocoding se aata hai
    city: string;       // User ka shehar (e.g., "Mumbai") – reverse geocoding se aata hai
    loading: boolean;   // true jab tak location fetch ho rahi ho, false jab complete ho jaye
    denied: boolean;    // true agar user ne location permission refuse kar di ya browser support nahi karta
}

// =====================================================================
// useGeolocation – Main Custom Hook
// YE KYA KARTA HAI:
//   1. Browser se user ki GPS coordinates (lat/lng) maangta hai.
//   2. Un coordinates ko Nominatim reverse-geocoding API ko bhejta hai.
//   3. API se milne wala city aur country naam React state mein store karta hai.
//   4. Loading aur denied flags manage karta hai taaki calling component
//      sahi UI state show kar sake (spinner, error message, ya filled form).
//
// RETURNS: GeoLocation object – { country, city, loading, denied }
// =====================================================================
export function useGeolocation(): GeoLocation {

    // --- State declarations ---
    // Har useState call ek alag "reactive variable" banata hai.
    // Jab setCountry/setCity/etc. call hota hai, component dobara render hota
    // hai nayi value ke saath.

    // country: User ka desh store karta hai – initially empty string
    const [country, setCountry] = useState<string>("");

    // city: User ka shehar store karta hai – initially empty string
    const [city, setCity] = useState<string>("");

    // loading: Shuru mein true hai kyunki location fetch abhi start nahi hui.
    // Jab bhi fetch complete ho (success ya failure), ise false kar diya jata hai.
    const [loading, setLoading] = useState<boolean>(true);

    // denied: Agar user ne location permission nahi di ya browser Geolocation
    // support nahi karta, to ise true kar diya jata hai.
    const [denied, setDenied] = useState<boolean>(false);

    // =====================================================================
    // useEffect – Location fetch karne ka side effect
    // YE KAB CHALTA HAI:
    //   Dependency array mein [] (empty array) diya gaya hai, isliye ye effect
    //   sirf EKBAAR chalta hai – jab component pehli baar screen par mount hota
    //   hai. Dobara nahi chalta jab tak component unmount-remount na ho.
    // YE KYA KARTA HAI:
    //   Browser Geolocation API check karta hai, permission maangta hai, aur
    //   milne par reverse geocoding call karta hai.
    // =====================================================================
    useEffect((): void => {

        // Pehle check karo ki browser Geolocation API support karta hai ya nahi.
        // Purane browsers ya kuch environments (e.g., HTTP non-secure origins) mein
        // navigator.geolocation undefined hota hai.
        if (!navigator.geolocation) {
            // Agar support nahi hai to location fetch possible nahi – denied true karo
            // aur loading band karo taaki UI stuck na rahe.
            setDenied(true);
            setLoading(false);
            return; // Effect yahan rok do – aage kuch karna nahi
        }

        // navigator.geolocation.getCurrentPosition – browser ka built-in API
        // jo user se location permission maangta hai (popup dikhata hai) aur
        // milne par GPS coordinates deta hai.
        // Arguments:
        //   1. Success callback – jab permission mili aur location mili
        //   2. Error callback   – jab permission refuse hui ya koi error aaya
        //   3. Options object   – jaise timeout kitna ho
        navigator.geolocation.getCurrentPosition(
            // --- SUCCESS CALLBACK ---
            // 'pos' mein user ki current position hoti hai.
            // Ye async hai kyunki andar fetch() call hai jo bhi async hoti hai.
            async (pos: GeolocationPosition): Promise<void> => {
                try {
                    // pos.coords se latitude aur longitude nikalo – ye decimal numbers
                    // hote hain, e.g., latitude: 19.0760, longitude: 72.8777 (Mumbai)
                    const { latitude, longitude } = pos.coords;

                    // BigDataCloud blocks server-side/NAT IPs; Nominatim is reliable for browser calls
                    // NOTE: BigDataCloud API server ke requests block kar deta hai (NAT/proxy IPs
                    // se), isliye Nominatim (OpenStreetMap ka free service) use kiya gaya hai
                    // jo directly browser se call karne par sahi kaam karta hai.
                    //
                    // Nominatim reverse geocoding URL banao: lat/lng do, JSON format mein
                    // response maango. "Accept-Language: en" header isliye bheja taaki
                    // city/country ke naam English mein milein, user ki browser language
                    // se independent hokar.
                    const res: Response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                        { headers: { "Accept-Language": "en" } }
                    );

                    // Response ko JSON mein parse karo
                    const data: any = await res.json();

                    // Nominatim ki response mein 'address' object hota hai jisme
                    // country, city, town, village, county jaise fields hote hain.
                    // Agar 'address' field nahi aaya (unexpected response) to empty
                    // object use karo taaki neeche wali lines crash na karein.
                    const addr: any = data.address ?? {};

                    // Country set karo – agar nahi mila to empty string rakho
                    setCountry(addr.country ?? "");

                    // City set karo – Nominatim always 'city' field nahi deta; chhote
                    // ilakon ke liye 'town', 'village', ya 'county' milta hai.
                    // Isliye OR chain lagaya hai: jo bhi pehle truthy value mile use lo.
                    setCity(addr.city || addr.town || addr.village || addr.county || "");

                } catch {
                    // reverse-geocode failed – leave fields blank for manual entry
                    // Agar fetch call fail ho gayi (network error, API down, etc.) to
                    // silently ignore karo. country aur city empty rahenge – user
                    // manually type kar sakta hai form mein.
                } finally {
                    // Finally block hamesha chalta hai – chahe try succeed hua ho ya catch.
                    // Loading band karo kyunki fetch attempt complete ho gayi.
                    setLoading(false);
                }
            },

            // --- ERROR CALLBACK ---
            // Ye tab chalta hai jab:
            //   - User ne location permission deny ki
            //   - Timeout ho gaya (8 seconds ke andar location nahi mili)
            //   - Koi aur Geolocation error aayi
            (): void => {
                setDenied(true);    // Location nahi milegi – component ko batao
                setLoading(false);  // Loading khatam karo
            },

            // --- OPTIONS ---
            // timeout: 8000ms (8 seconds) – agar itne time mein GPS fix nahi mila
            // to error callback call ho jayega. Bina timeout ke user indefinitely
            // wait kar sakta tha.
            { timeout: 8000 }
        );

    }, []); // [] – empty dependency array: effect sirf mount par ek baar chale

    // Hook ka return value – calling component ko ye sab fields milti hain.
    // Destructure karke use karo: const { country, city, loading, denied } = useGeolocation();
    return { country, city, loading, denied };
}