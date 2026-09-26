import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // sockjs-client browser mein 'global' dhoondhta hai — usse globalThis pe map karo
  define: {
    global: "globalThis",
  },

  server: {
    port: 5173,

    proxy: {
      "/api": "http://localhost:8081",

      "/ws": {
        target: "http://localhost:8081",
        ws: true,
      },
    },
  },
});