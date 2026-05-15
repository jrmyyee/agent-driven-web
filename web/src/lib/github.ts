/**
 * GitHub fetcher — pure, no LLM.
 *
 * Lifted from wrapped-engine/web/src/app/api/wrapped/route.ts and cleaned.
 * Authenticated via GITHUB_TOKEN (5000/hr); falls back to anon (60/hr) if absent.
 *
 * Returns { user, repos, recentActivity } in parallel; ~700ms typical.
 *
 * SPEC.md §6.1 — this is the upstream of analyser.ts.
 */

export type GhUser = {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  blog: string | null;
  company: string | null;
  location: string | null;
  twitter_username: string | null;
  avatar_url: string;
};

export type GhRepo = {
  name: string;
  full_name: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number;
  pushed_at: string;
  created_at: string;
  topics: string[];
  homepage: string | null;
};

export type GhEvent = {
  type: string;
  created_at: string;
  repo: { name: string };
  payload: Record<string, unknown>;
};

export type GitHubFetchResult =
  | { ok: true; user: GhUser; repos: GhRepo[]; recentActivity: GhEvent[] }
  | { ok: false; error: string; status: number };

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "user-agent": "agent-driven-web/0.1",
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchGitHub(handle: string): Promise<GitHubFetchResult> {
  const cleaned = handle.trim().replace(/^@/, "");
  if (!cleaned) return { ok: false, error: "handle required", status: 400 };

  const headers = buildHeaders();

  const [userRes, reposRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(cleaned)}`, { headers }),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(cleaned)}/repos?per_page=100&sort=pushed`,
      { headers }
    ),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(cleaned)}/events/public?per_page=30`,
      { headers }
    ),
  ]);

  if (userRes.status === 404) {
    return { ok: false, error: `github user not found: ${cleaned}`, status: 404 };
  }
  if (userRes.status === 403) {
    return {
      ok: false,
      error: "github api rate-limited (set GITHUB_TOKEN)",
      status: 429,
    };
  }
  if (!userRes.ok) {
    return { ok: false, error: `github user api: ${userRes.status}`, status: 502 };
  }

  const user = (await userRes.json()) as GhUser;
  const repos = reposRes.ok ? ((await reposRes.json()) as GhRepo[]) : [];
  const recentActivity = eventsRes.ok ? ((await eventsRes.json()) as GhEvent[]) : [];

  return { ok: true, user, repos, recentActivity };
}
