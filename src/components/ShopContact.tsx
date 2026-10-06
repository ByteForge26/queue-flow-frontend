// ============================================================
// ShopContact.tsx
// ============================================================

/** Customer ko shop ka phone (call link) + address dikhata hai. Emoji + raw data; koi label nahi. */
export default function ShopContact({
  phone,
  address,
  tone = "default",
}: {
  // phone: shop ka contact number — optional hai (string | null | undefined).
  // Agar diya gaya ho toh "tel:" link ke roop mein render hoga taaki mobile par direct dial ho sake.
  phone?: string | null;

  // address: shop ki physical location — optional hai (string | null | undefined).
  // Sirf plain text mein dikhaya jata hai, koi map integration nahi hai abhi.
  address?: string | null;
  tone?: "default" | "inverse";
}) {
  // EARLY RETURN (Guard Clause):
  // Agar dono phone aur address falsy hain (null, undefined, ya empty string),
  // toh kuch bhi render karne ki zaroorat nahi. `null` return karne se React
  // DOM mein koi node nahi banata — yeh blank space ya empty wrapper se bachata hai.
  if (!phone && !address) return null;

  return (
    // Outer wrapper div:
    // - text-xs       : font size extra-small — yeh secondary/supporting info hai, main content nahi
    // - text-gray-500 : medium gray color — visually muted taaki page ka focus distract na ho
    // - mt-1          : thodi si top margin — parent content se thoda neeche aaye
    // - space-y-0.5   : phone aur address rows ke beech mein minimal vertical gap
    <div className={`mt-1 space-y-0.5 text-xs ${tone === "inverse" ? "text-white/90" : "text-gray-600"}`}>
      {/* PHONE SECTION:
          `phone &&` — short-circuit evaluation: agar phone truthy hai tabhi yeh block render hoga.
          Agar phone null/undefined/empty hai toh yeh poora div skip ho jaata hai. */}
      {phone && (
        <div>
          {/* 📞 emoji visually indicate karta hai ki yeh phone number hai — koi text label nahi chahiye */}
          📞{" "}
          {/* `{" "}` — JSX mein emoji aur anchor tag ke beech ek space character insert karta hai,
              JSX whitespace ko automatically collapse karta hai, isliye yeh explicitly likhna padta hai. */}
          <a
            href={`tel:${phone}`} // "tel:" URI scheme — browser/OS ko batata hai ki yeh phone number hai.
            // Mobile devices par tap karne par directly dialer open hota hai.
            className={tone === "inverse" ? "font-medium text-white underline decoration-white/50 underline-offset-2" : "font-medium text-brand underline decoration-brand/30 underline-offset-2"}
          >
            {phone} {/* Actual phone number string display karta hai link ke andar */}
          </a>
        </div>
      )}

      {/* ADDRESS SECTION:
          `address &&` — same short-circuit pattern: sirf tab render hoga jab address truthy ho.
          Address plain text hai — koi link ya map embed nahi hai (intentionally simple). */}
      {address && <div>📍 {address}</div>}
      {/* 📍 emoji location/address indicate karta hai — minimal aur universally understood */}
    </div>
  );
}