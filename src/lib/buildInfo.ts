// Injected at build time via vite `define`. Falls back for dev/tests.
declare const __BUILD_ID__: string;

export const BUILD_ID: string =
  typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";

/** Best-effort cache invalidation: unregister SWs and clear Cache Storage. */
export async function purgeClientCaches(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }
}

/** Force a hard reload bypassing HTTP cache when possible. */
export function hardReload(): void {
  const url = new URL(window.location.href);
  url.searchParams.set("_v", BUILD_ID);
  window.location.replace(url.toString());
}
