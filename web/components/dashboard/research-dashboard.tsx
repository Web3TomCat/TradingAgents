"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CopyCheck,
  Crosshair,
  Database,
  FileText,
  Gauge,
  Layers3,
  LineChart,
  Newspaper,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Separator } from "@/components/ui/separator";
import {
  CashDebtChart,
  EntryInvalidationRange,
  KeyLevelsChart,
  PriceStructureChart,
  RiskMatrixChart,
  ScoreGauge,
  TrendChart
} from "@/components/dashboard/charts";
import { LocalJsonLoader } from "@/components/dashboard/local-json-loader";
import { MarkdownPanel } from "@/components/dashboard/markdown-panel";
import { MetricTile } from "@/components/dashboard/metric-tile";
import { ReportActions } from "@/components/dashboard/report-actions";
import { buildReportDiff } from "@/lib/parsers/report-parser";
import type { Catalyst, KeyLevel, ParsedReport, ReportDiff, ScoreCard } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

interface ResearchDashboardProps {
  reports: ParsedReport[];
  initialReport?: ParsedReport;
  latestByTicker: ParsedReport[];
  initialDiff?: ReportDiff;
}

export function ResearchDashboard({ reports, initialReport, latestByTicker, initialDiff }: ResearchDashboardProps) {
  const [selectedId, setSelectedId] = useState(initialReport?.id ?? "");
  const [localReport, setLocalReport] = useState<ParsedReport | null>(null);

  const selected = localReport ?? reports.find((report) => report.id === selectedId) ?? initialReport;
  const previous = selected
    ? reports.find((report) => report.ticker === selected.ticker && report.id !== selected.id)
    : undefined;
  const diff = selected ? buildReportDiff(selected, previous) : initialDiff;
  const allLatest = localReport ? [localReport, ...latestByTicker.filter((item) => item.ticker !== localReport.ticker)] : latestByTicker;

  if (!selected) return <EmptyDashboard onLoad={setLocalReport} />;

  return (
    <div className="mx-auto grid max-w-[1480px] gap-4">
      <TopHeader
        report={selected}
        reports={reports}
        selectedId={selectedId}
        localReport={localReport}
        onSelect={(id) => {
          setLocalReport(null);
          setSelectedId(id);
        }}
        onLoad={setLocalReport}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="grid gap-4"
        >
          <HeroSection report={selected} />
          <MarketStructureSection report={selected} />
          <BullBearSection report={selected} />
          <NewsNarrativeSection report={selected} />
          <FundamentalsSection report={selected} />
          <SentimentSection report={selected} />
          <RiskManagementSection report={selected} />
          <FinalDecisionSection report={selected} />
          <AdvancedResearchSection report={selected} reports={reports} latestByTicker={allLatest} diff={diff} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TopHeader({
  report,
  reports,
  selectedId,
  localReport,
  onSelect,
  onLoad
}: {
  report: ParsedReport;
  reports: ParsedReport[];
  selectedId: string;
  localReport: ParsedReport | null;
  onSelect: (id: string) => void;
  onLoad: (report: ParsedReport) => void;
}) {
  return (
    <header className="sticky top-3 z-30 rounded-lg border border-zinc-800 bg-black/[0.88] px-3 py-3 shadow-terminal backdrop-blur-xl">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{report.ticker}</h1>
            <span className="text-sm text-zinc-500">{report.companyName}</span>
          </div>
          <Badge variant={ratingVariant(report.rating)}>{report.rating}</Badge>
          <Badge variant={confidenceVariant(report.confidence)}>{report.confidence} confidence</Badge>
          <Badge variant="info">{report.action}</Badge>
          <div className="hidden h-5 w-px bg-zinc-800 md:block" />
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <CalendarClock className="h-3.5 w-3.5" />
            Trade date {report.tradeDate}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock3 className="h-3.5 w-3.5" />
            Generated {report.generatedAt}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={localReport ? localReport.id : selectedId}
            onChange={(event) => onSelect(event.target.value)}
            className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
          >
            {localReport ? <option value={localReport.id}>Local: {localReport.fileName}</option> : null}
            {reports.map((item) => (
              <option key={item.id} value={item.id}>
                {item.ticker} · {item.tradeDate} · {item.generatedAt}
              </option>
            ))}
          </select>
          <LocalJsonLoader onLoad={onLoad} />
          <ReportActions report={report} />
        </div>
      </div>
    </header>
  );
}

function HeroSection({ report }: { report: ParsedReport }) {
  const entry = levelText(report.keyLevels, "entry");
  const stop = levelText(report.keyLevels, "stop") || levelText(report.keyLevels, "invalidation");
  const support = levelText(report.keyLevels, "support");
  const resistance = levelText(report.keyLevels, "resistance");

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden">
        <CardHeader className="border-zinc-800 bg-zinc-950/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-zinc-100">Institutional Research Summary</CardTitle>
              <CardDescription>AI-generated investment committee memo from TradingAgents output</CardDescription>
            </div>
            <Badge variant={ratingVariant(report.rating)}>{report.rating}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-5">
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Final Rating</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-50">{report.rating}</div>
              <div className="mt-2 text-sm text-zinc-500">{report.action}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Core Reason</div>
              <p className="mt-2 text-lg leading-8 text-zinc-100">{report.finalDecision.executiveSummary}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCell label="Market Regime" value={report.market.marketRegime} icon={<LineChart className="h-4 w-4" />} />
            <SummaryCell label="Key Narrative" value={report.market.keyNarrative} icon={<Sparkles className="h-4 w-4" />} />
            <SummaryCell label="Key Risk" value={report.market.keyRisk} icon={<AlertTriangle className="h-4 w-4" />} />
            <SummaryCell label="Suggested Action" value={report.action} icon={<Crosshair className="h-4 w-4" />} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trading Parameters</CardTitle>
          <CardDescription>Extracted levels and committee constraints</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <SidebarMetric label="Entry Zone" value={entry} />
          <SidebarMetric label="Stop Loss" value={stop} />
          <SidebarMetric label="Resistance" value={resistance} />
          <SidebarMetric label="Support" value={support} />
          <SidebarMetric label="Position Sizing" value={report.risk.positionSizing} />
          <SidebarMetric label="Catalyst Date" value={report.catalysts.find((item) => item.date)?.date ?? "Unspecified"} />
          <SidebarMetric label="Invalidation" value={report.finalDecision.invalidation} />
        </CardContent>
      </Card>
    </section>
  );
}

function MarketStructureSection({ report }: { report: ParsedReport }) {
  return (
    <CollapsibleSection title="1. Market Structure" actions={<SectionIcon icon={<BarChart3 className="h-4 w-4" />} />}>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Structure</CardTitle>
              <CardDescription>Support/resistance overlay and inferred trend path</CardDescription>
            </CardHeader>
            <CardContent>
              <PriceStructureChart data={report.market.priceSeries} />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricTile label="Trend Regime" value={shortValue(report.market.trendRegime)} detail={report.market.trendRegime} tone="positive" />
            <MetricTile label="Chasing Risk" value={shortValue(report.market.chasingRisk)} detail={report.market.chasingRisk} tone="warning" />
            <MetricTile label="Breakout Quality" value={shortValue(report.market.breakoutQuality)} detail={report.market.breakoutQuality} tone="neutral" />
          </div>
        </div>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Levels</CardTitle>
              <CardDescription>Parsed from market and final decision text</CardDescription>
            </CardHeader>
            <CardContent>
              <KeyLevelsChart levels={report.keyLevels} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Entry vs Invalidation</CardTitle>
              <CardDescription>Execution range for sizing decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <EntryInvalidationRange levels={report.keyLevels} />
            </CardContent>
          </Card>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function BullBearSection({ report }: { report: ParsedReport }) {
  return (
    <CollapsibleSection title="2. Bull vs Bear Debate" actions={<SectionIcon icon={<Scale className="h-4 w-4" />} />}>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px_1fr]">
        <DebateColumn
          title="Bull Thesis"
          thesis={report.debate.bullThesis}
          evidence={report.debate.bullEvidence}
          transcript={report.debate.bullTranscript}
          tone="positive"
        />
        <div className="grid content-start gap-3">
          <ScoreGauge label="Debate Score" score={report.debate.debateScore} />
          <ScoreGauge label="Conviction" score={report.debate.convictionScore} />
          <ScoreGauge label="Narrative Strength" score={report.debate.narrativeStrengthScore} />
          <Card>
            <CardHeader>
              <CardTitle>Committee Read</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-zinc-300">{report.debate.invalidation}</p>
            </CardContent>
          </Card>
        </div>
        <DebateColumn
          title="Bear Thesis"
          thesis={report.debate.bearThesis}
          evidence={report.debate.bearEvidence}
          transcript={report.debate.bearTranscript}
          tone="negative"
        />
      </div>
    </CollapsibleSection>
  );
}

function NewsNarrativeSection({ report }: { report: ParsedReport }) {
  return (
    <CollapsibleSection title="3. News & Narrative" actions={<SectionIcon icon={<Newspaper className="h-4 w-4" />} />}>
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Market Narrative</CardTitle>
            <CardDescription>What the market appears to be trading</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-zinc-300">{report.news.narrativeSummary}</p>
            <Separator className="my-4" />
            <div className="grid gap-2">
              <NarrativeCount label="Verified News" count={report.news.verified.length} variant="success" />
              <NarrativeCount label="Interpretation" count={report.news.interpretations.length} variant="info" />
              <NarrativeCount label="Low Confidence" count={report.news.lowConfidence.length} variant="warning" />
            </div>
          </CardContent>
        </Card>
        <Timeline catalysts={report.news.timeline} />
      </div>
    </CollapsibleSection>
  );
}

function FundamentalsSection({ report }: { report: ParsedReport }) {
  return (
    <CollapsibleSection title="4. Fundamentals" actions={<SectionIcon icon={<BriefcaseBusiness className="h-4 w-4" />} />}>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ScoreMetric score={report.fundamentals.revenueDurability} tone="positive" />
          <ScoreMetric score={report.fundamentals.marginTrend} tone="positive" />
          <ScoreMetric score={report.fundamentals.cashRunway} tone="neutral" />
          <ScoreMetric score={report.fundamentals.valuationExpectations} tone="warning" />
          <ScoreMetric score={report.fundamentals.dilutionRisk} tone="warning" />
          <ScoreMetric score={report.fundamentals.businessQuality} tone="positive" />
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          <ChartCard title="Revenue Trend" description="Durability score series">
            <TrendChart data={report.fundamentals.revenueTrend} color="#94a3b8" />
          </ChartCard>
          <ChartCard title="Margin Trend" description="Operating quality score series">
            <TrendChart data={report.fundamentals.marginTrendSeries} color="#e4e4e7" />
          </ChartCard>
          <ChartCard title="Cash vs Debt" description="Parsed balance sheet proxy">
            <CashDebtChart data={report.fundamentals.cashDebtSeries} />
          </ChartCard>
          <ChartCard title="Valuation Gauge" description="Expectation pressure score">
            <div className="flex h-52 w-full items-center">
              <div className="w-full">
                <ScoreGauge label="Expectation" score={report.fundamentals.valuationExpectations.score} />
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function SentimentSection({ report }: { report: ParsedReport }) {
  return (
    <CollapsibleSection title="5. Social Sentiment" actions={<SectionIcon icon={<Users className="h-4 w-4" />} />}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Positioning Read</CardTitle>
            <CardDescription>Institutional interpretation of crowd behavior</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SummaryCell label="Sentiment Direction" value={report.sentiment.direction} icon={<TrendingUp className="h-4 w-4" />} />
            <SummaryCell label="Crowding Risk" value={report.sentiment.crowdingRisk} icon={<Gauge className="h-4 w-4" />} />
          </CardContent>
        </Card>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <ScoreMetric score={report.sentiment.retailAttention} tone="warning" />
          <ScoreMetric score={report.sentiment.narrativeMomentum} tone="positive" />
          <ScoreMetric score={report.sentiment.reversalRisk} tone="negative" />
        </div>
      </div>
    </CollapsibleSection>
  );
}

function RiskManagementSection({ report }: { report: ParsedReport }) {
  return (
    <CollapsibleSection title="6. Risk Management" actions={<SectionIcon icon={<ShieldAlert className="h-4 w-4" />} />}>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Risk Committee Summary</CardTitle>
            <CardDescription>Downside scenarios, asymmetry and sizing constraints</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm leading-6 text-zinc-300">{report.risk.summary}</p>
            <EvidenceList items={report.risk.scenarios} />
            <MetricTile
              label="Position Sizing"
              value={shortValue(report.risk.positionSizing, 72)}
              detail={report.risk.positionSizing}
              tone="neutral"
              icon={<Target className="h-4 w-4" />}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Risk Matrix</CardTitle>
            <CardDescription>Probability vs impact by committee topic</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskMatrixChart report={report} />
          </CardContent>
        </Card>
        <div className="grid gap-3 md:grid-cols-3 xl:col-span-2">
          <ScoreMetric score={report.risk.volatilityRisk} tone="warning" />
          <ScoreMetric score={report.risk.liquidityRisk} tone="neutral" />
          <ScoreMetric score={report.risk.macroRisk} tone="negative" />
        </div>
        <details className="rounded-lg border border-zinc-800 bg-black/30 xl:col-span-2">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium uppercase tracking-[0.12em] text-zinc-300">
            Expand Risk Debate Transcripts
          </summary>
          <div className="grid gap-4 border-t border-zinc-900 p-4 lg:grid-cols-3">
            <MarkdownPanel compact content={report.risk.transcripts.aggressive ?? ""} />
            <MarkdownPanel compact content={report.risk.transcripts.neutral ?? ""} />
            <MarkdownPanel compact content={report.risk.transcripts.conservative ?? ""} />
          </div>
        </details>
      </div>
    </CollapsibleSection>
  );
}

function FinalDecisionSection({ report }: { report: ParsedReport }) {
  return (
    <CollapsibleSection title="7. Final Decision" actions={<SectionIcon icon={<CopyCheck className="h-4 w-4" />} />}>
      <Card className="bg-zinc-950">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Portfolio Manager Memo</CardTitle>
              <CardDescription>Final rating, catalyst, positioning guidance and invalidation</CardDescription>
            </div>
            <Badge variant={ratingVariant(report.rating)}>{report.rating}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="grid content-start gap-3">
            <SidebarMetric label="Expected Time Horizon" value={report.finalDecision.timeHorizon} />
            <SidebarMetric label="Key Catalyst" value={report.finalDecision.keyCatalyst} />
            <SidebarMetric label="Risk / Reward" value={report.finalDecision.riskReward} />
            <SidebarMetric label="Invalidation" value={report.finalDecision.invalidation} />
          </div>
          <MarkdownPanel content={report.finalDecision.raw} />
        </CardContent>
      </Card>
    </CollapsibleSection>
  );
}

function AdvancedResearchSection({
  report,
  reports,
  latestByTicker,
  diff
}: {
  report: ParsedReport;
  reports: ParsedReport[];
  latestByTicker: ParsedReport[];
  diff?: ReportDiff;
}) {
  const history = reports.filter((item) => item.ticker === report.ticker);
  const ratingHistory = history.map((item) => ({
    period: item.generatedAt.slice(5, 16),
    value: ratingScore(item.rating)
  }));

  return (
    <CollapsibleSection title="Advanced Research Workspace" defaultOpen={false} actions={<SectionIcon icon={<Layers3 className="h-4 w-4" />} />}>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Watchlist</CardTitle>
            <CardDescription>Multi-stock comparison using latest parsed report by ticker</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="pb-2">Ticker</th>
                  <th className="pb-2">Rating</th>
                  <th className="pb-2">Confidence</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Trade Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {latestByTicker.map((item) => (
                  <tr key={item.id} className={cn(item.id === report.id && "bg-zinc-900/50")}>
                    <td className="py-2 font-mono text-zinc-100">{item.ticker}</td>
                    <td className="py-2">
                      <Badge variant={ratingVariant(item.rating)}>{item.rating}</Badge>
                    </td>
                    <td className="py-2 text-zinc-400">{item.confidence}</td>
                    <td className="py-2 text-zinc-400">{item.action}</td>
                    <td className="py-2 text-zinc-500">{item.tradeDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rating History</CardTitle>
            <CardDescription>Historical report storage from outputs directory</CardDescription>
          </CardHeader>
          <CardContent>
            {ratingHistory.length > 1 ? (
              <TrendChart data={ratingHistory} color="#cbd5e1" />
            ) : (
              <EmptyMini icon={<Database className="h-4 w-4" />} text="Only one report found for this ticker." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Diff</CardTitle>
            <CardDescription>Narrative and rating changes versus previous report</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={diff?.ratingChanged ? "warning" : "muted"}>
                {diff?.ratingChanged ? `${diff.previousRating} to ${diff.currentRating}` : "Rating unchanged"}
              </Badge>
              <Badge variant="muted">{diff?.previousId ? `vs ${diff.previousId}` : "No prior report"}</Badge>
            </div>
            <DiffTerms title="Added Narrative" terms={diff?.addedNarratives ?? []} />
            <DiffTerms title="Removed Narrative" terms={diff?.removedNarratives ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalyst Calendar</CardTitle>
            <CardDescription>Verified, interpreted and low-confidence items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {report.catalysts.slice(0, 8).map((item) => (
                <CatalystRow key={item.id} catalyst={item} />
              ))}
              {report.catalysts.length === 0 ? <EmptyMini icon={<CalendarClock className="h-4 w-4" />} text="No catalysts parsed." /> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </CollapsibleSection>
  );
}

function DebateColumn({
  title,
  thesis,
  evidence,
  transcript,
  tone
}: {
  title: string;
  thesis: string;
  evidence: string[];
  transcript: string;
  tone: "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={tone === "positive" ? "text-emerald-200" : "text-red-200"}>{title}</CardTitle>
        <CardDescription>Core thesis, market pricing and evidence trail</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm leading-6 text-zinc-300">{thesis}</p>
        <div className="grid gap-2">
          <DebateFacet label="Market Pricing" value={snippetFrom(transcript, ["pricing", "priced in", "market is pricing"])} />
          <DebateFacet label="Variant Perception" value={snippetFrom(transcript, ["variant", "mispricing", "not pricing"])} />
          <DebateFacet label={tone === "positive" ? "Catalysts" : "Risks"} value={snippetFrom(transcript, tone === "positive" ? ["catalyst", "earnings", "guidance", "AWS", "AI"] : ["risk", "downside", "valuation", "CapEx"])} />
          <DebateFacet label="Invalidation" value={snippetFrom(transcript, ["invalidation", "below", "failure", "break"])} />
        </div>
        <EvidenceList items={evidence} />
        <details className="rounded-md border border-zinc-800 bg-black/30">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
            Expand Transcript
          </summary>
          <div className="max-h-[520px] overflow-auto border-t border-zinc-900 p-3">
            <MarkdownPanel compact content={transcript} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function DebateFacet({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-black/25 p-2">
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">{label}</div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{value || "Not explicitly parsed."}</p>
    </div>
  );
}

function Timeline({ catalysts }: { catalysts: Catalyst[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligence Timeline</CardTitle>
        <CardDescription>Source timestamps, confidence labels and claim type</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {catalysts.slice(0, 12).map((item) => (
          <CatalystRow key={item.id} catalyst={item} />
        ))}
        {catalysts.length === 0 ? <EmptyMini icon={<Newspaper className="h-4 w-4" />} text="No catalyst-like news items parsed." /> : null}
      </CardContent>
    </Card>
  );
}

function CatalystRow({ catalyst }: { catalyst: Catalyst }) {
  return (
    <div className="grid gap-2 rounded-lg border border-zinc-800 bg-black/30 p-3 md:grid-cols-[120px_1fr_auto] md:items-start">
      <div className="font-mono text-xs text-zinc-500">{catalyst.date ?? "No date"}</div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-200">{catalyst.title}</div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{catalyst.excerpt}</p>
        {catalyst.source ? <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-zinc-600">{catalyst.source}</div> : null}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Badge variant={catalystVariant(catalyst.type)}>{catalyst.type}</Badge>
        <Badge variant={confidenceVariant(catalyst.confidence)}>{catalyst.confidence}</Badge>
      </div>
    </div>
  );
}

function ScoreMetric({ score, tone }: { score: ScoreCard; tone: "positive" | "neutral" | "negative" | "warning" }) {
  return (
    <MetricTile
      label={score.label}
      value={`${Math.round(score.score)}/100`}
      detail={score.detail}
      score={score.score}
      tone={tone}
    />
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SummaryCell({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/40 p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 line-clamp-4 text-sm leading-6 text-zinc-300">{value}</p>
    </div>
  );
}

function SidebarMetric({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-black/30 p-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">{label}</div>
      <div className="mt-1 line-clamp-3 text-sm leading-5 text-zinc-200">{value || "n/a"}</div>
    </div>
  );
}

function EvidenceList({ items }: { items: string[] }) {
  if (items.length === 0) return <EmptyMini icon={<FileText className="h-4 w-4" />} text="No structured evidence parsed." />;
  return (
    <ul className="grid gap-2">
      {items.slice(0, 6).map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-zinc-400">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-zinc-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NarrativeCount({ label, count, variant }: { label: string; count: number; variant: "success" | "info" | "warning" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-black/30 px-3 py-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <Badge variant={variant}>{count}</Badge>
    </div>
  );
}

function DiffTerms({ title, terms }: { title: string; terms: string[] }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">{title}</div>
      <div className="flex flex-wrap gap-2">
        {terms.length ? terms.map((term) => <Badge key={term} variant="muted">{term}</Badge>) : <span className="text-xs text-zinc-600">None</span>}
      </div>
    </div>
  );
}

function EmptyDashboard({ onLoad }: { onLoad: (report: ParsedReport) => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>No TradingAgents Reports Found</CardTitle>
          <CardDescription>Place `*_state.json` files in `outputs/` or load a local JSON export.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm leading-6 text-zinc-500">
            The app reads from the repository-level outputs directory at runtime and supports browser-side local JSON loading.
          </p>
          <LocalJsonLoader onLoad={onLoad} />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyMini({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-zinc-800 p-3 text-xs text-zinc-600">
      {icon}
      {text}
    </div>
  );
}

function SectionIcon({ icon }: { icon: ReactNode }) {
  return <div className="rounded-md border border-zinc-800 bg-zinc-950 p-1.5 text-zinc-500">{icon}</div>;
}

function ratingVariant(rating: string) {
  if (rating === "Strong Buy" || rating === "Buy" || rating === "Accumulate") return "success";
  if (rating === "Sell" || rating === "Reduce") return "danger";
  if (rating === "Hold") return "warning";
  return "muted";
}

function confidenceVariant(confidence: string) {
  if (confidence === "High" || confidence === "Medium-High") return "success";
  if (confidence === "Low") return "warning";
  return "muted";
}

function catalystVariant(type: Catalyst["type"]) {
  if (type === "verified") return "success";
  if (type === "low-confidence") return "warning";
  return "info";
}

function levelText(levels: KeyLevel[], kind: KeyLevel["kind"]) {
  const matches = levels.filter((level) => level.kind === kind);
  if (!matches.length) return "";
  if (kind === "entry" && matches.length > 1) {
    return `${formatCurrency(matches[0].value)} - ${formatCurrency(matches[matches.length - 1].value)}`;
  }
  return matches.map((level) => formatCurrency(level.value)).join(", ");
}

function shortValue(value: string, max = 46) {
  if (!value) return "n/a";
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3)}...`;
}

function snippetFrom(text: string, keywords: string[]) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, " ").replace(/[*_`#>-]/g, " ").trim())
    .filter(Boolean);
  const found = paragraphs.find((paragraph) =>
    keywords.some((keyword) => paragraph.toLowerCase().includes(keyword.toLowerCase()))
  );
  return found ?? "";
}

function ratingScore(rating: string) {
  const map: Record<string, number> = {
    "Strong Buy": 95,
    Buy: 82,
    Accumulate: 68,
    Hold: 52,
    Reduce: 34,
    Sell: 18,
    Unknown: 50
  };
  return map[rating] ?? 50;
}
