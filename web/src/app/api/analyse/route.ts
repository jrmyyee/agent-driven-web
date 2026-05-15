import { AnalysisLookupError, getAnalysisForHandle } from "@/lib/analysis-cache";
import { requestKeyFromHeaders } from "@/lib/usage-guard";

export const runtime = "nodejs";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function errorResponse(error: unknown) {
  if (error instanceof AnalysisLookupError) {
    return json({ error: error.message }, { status: error.status });
  }
  console.error("analyse route error", error);
  return json({ error: "Internal error." }, { status: 500 });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const handle = (url.searchParams.get("handle") ?? "").slice(0, 39);
    const result = await getAnalysisForHandle(handle, {
      requestKey: requestKeyFromHeaders(req.headers),
    });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 1024) {
      return json({ error: "Body too large." }, { status: 413 });
    }
    const body = (await req.json()) as { handle?: string };
    const handle = (body.handle ?? "").slice(0, 39);
    const result = await getAnalysisForHandle(handle, {
      requestKey: requestKeyFromHeaders(req.headers),
    });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
