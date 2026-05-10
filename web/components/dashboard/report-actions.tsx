"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParsedReport } from "@/lib/types";

interface ReportActionsProps {
  report: ParsedReport;
}

export function ReportActions({ report }: ReportActionsProps) {
  const [copied, setCopied] = useState(false);
  const exportText = useMemo(
    () =>
      JSON.stringify(
        {
          ticker: report.ticker,
          tradeDate: report.tradeDate,
          generatedAt: report.generatedAt,
          rating: report.rating,
          action: report.action,
          finalDecision: report.finalDecision,
          keyLevels: report.keyLevels,
          catalysts: report.catalysts
        },
        null,
        2
      ),
    [report]
  );

  async function copyMemo() {
    await navigator.clipboard.writeText(
      `# ${report.ticker} Research Memo\n\nRating: ${report.rating}\nAction: ${report.action}\n\n${report.finalDecision.raw}`
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function exportJson() {
    const blob = new Blob([exportText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.ticker}_${report.tradeDate}_research-summary.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={copyMemo}>
        {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
        {copied ? "Copied" : "Copy memo"}
      </Button>
      <Button variant="secondary" size="sm" onClick={exportJson}>
        <Download className="h-4 w-4" />
        Export
      </Button>
    </div>
  );
}
