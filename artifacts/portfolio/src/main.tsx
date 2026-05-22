import { createRoot } from "react-dom/client";
import App from "./App";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import "./index.css";

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

if (import.meta.env.DEV) {
  requiredEnvVars.forEach(key => {
    if (!import.meta.env[key]) {
      console.warn(`⚠️ Missing env var: ${key} — some features will be disabled`);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
