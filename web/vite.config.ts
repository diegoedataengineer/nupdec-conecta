import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

// https://vitejs.dev/config/
export default defineConfig(() => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // maplibre e recharts são pesados; separá-los deixa o resto do painel leve.
        manualChunks: {
          mapa: ["maplibre-gl", "terra-draw", "terra-draw-maplibre-gl-adapter"],
          graficos: ["recharts"],
        },
      },
    },
  },
}));
