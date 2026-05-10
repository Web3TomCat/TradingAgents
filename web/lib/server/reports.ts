import { promises as fs } from "fs";
import path from "path";
import type { ParsedReport, TradingAgentsState } from "@/lib/types";
import { buildReportDiff, parseTradingAgentsReport } from "@/lib/parsers/report-parser";

export async function getReports(): Promise<ParsedReport[]> {
  const outputsDir = await findOutputsDir();
  let files: string[] = [];
  try {
    files = await fs.readdir(outputsDir);
  } catch {
    return [];
  }

  const stateFiles = files.filter((file) => file.endsWith("_state.json")).sort();
  const reports = await Promise.all(
    stateFiles.map(async (fileName) => {
      const fullPath = path.join(outputsDir, fileName);
      const rawContent = await fs.readFile(fullPath, "utf8");
      const stat = await fs.stat(fullPath);
      const raw = JSON.parse(rawContent) as TradingAgentsState;
      return parseTradingAgentsReport(raw, {
        fileName,
        generatedAt: parseGeneratedAt(fileName) || stat.mtime.toISOString()
      });
    })
  );

  return reports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export async function getDashboardData(selectedId?: string) {
  const reports = await getReports();
  const selected = reports.find((report) => report.id === selectedId) ?? reports[0];
  const previous = selected
    ? reports.find((report) => report.ticker === selected.ticker && report.id !== selected.id)
    : undefined;

  const latestByTicker = Array.from(
    reports
      .reduce((map, report) => {
        const current = map.get(report.ticker);
        if (!current || report.generatedAt.localeCompare(current.generatedAt) > 0) {
          map.set(report.ticker, report);
        }
        return map;
      }, new Map<string, ParsedReport>())
      .values()
  ).sort((a, b) => a.ticker.localeCompare(b.ticker));

  return {
    reports,
    selected,
    previous,
    latestByTicker,
    diff: selected ? buildReportDiff(selected, previous) : undefined
  };
}

async function findOutputsDir() {
  const bundledReportsDir = path.resolve(process.cwd(), "data/reports");

  if (process.env.VERCEL) {
    return bundledReportsDir;
  }

  const candidates = [
    bundledReportsDir,
    path.resolve(process.cwd(), "outputs"),
    path.resolve(process.cwd(), "../outputs"),
    path.resolve(process.cwd(), "../../outputs")
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // Try the next likely project layout.
    }
  }

  return candidates[0];
}

function parseGeneratedAt(fileName: string) {
  const match = /_(20\d{6}_\d{6})_state\.json$/.exec(fileName);
  if (!match?.[1]) return "";
  return `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)} ${match[1].slice(9, 11)}:${match[1].slice(11, 13)}:${match[1].slice(13, 15)}`;
}
