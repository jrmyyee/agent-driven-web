import { WrappedExperience } from "@/components/WrappedExperience";
import { AnalysisLookupError, getAnalysisForHandle } from "@/lib/analysis-cache";
import { normaliseRenderPlan } from "@/lib/render-plan";
import { requestKeyFromHeaders } from "@/lib/usage-guard";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import WrappedLoading from "./loading";

export const runtime = "nodejs";

export default async function WrappedPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  return (
    <Suspense fallback={<WrappedLoading />}>
      <WrappedResult handle={handle} />
    </Suspense>
  );
}

async function WrappedResult({ handle }: { handle: string }) {
  try {
    const requestHeaders = new Headers(await headers());
    const result = await getAnalysisForHandle(handle, {
      requestKey: requestKeyFromHeaders(requestHeaders),
    });
    const renderPlan = normaliseRenderPlan(result);
    const { analysis, meta } = result;

    return (
      <WrappedExperience
        analysis={analysis}
        handle={handle}
        initialRenderPlan={renderPlan}
        meta={meta}
      />
    );
  } catch (error) {
    if (error instanceof AnalysisLookupError && error.status === 404) {
      return (
        <main className="home-shell">
          <section className="home-panel">
            <p className="eyebrow">Not found</p>
            <h1>We couldn&apos;t find {handle} on GitHub.</h1>
            <p>GitHub usernames are letters, numbers, and single hyphens only — no underscores or dots.</p>
            <p><Link href="/">Try another handle</Link></p>
          </section>
        </main>
      );
    }
    console.error("WrappedPage failed for handle", handle, error);
    return (
      <main className="home-shell">
        <section className="home-panel">
          <p className="eyebrow">Could not render</p>
          <h1>Something went wrong. Try again or pick a different handle.</h1>
        </section>
      </main>
    );
  }
}
