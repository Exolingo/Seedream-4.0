import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000", // vercel dev가 띄우는 포트
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
