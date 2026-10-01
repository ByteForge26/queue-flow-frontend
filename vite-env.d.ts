// Ye reference Vite ke built-in types (jaise `import.meta.env`) TypeScript ko
// batati hai. Bina iske `config.ts` mein `import.meta.env.VITE_API_URL`
// likhne pe TypeScript error deta - "Property 'env' does not exist on type
// 'ImportMeta'" - aur production build (`tsc -b`) fail ho jaata.
// Standard Vite template file hai; ye project mein pehle thi hi nahi.
/// <reference types="vite/client" />