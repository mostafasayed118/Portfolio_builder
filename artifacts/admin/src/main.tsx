import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AdminProviders } from "./lib/auth";

createRoot(document.getElementById("root")!).render(
  <AdminProviders>
    <App />
  </AdminProviders>,
);
