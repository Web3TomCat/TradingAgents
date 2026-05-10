import { clamp } from "@/lib/utils";
import type { Catalyst, CatalystType, Confidence, KeyLevel, Rating, ScoreCard } from "@/lib/types";
import { extractBullets, extractLabeledValue, firstMeaningfulSentence, keywordExcerpt, stripMarkdown } from "./markdown";

const MONTH_PATTERN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

export function parseRating(...texts: string[]): Rating {
  const text = texts.join("\n");
  const explicit = /(?:rating|final decision|action)\s*(?:\*\*)?\s*[:：]\s*(strong buy|buy|accumulate|hold|reduce|sell)/i.exec(text);
  const proposal = /FINAL TRANSACTION PROPOSAL:\s*(?:\*\*)?\s*(BUY|SELL|HOLD|REDUCE|ACCUMULATE)/i.exec(text);
  const candidate = explicit?.[1] ?? proposal?.[1];
  if (candidate) return normalizeRating(candidate);

  const lower = text.toLowerCase();
  if (lower.includes("strong buy")) return "Strong Buy";
  if (lower.includes("accumulate")) return "Accumulate";
  if (/\bbuy\b/.test(lower)) return "Buy";
  if (/\breduce\b/.test(lower) || lower.includes("trim")) return "Reduce";
  if (/\bsell\b/.test(lower)) return "Sell";
  if (/\bhold\b/.test(lower)) return "Hold";
  return "Unknown";
}

export function parseAction(...texts: string[]) {
  const text = texts.join("\n");
  return (
    extractLabeledValue(text, ["Suggested Action", "Action", "Recommendation", "Final Transaction Proposal"]) ||
    parseRating(text)
  ).toString();
}

export function parseConfidence(...texts: string[]): Confidence {
  const text = texts.join("\n");
  const explicit = /confidence\s*(?:label|score)?\s*[:：]?\s*(high|medium-high|medium high|medium|low)/i.exec(text);
  if (explicit?.[1]) return normalizeConfidence(explicit[1]);

  const highSignals = countMatches(text, /\b(high confidence|strong evidence|comprehensive|clear|decisive)\b/gi);
  const lowSignals = countMatches(text, /\b(low confidence|uncertain|not available|limited|incomplete|weak)\b/gi);
  if (highSignals >= lowSignals + 2) return "High";
  if (highSignals > lowSignals) return "Medium-High";
  if (lowSignals > highSignals + 1) return "Low";
  return "Medium";
}

export function parseKeyLevels(...texts: string[]): KeyLevel[] {
  const text = texts.join("\n");
  const levels = new Map<string, KeyLevel>();
  const linePatterns: Array<[KeyLevel["kind"], RegExp]> = [
    ["resistance", /(?:resistance|target|rally to|above)\D{0,40}\$?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*\$?\s*(\d+(?:\.\d+)?))?/i],
    ["support", /(?:support|pullback toward|retest of)\D{0,40}\$?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*\$?\s*(\d+(?:\.\d+)?))?/i],
    ["entry", /(?:entry|buy-limit|add|scale in)\D{0,50}\$?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*\$?\s*(\d+(?:\.\d+)?))?/i],
    ["stop", /(?:stop loss|stop-loss|mechanically protect)\D{0,50}\$?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*\$?\s*(\d+(?:\.\d+)?))?/i],
    ["invalidation", /(?:invalidation|closes below|below)\D{0,50}\$?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*\$?\s*(\d+(?:\.\d+)?))?/i]
  ];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    for (const [kind, pattern] of linePatterns) {
      const match = pattern.exec(line);
      if (!match) continue;
      const values = [Number(match[1]), match[2] ? Number(match[2]) : undefined].filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value)
      );
      values.forEach((value, index) => {
        const label = labelForKind(kind, value, index);
        levels.set(`${kind}-${value}`, {
          label,
          value,
          kind,
          description: stripMarkdown(line)
        });
      });
    }
  }

  if (levels.size === 0) {
    const numericValues = Array.from(text.matchAll(/\$\s*(\d{2,4}(?:\.\d+)?)/g))
      .map((match) => Number(match[1]))
      .filter((value) => value > 1);
    const unique = Array.from(new Set(numericValues)).slice(0, 5);
    unique.forEach((value, index) => {
      const kind: KeyLevel["kind"] = index === 0 ? "entry" : index === 1 ? "support" : "resistance";
      levels.set(`${kind}-${value}`, {
        label: labelForKind(kind, value),
        value,
        kind
      });
    });
  }

  return Array.from(levels.values()).sort((a, b) => a.value - b.value);
}

export function parseCatalysts(text = "", preferredType?: CatalystType): Catalyst[] {
  const sourceBlocks = text
    .split(/\n(?=(?:[-*]\s+|\d+\.\s+|#{2,4}\s+|\*\*))/)
    .map((block) => block.trim())
    .filter((block) => block.length > 25);

  const catalysts: Catalyst[] = [];
  sourceBlocks.forEach((block, index) => {
    const clean = stripMarkdown(block);
    const isCatalyst = /\b(catalyst|earnings|guidance|analyst|upgrade|downgrade|launch|partnership|regulatory|macro|inflation|rate|event|date|release|delivery|conference|margin|revenue|AWS|AI)\b/i.test(clean);
    const hasDate = new RegExp(`\\b${MONTH_PATTERN}\\s+\\d{1,2}|\\b\\d{4}-\\d{2}-\\d{2}\\b`, "i").test(clean);
    if (!isCatalyst && !hasDate) return;

    const type = preferredType ?? inferCatalystType(clean);
    const date = parseDate(clean);
    const confidence = parseConfidence(clean);
    catalysts.push({
      id: `cat-${index}-${hashString(clean)}`,
      title: clean.split(/[.!?。！？]/)[0].slice(0, 120),
      date,
      source: inferSource(clean),
      confidence,
      type,
      excerpt: clean.slice(0, 360)
    });
  });

  return dedupeCatalysts(catalysts).slice(0, 16);
}

export function scoreFromText(label: string, text: string, positive: string[], negative: string[], fallback = 55): ScoreCard {
  const clean = stripMarkdown(text);
  const positiveScore = positive.reduce((sum, word) => sum + countMatches(clean, new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi")), 0);
  const negativeScore = negative.reduce((sum, word) => sum + countMatches(clean, new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi")), 0);
  const score = clamp(fallback + positiveScore * 8 - negativeScore * 8);
  return {
    label,
    score,
    detail:
      keywordExcerpt(text, [...positive, ...negative], firstMeaningfulSentence(text)) ||
      "No explicit data found in the report."
  };
}

export function extractThesis(text = "", labels: string[]) {
  const labeled = extractLabeledValue(text, labels);
  if (labeled) return labeled;
  return firstMeaningfulSentence(text);
}

export function extractListByKeywords(text = "", keywords: string[], maxItems = 5) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => keywords.some((keyword) => paragraph.toLowerCase().includes(keyword.toLowerCase())));
  const bullets = paragraphs.flatMap((paragraph) => extractBullets(paragraph, 3));
  return Array.from(new Set(bullets)).slice(0, maxItems);
}

function normalizeRating(value: string): Rating {
  const normalized = value.toLowerCase().replace(/[_-]/g, " ").trim();
  if (normalized === "strong buy") return "Strong Buy";
  if (normalized === "buy") return "Buy";
  if (normalized === "accumulate") return "Accumulate";
  if (normalized === "hold") return "Hold";
  if (normalized === "reduce") return "Reduce";
  if (normalized === "sell") return "Sell";
  return "Unknown";
}

function normalizeConfidence(value: string): Confidence {
  const normalized = value.toLowerCase().replace(/\s+/g, "-");
  if (normalized === "high") return "High";
  if (normalized === "medium-high") return "Medium-High";
  if (normalized === "medium") return "Medium";
  if (normalized === "low") return "Low";
  return "Unknown";
}

function labelForKind(kind: KeyLevel["kind"], value: number, index = 0) {
  const prefix: Record<KeyLevel["kind"], string> = {
    support: "Support",
    resistance: "Resistance",
    entry: index === 0 ? "Entry Zone" : "Entry Upper",
    stop: "Stop Loss",
    invalidation: "Invalidation",
    target: "Target"
  };
  return `${prefix[kind]} ${value}`;
}

function parseDate(text: string) {
  const iso = /\b(20\d{2}-\d{2}-\d{2})\b/.exec(text);
  if (iso?.[1]) return iso[1];
  const month = new RegExp(`\\b(${MONTH_PATTERN}\\s+\\d{1,2}(?:,\\s*20\\d{2})?)`, "i").exec(text);
  return month?.[1];
}

function inferSource(text: string) {
  const source = /\b(Benzinga|CNBC|Yahoo Finance|Business Wire|Seeking Alpha|MSN|Reuters|Bloomberg|The Motley Fool|Simply Wall St|Fox Business)\b/i.exec(text);
  return source?.[1];
}

function inferCatalystType(text: string): CatalystType {
  if (/\b(verified|reported|announced|released|filed|published)\b/i.test(text)) return "verified";
  if (/\b(may|could|suggests|implies|appears|interpretation|pricing in)\b/i.test(text)) return "interpretation";
  if (/\b(unconfirmed|rumor|low confidence|limited|not available)\b/i.test(text)) return "low-confidence";
  return "interpretation";
}

function dedupeCatalysts(catalysts: Catalyst[]) {
  const seen = new Set<string>();
  return catalysts.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countMatches(text: string, pattern: RegExp) {
  return Array.from(text.matchAll(pattern)).length;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
