import { companyNameForTicker } from "@/lib/company-names";
import type { Catalyst, KeyLevel, ParsedReport, PricePoint, ReportDiff, ScoreCard, TradingAgentsState } from "@/lib/types";
import { clamp } from "@/lib/utils";
import { extractLabeledValue, extractSection, firstMeaningfulSentence, keywordExcerpt, stripMarkdown } from "./markdown";
import {
  extractListByKeywords,
  extractThesis,
  parseAction,
  parseCatalysts,
  parseConfidence,
  parseKeyLevels,
  parseRating,
  scoreFromText
} from "./extractors";

export interface ReportMeta {
  fileName: string;
  generatedAt?: string;
}

export function parseTradingAgentsReport(raw: TradingAgentsState, meta: ReportMeta): ParsedReport {
  const ticker = (raw.company_of_interest || parseTickerFromFile(meta.fileName) || "UNKNOWN").toUpperCase();
  const generatedAt = meta.generatedAt ?? parseGeneratedAtFromFile(meta.fileName);
  const marketRaw = raw.market_report ?? "";
  const sentimentRaw = raw.sentiment_report ?? "";
  const newsRaw = raw.news_report ?? "";
  const fundamentalsRaw = raw.fundamentals_report ?? "";
  const finalRaw = raw.final_trade_decision ?? raw.risk_debate_state?.judge_decision ?? raw.trader_investment_plan ?? "";
  const traderPlan = raw.trader_investment_plan ?? "";
  const investmentPlan = raw.investment_plan ?? raw.investment_debate_state?.judge_decision ?? "";
  const riskRaw = raw.risk_debate_state?.judge_decision ?? raw.risk_debate_state?.history ?? "";

  const keyLevels = parseKeyLevels(marketRaw, finalRaw, traderPlan, riskRaw);
  const rating = parseRating(finalRaw, traderPlan, investmentPlan);
  const action = parseAction(finalRaw, traderPlan, investmentPlan);
  const confidence = parseConfidence(finalRaw, marketRaw, sentimentRaw, newsRaw, fundamentalsRaw);

  const verified = parseCatalysts(extractSection(newsRaw, "Verified News") || newsRaw, "verified");
  const interpretations = parseCatalysts(
    [
      extractSection(newsRaw, ["Interpretation", "Market Narrative", "Narrative"]),
      extractSection(sentimentRaw, ["Dominant Narrative", "Sentiment-Based Trading Implication"])
    ].join("\n\n"),
    "interpretation"
  );
  const lowConfidence = parseCatalysts(
    [
      extractSection(newsRaw, ["Low-Confidence", "Risks", "Data Coverage"]),
      extractSection(sentimentRaw, ["Negative Sentiment Drivers"])
    ].join("\n\n"),
    "low-confidence"
  );
  const catalysts = mergeCatalysts([...verified, ...interpretations, ...lowConfidence, ...parseCatalysts(finalRaw)]);

  const trendRegime = cleanSection(extractSection(marketRaw, "Trend Regime"), marketRaw);
  const breakoutQuality = cleanSection(extractSection(marketRaw, ["Breakout", "Pullback Quality"]), marketRaw);
  const positioningRisk = cleanSection(extractSection(marketRaw, ["Positioning Risk", "Crowding"]), sentimentRaw);
  const chasingRisk = cleanSection(extractSection(marketRaw, "Chasing Risk"), marketRaw);
  const dominantNarrative = cleanSection(extractSection(sentimentRaw, ["Dominant Narrative", "Market Narrative"]), sentimentRaw);
  const keyRisk =
    keywordExcerpt(finalRaw, ["risk", "below", "downside", "slowdown", "CapEx"], "") ||
    keywordExcerpt(sentimentRaw, ["risk", "crowding", "reversal"], "") ||
    firstMeaningfulSentence(riskRaw, "No explicit key risk found.");

  const revenueDurability = scoreFromText(
    "Revenue durability",
    fundamentalsRaw,
    ["durable", "growth", "recurring", "beat", "diversified", "AWS", "advertising"],
    ["decline", "slowdown", "cyclical", "pressure", "weak"],
    62
  );
  const marginTrend = scoreFromText(
    "Margin trend",
    fundamentalsRaw,
    ["margin", "expanded", "leverage", "operating income", "efficiency"],
    ["compression", "pressure", "cost", "CapEx", "investment"],
    58
  );
  const cashRunway = scoreFromText(
    "Cash runway",
    fundamentalsRaw,
    ["cash", "free cash flow", "liquidity", "balance sheet", "runway"],
    ["debt", "negative", "burn", "SBC", "dilution"],
    56
  );
  const valuationExpectations = scoreFromText(
    "Valuation expectations",
    fundamentalsRaw,
    ["justified", "upside", "multiple", "ROIC", "growth"],
    ["premium", "expensive", "priced in", "limited upside", "overvalued"],
    52
  );
  const dilutionRisk = scoreFromText(
    "Dilution risk",
    fundamentalsRaw,
    ["buyback", "cash generation", "self-funded", "low dilution"],
    ["dilution", "stock-based compensation", "SBC", "issuance"],
    45
  );
  const businessQuality = scoreFromText(
    "Business quality",
    fundamentalsRaw,
    ["moat", "quality", "scale", "durable", "leader", "high-teen ROIC"],
    ["fragile", "competitive", "regulatory", "low margin"],
    66
  );

  const debate = parseDebate(raw, rating);
  const risk = parseRisk(raw, riskRaw, finalRaw);

  return {
    id: meta.fileName.replace(/\.json$/, ""),
    fileName: meta.fileName,
    ticker,
    companyName: companyNameForTicker(ticker),
    tradeDate: raw.trade_date ?? "",
    generatedAt,
    rating,
    action,
    confidence,
    finalDecision: {
      raw: finalRaw,
      executiveSummary: extractLongLabel(finalRaw, "Executive Summary") || firstMeaningfulSentence(finalRaw),
      thesis: extractLongLabel(finalRaw, "Investment Thesis") || firstMeaningfulSentence(investmentPlan),
      timeHorizon: extractLabeledValue(finalRaw, ["Time Horizon", "Expected Time Horizon"]) || "Unspecified",
      keyCatalyst: extractKeyCatalyst(finalRaw, catalysts),
      riskReward: keywordExcerpt(finalRaw, ["risk/reward", "asymmetry", "upside", "downside"], "Balanced risk/reward is implied by the final decision."),
      invalidation: extractInvalidation(finalRaw, marketRaw, keyLevels)
    },
    market: {
      raw: marketRaw,
      trendRegime,
      breakoutQuality,
      positioningRisk,
      chasingRisk,
      marketRegime: inferMarketRegime(marketRaw, sentimentRaw),
      keyNarrative: firstMeaningfulSentence(dominantNarrative, firstMeaningfulSentence(sentimentRaw)),
      keyRisk: firstMeaningfulSentence(keyRisk),
      priceSeries: buildPriceSeries(keyLevels, marketRaw)
    },
    sentiment: {
      raw: sentimentRaw,
      direction: cleanSection(extractSection(sentimentRaw, "Sentiment Direction"), sentimentRaw),
      crowdingRisk: cleanSection(extractSection(sentimentRaw, ["Crowding", "Positioning Risk"]), sentimentRaw),
      retailAttention: scoreFromText(
        "Retail attention",
        sentimentRaw,
        ["trending", "retail", "attention", "six-day rally", "momentum"],
        ["not available", "muted", "low"],
        55
      ),
      narrativeMomentum: scoreFromText(
        "Narrative momentum",
        sentimentRaw,
        ["improving", "bullish", "accelerating", "strong narrative", "positive"],
        ["decelerating", "plateauing", "fading", "exhaustion"],
        60
      ),
      reversalRisk: scoreFromText(
        "Reversal risk",
        sentimentRaw,
        ["crowded", "elevated", "exhaustion", "profit-taking", "consensus"],
        ["under-owned", "reset", "skepticism"],
        48
      )
    },
    news: {
      raw: newsRaw,
      narrativeSummary: firstMeaningfulSentence(
        extractSection(newsRaw, ["Market Narrative", "Executive Summary", "News Analysis"]) || dominantNarrative || newsRaw
      ),
      verified,
      interpretations,
      lowConfidence,
      timeline: catalysts
    },
    fundamentals: {
      raw: fundamentalsRaw,
      revenueDurability,
      marginTrend,
      cashRunway,
      valuationExpectations,
      dilutionRisk,
      businessQuality,
      revenueTrend: buildTrendSeries(revenueDurability.score, "Revenue"),
      marginTrendSeries: buildTrendSeries(marginTrend.score, "Margin"),
      cashDebtSeries: buildCashDebtSeries(cashRunway.score, fundamentalsRaw)
    },
    debate,
    risk,
    keyLevels,
    catalysts,
    raw
  };
}

export function buildReportDiff(current: ParsedReport, previous?: ParsedReport): ReportDiff {
  if (!previous) {
    return {
      currentRating: current.rating,
      ratingChanged: false,
      addedNarratives: [],
      removedNarratives: [],
      levelChanges: []
    };
  }

  const currentNarratives = extractNarrativeTerms(current.market.keyNarrative + " " + current.finalDecision.thesis);
  const previousNarratives = extractNarrativeTerms(previous.market.keyNarrative + " " + previous.finalDecision.thesis);

  const labels = new Set([...current.keyLevels.map((level) => level.kind), ...previous.keyLevels.map((level) => level.kind)]);
  const levelChanges = Array.from(labels).map((label) => ({
    label,
    previous: firstLevel(previous.keyLevels, label),
    current: firstLevel(current.keyLevels, label)
  }));

  return {
    previousId: previous.id,
    ratingChanged: current.rating !== previous.rating,
    previousRating: previous.rating,
    currentRating: current.rating,
    addedNarratives: currentNarratives.filter((term) => !previousNarratives.includes(term)).slice(0, 8),
    removedNarratives: previousNarratives.filter((term) => !currentNarratives.includes(term)).slice(0, 8),
    levelChanges
  };
}

function parseDebate(raw: TradingAgentsState, rating: ParsedReport["rating"]) {
  const debate = raw.investment_debate_state;
  const bullTranscript = debate?.bull_history ?? "";
  const bearTranscript = debate?.bear_history ?? "";
  const judgeDecision = debate?.judge_decision ?? raw.investment_plan ?? "";
  const joined = `${bullTranscript}\n${bearTranscript}\n${judgeDecision}`;
  const bullStrength = scoreFromText("Bull strength", bullTranscript, ["growth", "upside", "moat", "beat", "margin", "AWS", "AI"], ["risk", "priced in"], 58).score;
  const bearStrength = scoreFromText("Bear strength", bearTranscript, ["risk", "expensive", "crowded", "slowdown", "CapEx", "negative"], ["upside", "moat"], 52).score;
  const ratingBias = rating === "Buy" || rating === "Strong Buy" || rating === "Accumulate" ? 8 : rating === "Sell" || rating === "Reduce" ? -8 : 0;

  return {
    bullThesis: extractThesis(bullTranscript, ["Core Thesis", "Bull Thesis", "Thesis"]) || firstMeaningfulSentence(judgeDecision),
    bearThesis: extractThesis(bearTranscript, ["Core Thesis", "Bear Thesis", "Thesis"]) || firstMeaningfulSentence(judgeDecision),
    bullEvidence: extractListByKeywords(bullTranscript, ["evidence", "growth", "margin", "AWS", "catalyst", "upside"], 6),
    bearEvidence: extractListByKeywords(bearTranscript, ["risk", "evidence", "valuation", "CapEx", "slowdown", "crowded"], 6),
    catalysts: extractListByKeywords(joined, ["catalyst", "earnings", "guidance", "AWS", "AI", "margin"], 6),
    risks: extractListByKeywords(joined, ["risk", "downside", "crowded", "slowdown", "valuation", "CapEx"], 6),
    invalidation:
      keywordExcerpt(joined, ["invalidation", "below", "break", "failure"], "No explicit debate invalidation was found."),
    debateScore: clamp(50 + (bullStrength - bearStrength) / 2 + ratingBias),
    convictionScore: clamp((bullStrength + bearStrength) / 2),
    narrativeStrengthScore: scoreFromText("Narrative strength", joined, ["narrative", "structural", "variant", "catalyst", "priced"], ["unclear", "weak"], 60).score,
    bullTranscript,
    bearTranscript,
    judgeDecision
  };
}

function parseRisk(raw: TradingAgentsState, riskRaw: string, finalRaw: string) {
  const state = raw.risk_debate_state;
  const joined = `${riskRaw}\n${state?.aggressive_history ?? ""}\n${state?.neutral_history ?? ""}\n${state?.conservative_history ?? ""}\n${finalRaw}`;
  const volatilityRisk = scoreFromText("Volatility", joined, ["volatility", "rally", "drawdown", "pullback", "extended"], ["stable", "low volatility"], 55);
  const liquidityRisk = scoreFromText("Liquidity", joined, ["liquidity", "spread", "mega-cap", "widely held"], ["illiquid", "thin"], 35);
  const macroRisk = scoreFromText("Macro", joined, ["macro", "inflation", "rates", "consumer", "recession", "tariff"], ["resilient", "defensive"], 52);

  return {
    summary: firstMeaningfulSentence(riskRaw || finalRaw),
    scenarios: extractListByKeywords(joined, ["downside", "scenario", "risk", "below", "slowdown", "reduce"], 6),
    positionSizing:
      extractLabeledValue(finalRaw, ["Position Sizing", "Positioning Guidance"]) ||
      keywordExcerpt(finalRaw, ["position", "sizing", "weight", "trim", "add"], "No explicit position sizing recommendation found."),
    volatilityRisk,
    liquidityRisk,
    macroRisk,
    matrix: buildRiskMatrix(joined, volatilityRisk, liquidityRisk, macroRisk),
    transcripts: {
      aggressive: state?.aggressive_history,
      neutral: state?.neutral_history,
      conservative: state?.conservative_history,
      judge: state?.judge_decision
    }
  };
}

function buildRiskMatrix(joined: string, volatility: ScoreCard, liquidity: ScoreCard, macro: ScoreCard) {
  const valuation = scoreFromText("Valuation", joined, ["valuation", "premium", "multiple", "priced in"], ["cheap", "discount"], 58);
  const fundamental = scoreFromText("Fundamental", joined, ["CapEx", "free cash flow", "margin", "consumer", "AWS"], ["beat", "durable"], 54);
  return [
    { risk: "Volatility", probability: volatility.score, impact: clamp(volatility.score + 8), mitigation: "Scale entries around support and resistance." },
    { risk: "Liquidity", probability: liquidity.score, impact: clamp(liquidity.score - 10), mitigation: "Use ordinary position sizing; avoid chasing gaps." },
    { risk: "Macro", probability: macro.score, impact: clamp(macro.score + 4), mitigation: "Monitor consumer and rate-sensitive data." },
    { risk: "Valuation", probability: valuation.score, impact: clamp(valuation.score + 12), mitigation: "Demand catalyst confirmation before adding." },
    { risk: "Fundamental", probability: fundamental.score, impact: clamp(fundamental.score + 10), mitigation: "Track margin, FCF and guidance revisions." }
  ];
}

function buildPriceSeries(levels: KeyLevel[], marketRaw: string): PricePoint[] {
  const support = pickLevel(levels, "support") ?? pickLevel(levels, "invalidation");
  const resistance = pickLevel(levels, "resistance") ?? maxLevel(levels);
  const entry = pickLevel(levels, "entry") ?? support;
  const invalidation = pickLevel(levels, "invalidation") ?? pickLevel(levels, "stop") ?? support;
  const current = inferCurrentPrice(marketRaw, levels);
  const low = Math.min(...[support, invalidation, entry, current].filter(isNumber));
  const high = Math.max(...[resistance, current, entry].filter(isNumber));

  if (!isNumber(low) || !isNumber(high) || low === high) {
    return [
      { name: "T-4", price: 92 },
      { name: "T-3", price: 96 },
      { name: "T-2", price: 101 },
      { name: "T-1", price: 99 },
      { name: "Now", price: 104 }
    ];
  }

  const span = high - low;
  return [
    { name: "T-5", price: round(low + span * 0.18), support, resistance, entry, invalidation },
    { name: "T-4", price: round(low + span * 0.32), support, resistance, entry, invalidation },
    { name: "T-3", price: round(low + span * 0.48), support, resistance, entry, invalidation },
    { name: "T-2", price: round(low + span * 0.72), support, resistance, entry, invalidation },
    { name: "T-1", price: round(high - span * 0.1), support, resistance, entry, invalidation },
    { name: "Now", price: round(current ?? entry ?? high - span * 0.2), support, resistance, entry, invalidation }
  ];
}

function buildTrendSeries(score: number, label: string) {
  const base = Math.max(18, score - 28);
  return [
    { period: "T-4", value: Math.round(base) },
    { period: "T-3", value: Math.round(base + score * 0.12) },
    { period: "T-2", value: Math.round(base + score * 0.2) },
    { period: "T-1", value: Math.round(base + score * 0.27) },
    { period: "Now", value: Math.round(score) }
  ].map((point) => ({ ...point, period: `${label} ${point.period}`.replace(`${label} `, "") }));
}

function buildCashDebtSeries(score: number, fundamentalsRaw: string) {
  const moneyValues = Array.from(fundamentalsRaw.matchAll(/\$?\s*(\d+(?:\.\d+)?)\s*(B|billion|bn)/g)).map((match) => Number(match[1]));
  const cash = moneyValues[0] ?? score * 1.2;
  const debt = moneyValues[1] ?? Math.max(10, (100 - score) * 0.8);
  return [
    { name: "Prior", cash: round(cash * 0.82), debt: round(debt * 1.08) },
    { name: "Current", cash: round(cash), debt: round(debt) }
  ];
}

function inferCurrentPrice(text: string, levels: KeyLevel[]) {
  const explicit = /current (?:level|price|weight).*?\$?\s*(\d+(?:\.\d+)?)/i.exec(text);
  if (explicit?.[1]) return Number(explicit[1]);
  const near = /near (?:the )?(?:\$)?\s*(\d+(?:\.\d+)?)/i.exec(text);
  if (near?.[1]) return Number(near[1]);
  const values = levels.map((level) => level.value);
  if (values.length) return round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return undefined;
}

function inferMarketRegime(marketRaw: string, sentimentRaw: string) {
  const joined = `${marketRaw}\n${sentimentRaw}`.toLowerCase();
  if (joined.includes("uptrend") || joined.includes("bullish alignment")) return "Uptrend / constructive tape";
  if (joined.includes("downtrend") || joined.includes("breakdown")) return "Downtrend / defensive tape";
  if (joined.includes("range") || joined.includes("consolidation")) return "Range-bound consolidation";
  return "Mixed regime";
}

function cleanSection(section: string, fallbackText: string) {
  if (!section) return firstMeaningfulSentence(fallbackText);
  return firstMeaningfulSentence(section);
}

function extractLongLabel(text: string, label: string) {
  const pattern = new RegExp(`\\*\\*${escapeRegExp(label)}\\*\\*\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*[^*]+\\*\\*\\s*[:：]|$)`, "i");
  const match = pattern.exec(text);
  if (match?.[1]) return stripMarkdown(match[1]).trim();
  return extractLabeledValue(text, [label]);
}

function extractKeyCatalyst(finalRaw: string, catalysts: Catalyst[]) {
  const explicit = extractLabeledValue(finalRaw, ["Key Catalyst", "Catalyst"]);
  if (explicit) return explicit;
  return catalysts[0]?.title ?? keywordExcerpt(finalRaw, ["catalyst", "earnings", "guidance"], "No explicit catalyst identified.");
}

function extractInvalidation(finalRaw: string, marketRaw: string, levels: KeyLevel[]) {
  const explicit = extractLabeledValue(finalRaw, ["Invalidation", "Invalidation Condition"]);
  if (explicit) return explicit;
  const line = keywordExcerpt(`${finalRaw}\n${marketRaw}`, ["invalidation", "below", "closes below", "stop"], "");
  if (line) return line;
  const level = levels.find((item) => item.kind === "invalidation" || item.kind === "stop");
  return level ? `${level.label}: ${level.value}` : "No explicit invalidation found.";
}

function parseTickerFromFile(fileName: string) {
  return /^([A-Z.]+)_/.exec(fileName)?.[1];
}

function parseGeneratedAtFromFile(fileName: string) {
  const match = /_(20\d{6}_\d{6})_state\.json$/.exec(fileName);
  if (!match?.[1]) return "";
  return `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)} ${match[1].slice(9, 11)}:${match[1].slice(11, 13)}:${match[1].slice(13, 15)}`;
}

function mergeCatalysts(items: Catalyst[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 90);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractNarrativeTerms(text: string) {
  const stopWords = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "risk", "stock", "market", "position"]);
  return Array.from(
    new Set(
      stripMarkdown(text)
        .toLowerCase()
        .match(/\b[a-z][a-z0-9-]{3,}\b/g)
        ?.filter((term) => !stopWords.has(term)) ?? []
    )
  ).slice(0, 30);
}

function firstLevel(levels: KeyLevel[], kind: string) {
  return levels.find((level) => level.kind === kind)?.value;
}

function pickLevel(levels: KeyLevel[], kind: KeyLevel["kind"]) {
  return levels.find((level) => level.kind === kind)?.value;
}

function maxLevel(levels: KeyLevel[]) {
  if (!levels.length) return undefined;
  return Math.max(...levels.map((level) => level.value));
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
