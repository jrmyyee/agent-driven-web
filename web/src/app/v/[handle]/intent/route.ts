import { AnalysisLookupError, getAnalysisForHandle } from "@/lib/analysis-cache";
import { toIntent } from "@/lib/intent";
import { requestKeyFromHeaders } from "@/lib/usage-guard";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await params;
    const result = await getAnalysisForHandle(handle, {
      requestKey: requestKeyFromHeaders(req.headers),
    });
    return new Response(JSON.stringify(toIntent(result), null, 2), {
      headers: {
        "content-type": "application/intent+json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  } catch (error) {
    const status = error instanceof AnalysisLookupError ? error.status : 500;
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status },
    );
  }
}
