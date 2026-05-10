export type Rating =
  | "Strong Buy"
  | "Buy"
  | "Accumulate"
  | "Hold"
  | "Reduce"
  | "Sell"
  | "Unknown";

export type Confidence = "High" | "Medium-High" | "Medium" | "Low" | "Unknown";

export type CatalystType = "verified" | "interpretation" | "low-confidence";

export interface TradingAgentsState {
  messages?: unknown[];
  company_of_interest: string;
  trade_date: string;
  sender?: string;
  market_report?: string;
  sentiment_report?: string;
  news_report?: string;
  fundamentals_report?: string;
  investment_debate_state?: InvestmentDebateState;
  investment_plan?: string;
  trader_investment_plan?: string;
  risk_debate_state?: RiskDebateState;
  final_trade_decision?: string;
  past_context?: string;
}

export interface InvestmentDebateState {
  judge_decision?: string;
  history?: string;
  bear_history?: string;
  bull_history?: string;
  current_response?: string;
  count?: number;
}

export interface RiskDebateState {
  judge_decision?: string;
  history?: string;
  aggressive_history?: string;
  conservative_history?: string;
  neutral_history?: string;
  latest_speaker?: string;
  current_aggressive_response?: string;
  current_conservative_response?: string;
  current_neutral_response?: string;
  count?: number;
}

export interface MarkdownBlock {
  level: number;
  title: string;
  content: string;
}

export interface KeyLevel {
  label: string;
  value: number;
  kind: "support" | "resistance" | "entry" | "stop" | "invalidation" | "target";
  description?: string;
}

export interface Catalyst {
  id: string;
  title: string;
  date?: string;
  source?: string;
  confidence: Confidence;
  type: CatalystType;
  excerpt: string;
}

export interface ScoreCard {
  label: string;
  score: number;
  detail: string;
}

export interface PricePoint {
  name: string;
  price: number;
  support?: number;
  resistance?: number;
  entry?: number;
  invalidation?: number;
}

export interface DebateView {
  bullThesis: string;
  bearThesis: string;
  bullEvidence: string[];
  bearEvidence: string[];
  catalysts: string[];
  risks: string[];
  invalidation: string;
  debateScore: number;
  convictionScore: number;
  narrativeStrengthScore: number;
  bullTranscript: string;
  bearTranscript: string;
  judgeDecision: string;
}

export interface RiskView {
  summary: string;
  scenarios: string[];
  positionSizing: string;
  volatilityRisk: ScoreCard;
  liquidityRisk: ScoreCard;
  macroRisk: ScoreCard;
  matrix: Array<{
    risk: string;
    probability: number;
    impact: number;
    mitigation: string;
  }>;
  transcripts: {
    aggressive?: string;
    neutral?: string;
    conservative?: string;
    judge?: string;
  };
}

export interface ParsedReport {
  id: string;
  fileName: string;
  ticker: string;
  companyName: string;
  tradeDate: string;
  generatedAt: string;
  rating: Rating;
  action: string;
  confidence: Confidence;
  finalDecision: {
    raw: string;
    executiveSummary: string;
    thesis: string;
    timeHorizon: string;
    keyCatalyst: string;
    riskReward: string;
    invalidation: string;
  };
  market: {
    raw: string;
    trendRegime: string;
    breakoutQuality: string;
    positioningRisk: string;
    chasingRisk: string;
    marketRegime: string;
    keyNarrative: string;
    keyRisk: string;
    priceSeries: PricePoint[];
  };
  sentiment: {
    raw: string;
    direction: string;
    crowdingRisk: string;
    retailAttention: ScoreCard;
    narrativeMomentum: ScoreCard;
    reversalRisk: ScoreCard;
  };
  news: {
    raw: string;
    narrativeSummary: string;
    verified: Catalyst[];
    interpretations: Catalyst[];
    lowConfidence: Catalyst[];
    timeline: Catalyst[];
  };
  fundamentals: {
    raw: string;
    revenueDurability: ScoreCard;
    marginTrend: ScoreCard;
    cashRunway: ScoreCard;
    valuationExpectations: ScoreCard;
    dilutionRisk: ScoreCard;
    businessQuality: ScoreCard;
    revenueTrend: Array<{ period: string; value: number }>;
    marginTrendSeries: Array<{ period: string; value: number }>;
    cashDebtSeries: Array<{ name: string; cash: number; debt: number }>;
  };
  debate: DebateView;
  risk: RiskView;
  keyLevels: KeyLevel[];
  catalysts: Catalyst[];
  raw: TradingAgentsState;
}

export interface ReportDiff {
  previousId?: string;
  ratingChanged: boolean;
  previousRating?: Rating;
  currentRating: Rating;
  addedNarratives: string[];
  removedNarratives: string[];
  levelChanges: Array<{
    label: string;
    previous?: number;
    current?: number;
  }>;
}
