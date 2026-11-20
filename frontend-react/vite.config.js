import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// While developing (npm run dev) the React page runs on http://localhost:5173
// and the FastAPI backend runs on http://localhost:8000.
// The "proxy" below forwards /api and /static calls to FastAPI,
// so the frontend code can simply use "/api/..." without writing the port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api":    "http://localhost:8000",
      "/static": "http://localhost:8000"   // saved diagrams: /static/diagrams/xxx.jpg
    }
  }
});
