// Lightweight instrumentation for login → dashboard flow.
// Marks are collected with performance.mark and can be inspected via
// window.__perf() or the PerfPanel (append ?perf=1 to the URL).

export type PerfMark =
  | "login_submit"
  | "login_auth_ok"
  | "tpv_fetch_start"
  | "tpv_fetch_end"
  | "tpv_cache_hit"
  | "dashboard_mount"
  | "dashboard_ready";

type Entry = { mark: PerfMark; t: number };
const entries: Entry[] = [];
const listeners = new Set<() => void>();

export function perfMark(mark: PerfMark) {
  const t = performance.now();
  entries.push({ mark, t });
  try { performance.mark(`mrpay:${mark}`); } catch { /* noop */ }
  listeners.forEach((fn) => fn());
}

export function perfReset() {
  entries.length = 0;
  listeners.forEach((fn) => fn());
}

export function perfEntries(): readonly Entry[] {
  return entries;
}

export function perfSubscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Human-readable breakdown between key checkpoints. */
export function perfBreakdown() {
  const map = new Map<PerfMark, number>();
  for (const e of entries) if (!map.has(e.mark)) map.set(e.mark, e.t);
  const between = (a: PerfMark, b: PerfMark) => {
    const x = map.get(a), y = map.get(b);
    return x != null && y != null ? +(y - x).toFixed(1) : null;
  };
  return {
    auth_ms: between("login_submit", "login_auth_ok"),
    edge_download_ms: between("tpv_fetch_start", "tpv_fetch_end"),
    dashboard_render_ms: between("dashboard_mount", "dashboard_ready"),
    total_login_to_dashboard_ms: between("login_submit", "dashboard_ready"),
    cache_hit: map.has("tpv_cache_hit"),
    marks: Object.fromEntries(map.entries()),
  };
}

if (typeof window !== "undefined") {
  (window as unknown as { __perf: typeof perfBreakdown }).__perf = perfBreakdown;
}
