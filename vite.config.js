import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@assets": "/src/assets",
      "@shared": "/src/shared",
      "@context": "/src/context",
      "@features": "/src/features",
    },
  },
  server: {
    proxy: {
      "/api": {
        changeOrigin: true,
        target: "https://worldcup26.ir",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
