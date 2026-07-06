import { defineConfig } from "vite";

export default defineConfig({
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
