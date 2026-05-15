import type { RenderPlan } from "./catalog";

export const LENS_NAMES = [
  "recruiter",
  "founder",
  "technical-peer",
  "maintainer",
  "caveman",
  "custom",
] as const;

export type LensName = (typeof LENS_NAMES)[number];
export type PresetLensName = Exclude<LensName, "custom">;

export const LENS_LABELS: Record<LensName, string> = {
  recruiter: "Recruiter",
  founder: "Founder",
  "technical-peer": "Technical peer",
  maintainer: "Maintainer",
  caveman: "Caveman",
  custom: "Custom",
};

export type LensChangeLog = {
  summary: string;
  added: string[];
  removed: string[];
  retained: string[];
};

export type LensApplyResponse = {
  reply: string;
  lens: LensName;
  lensLabel: string;
  renderPlan: RenderPlan;
  changeLog: LensChangeLog;
};

export type LensRequest = {
  lens: LensName;
  label: string;
};

export function detectPresetLens(text: string): PresetLensName | null {
  const normalized = text.toLowerCase();
  if (/\bcave\s*man\b|\bcaveman\b|\bstone age\b|\bunga\b/.test(normalized)) return "caveman";
  if (/\brecruit|hiring|hire|cv|resume|job\b/.test(normalized)) return "recruiter";
  if (/\bfounder|investor|startup|pitch|fundrais|customer\b/.test(normalized)) return "founder";
  if (/\bpeer|engineer|technical|architect|staff|principal\b/.test(normalized)) {
    return "technical-peer";
  }
  if (/\bmaintainer|oss|open source|contributor|community\b/.test(normalized)) return "maintainer";
  return null;
}

export function isApplyIntent(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\b(apply|update|change|switch|reframe|rewrite|render)\b.*\b(fe|front\s*end|view|page|wrapped|ui|version|mode|lens|style)\b/.test(
      normalized,
    ) ||
    /\bmake\s+(it|this|the\s+page|the\s+wrapped)\b/.test(normalized) ||
    /\bturn\s+(it|this|the\s+page|the\s+wrapped)\s+into\b/.test(normalized) ||
    /\b(update|change)\s+the\s+(fe|front\s*end|view|page|wrapped|ui)\b/.test(normalized) ||
    /\b(do it|yes,?\s*apply|apply it)\b/.test(normalized)
  );
}

function titleCaseLabel(value: string) {
  const cleaned = value
    .replace(/[?.!,;:]+$/g, "")
    .replace(/\b(view|mode|version|lens|style|ui|page|wrapped)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");

  if (!cleaned) return "Custom";
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferCustomLabel(text: string) {
  const normalized = text.trim();
  const patterns = [
    /\blike\s+(?:a|an|the)?\s*([^,.!?]+)/i,
    /\bfor\s+(?:a|an|the)?\s*([^,.!?]+)/i,
    /\bas\s+(?:a|an|the)?\s*([^,.!?]+)/i,
    /\bmake\s+(?:it|this|the\s+page|the\s+wrapped)\s+([^,.!?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return titleCaseLabel(match[1]);
  }

  return "Custom";
}

export function detectLensRequest(text: string): LensRequest | null {
  const preset = detectPresetLens(text);
  if (preset) return { lens: preset, label: LENS_LABELS[preset] };
  if (!isApplyIntent(text)) return null;
  return { lens: "custom", label: inferCustomLabel(text) };
}
