import type { GitHubAnalysis } from "@/lib/analyser";
import type { RenderPlan } from "@/lib/catalog";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { GreenFlagCard } from "./GreenFlagCard";
import { HeroQuote } from "./HeroQuote";
import { LanguageRing } from "./LanguageRing";
import { MilestoneTimeline } from "./MilestoneTimeline";
import { RedFlagCard } from "./RedFlagCard";
import { RepoSpotlight } from "./RepoSpotlight";
import { SuperlativeDeck } from "./SuperlativeDeck";
import { TopicGraph } from "./TopicGraph";
import { WorkStyleCard } from "./WorkStyleCard";
import { InfluenceMap } from "./InfluenceMap";

export function RenderPlannedComponent({
  pick,
  analysis,
}: {
  pick: RenderPlan["picks"][number];
  analysis: GitHubAnalysis;
}) {
  switch (pick.component) {
    case "HeroQuote":
      return <HeroQuote display={pick.display} summary={analysis.oneLineSummary} reason={pick.reason} />;
    case "LanguageRing":
      return <LanguageRing languages={analysis.primaryLanguages} reason={pick.reason} />;
    case "ActivityHeatmap":
      return <ActivityHeatmap activity={analysis.activityPattern} reason={pick.reason} />;
    case "RepoSpotlight":
      return analysis.spotlightRepo ? (
        <RepoSpotlight display={pick.display} repo={analysis.spotlightRepo} reason={pick.reason} />
      ) : null;
    case "TopicGraph":
      return <TopicGraph topics={analysis.inferredTopics} reason={pick.reason} />;
    case "MilestoneTimeline":
      return <MilestoneTimeline milestones={analysis.milestones} reason={pick.reason} />;
    case "RedFlagCard":
      return <RedFlagCard flags={analysis.redFlags} reason={pick.reason} />;
    case "GreenFlagCard":
      return <GreenFlagCard display={pick.display} flags={analysis.greenFlags} reason={pick.reason} />;
    case "SuperlativeDeck":
      return (
        <SuperlativeDeck
          display={pick.display}
          superlatives={analysis.creativeProfile.superlatives}
          reason={pick.reason}
        />
      );
    case "WorkStyleCard":
      return <WorkStyleCard display={pick.display} profile={analysis.creativeProfile} reason={pick.reason} />;
    case "InfluenceMap":
      return <InfluenceMap analysis={analysis} reason={pick.reason} />;
  }
}
