
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  resolve: {
    dedupe: ["react", "react-dom"],
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },

  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,

    hmr: {
      protocol: "ws",
      host: "127.0.0.1",
      clientPort: 5173,
    },
  },
});
