import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "remove-telegram-sdk-from-showcase",
      transformIndexHtml(html: string) {
        return process.env.VITE_SHOWCASE === "true"
          ? html.replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>', "")
          : html;
      },
    },
  ],
  base: process.env.VITE_SHOWCASE === "true" ? "/subguard/" : "/",
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
});
