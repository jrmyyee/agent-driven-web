// Best-effort rate limiting using in-process counters. On Vercel's serverless
// model these reset on cold start and are per-instance, so under load the
// effective limit is multiplied by concurrent instances. The authoritative
// backstop is the spending cap configured on the AI Gateway dashboard.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type Counter = {
  count: number;
  expiresAt: number;
};

type GuardResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      message: string;
    };

const counters = new Map<string, Counter>();

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function vettedHandles() {
  return new Set(
    (process.env.VETTED_HANDLES ?? "jrmyy,jrmyyee")
      .split(",")
      .map((handle) => handle.trim().toLowerCase())
      .filter(Boolean),
  );
}

function incrementWindow(key: string, limit: number, windowMs: number): GuardResult {
  if (limit === 0) return { ok: true };

  const now = Date.now();
  const existing = counters.get(key);
  const current = existing && existing.expiresAt > now ? existing : { count: 0, expiresAt: now + windowMs };
  current.count += 1;
  counters.set(key, current);

  if (current.count > limit) {
    return {
      ok: false,
      status: 429,
      message: "The public demo is at capacity for new handles. Try a vetted handle or wait for the quota window to reset.",
    };
  }

  return { ok: true };
}

export function requestKeyFromHeaders(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ??
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    headers.get("user-agent") ??
    "unknown"
  );
}

export function checkColdAnalysisAllowed({
  handle,
  requestKey = "server",
}: {
  handle: string;
  requestKey?: string;
}): GuardResult {
  if (process.env.PUBLIC_ANALYSIS_GUARD === "off") return { ok: true };
  if (vettedHandles().has(handle)) return { ok: true };

  const dailyLimit = numberEnv("PUBLIC_COLD_ANALYSIS_DAILY_LIMIT", 250);
  const hourlyClientLimit = numberEnv("PUBLIC_COLD_ANALYSIS_PER_CLIENT_HOURLY_LIMIT", 12);
  const global = incrementWindow("global:daily", dailyLimit, DAY_MS);
  if (!global.ok) return global;

  return incrementWindow(`client:${requestKey}:hourly`, hourlyClientLimit, HOUR_MS);
}

export function checkChatAllowed({ requestKey = "server" }: { requestKey?: string }): GuardResult {
  if (process.env.PUBLIC_ANALYSIS_GUARD === "off") return { ok: true };
  const limit = numberEnv("PUBLIC_CHAT_PER_CLIENT_HOURLY_LIMIT", 30);
  return incrementWindow(`chat:${requestKey}:hourly`, limit, HOUR_MS);
}

export function checkLensAllowed({ requestKey = "server" }: { requestKey?: string }): GuardResult {
  if (process.env.PUBLIC_ANALYSIS_GUARD === "off") return { ok: true };
  const limit = numberEnv("PUBLIC_LENS_PER_CLIENT_HOURLY_LIMIT", 12);
  return incrementWindow(`lens:${requestKey}:hourly`, limit, HOUR_MS);
}
