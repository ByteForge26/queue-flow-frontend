// VITE_API_URL env var se backend ka origin lo (e.g. "https://queueflow-backend.onrender.com").
// `?? ""` -> agar env var set nahi hai (local dev), empty string use hogi,
// jisse neeche API_BASE_URL/WS_URL phir se relative ("/api", "/ws") ban
// jaayenge — matlab local dev ka behavior EXACTLY pehle jaisa hi rehta hai.
// `.replace(/\/$/, "")` -> agar koi galti se trailing slash daal de
// (e.g. ".../onrender.com/"), use hata do taaki "//api" na bane.
const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// api.ts isko axios baseURL ke taur pe use karta hai.
export const API_BASE_URL = `${API_ORIGIN}/api`;

// useStomp.ts isko SockJS connection URL ke taur pe use karta hai.
export const WS_URL = `${API_ORIGIN}/ws`;