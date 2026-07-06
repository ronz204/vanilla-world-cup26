import { defineConfig } from "vite";

export default defineConfig({
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
