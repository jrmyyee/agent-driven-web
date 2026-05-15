import { analyseGitHubData, type AnalysedHandle } from "./analyser";
import { fetchGitHub } from "./github";
import { checkColdAnalysisAllowed } from "./usage-guard";
import { unstable_cache } from "next/cache";

const TTL_SECONDS = 60 * 60;

export class AnalysisLookupError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AnalysisLookupError";
    this.status = status;
  }
}

const fetchAndAnalyseCached = unstable_cache(
  async (cleaned: string) => {
    const fetched = await fetchGitHub(cleaned);
    if (!fetched.ok) throw new AnalysisLookupError(fetched.error, fetched.status);
    return analyseGitHubData(fetched);
  },
  ["agent-driven-web-analysis-v2"],
  { revalidate: TTL_SECONDS },
);

export function normaliseHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

export async function getAnalysisForHandle(
  handle: string,
  options: { requestKey?: string } = {},
): Promise<AnalysedHandle> {
  const cleaned = normaliseHandle(handle);
  if (!cleaned) throw new AnalysisLookupError("handle required", 400);

  const guard = checkColdAnalysisAllowed({ handle: cleaned, requestKey: options.requestKey });
  if (!guard.ok) throw new AnalysisLookupError(guard.message, guard.status);

  return fetchAndAnalyseCached(cleaned);
}
