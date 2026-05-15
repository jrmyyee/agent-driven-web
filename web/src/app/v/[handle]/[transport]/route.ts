import { getAnalysisForHandle } from "@/lib/analysis-cache";
import { toIntent } from "@/lib/intent";
import { requestKeyFromHeaders } from "@/lib/usage-guard";
import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

type McpServerLike = {
  resource: (name: string, uri: string, handler: () => Promise<unknown>) => void;
  tool: (
    name: string,
    description: string,
    params: Record<string, unknown>,
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ) => void;
};

async function analysisJson(handle: string, requestKey: string) {
  const result = await getAnalysisForHandle(handle, { requestKey });
  return JSON.stringify(toIntent(result), null, 2);
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string; transport: string }> },
) {
  const { handle } = await params;
  const requestKey = requestKeyFromHeaders(req.headers);

  return createMcpHandler(
    (server) => {
      const mcp = server as McpServerLike;

      mcp.resource("analysis", `analysis://${handle}`, async () => ({
        contents: [
          {
            uri: `analysis://${handle}`,
            mimeType: "application/json",
            text: await analysisJson(handle, requestKey),
          },
        ],
      }));

      mcp.tool("get_analysis", "Return the full structured GitHub analysis.", {}, async () => ({
        content: [{ type: "text", text: await analysisJson(handle, requestKey) }],
      }));

      mcp.tool(
        "get_analysis_facet",
        "Return one structured facet of the GitHub analysis.",
        {
          facet: z.enum([
            "oneLineSummary",
            "primaryLanguages",
            "activityPattern",
            "spotlightRepo",
            "inferredTopics",
            "milestones",
            "greenFlags",
            "redFlags",
          ]),
        },
        async ({ facet }) => {
          const result = await getAnalysisForHandle(handle, { requestKey });
          const key = facet as keyof typeof result.analysis;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result.analysis[key], null, 2),
              },
            ],
          };
        },
      );
    },
    {
      serverInfo: {
        name: `agent-driven-web-${handle}`,
        version: "0.1.0",
      },
      capabilities: {
        tools: {},
        resources: {},
      },
    },
    {
      basePath: `/v/${handle}`,
      maxDuration: 60,
      verboseLogs: process.env.NODE_ENV === "development",
    },
  )(req);
}

export { handler as DELETE, handler as GET, handler as POST };
