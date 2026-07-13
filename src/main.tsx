import { createRoot } from "react-dom/client";

import App from "./App.tsx";

import { AppProviders } from "@/providers/AppProviders";
import { BUILD_ID, purgeClientCaches } from "@/lib/buildInfo";
import "./index.css";

// Cache invalidation: on every load, clean stale service workers / Cache Storage
// so the published site always reflects the latest build.
void purgeClientCaches();

// Expose the build id for quick inspection in the console.
if (typeof window !== "undefined") {
  (window as unknown as { __BUILD_ID__: string }).__BUILD_ID__ = BUILD_ID;
  // eslint-disable-next-line no-console
  console.info(`[build] ${BUILD_ID}`);
}

createRoot(document.getElementById("root")!).render(
  <AppProviders>
    <App />
  </AppProviders>,
);

