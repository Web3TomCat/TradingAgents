"use client";

import { useState } from "react";
import { FileJson, Loader2 } from "lucide-react";
import { parseTradingAgentsReport } from "@/lib/parsers/report-parser";
import type { ParsedReport, TradingAgentsState } from "@/lib/types";

interface LocalJsonLoaderProps {
  onLoad: (report: ParsedReport) => void;
}

export function LocalJsonLoader({ onLoad }: LocalJsonLoaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as TradingAgentsState;
      onLoad(
        parseTradingAgentsReport(raw, {
          fileName: file.name,
          generatedAt: new Date(file.lastModified).toISOString()
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse JSON file.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <span className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-800">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
        Load JSON
      </span>
      {error ? <span className="max-w-48 truncate text-xs text-red-300">{error}</span> : null}
    </label>
  );
}
