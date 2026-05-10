import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MetricTileProps {
  label: string;
  value: string;
  detail?: string;
  score?: number;
  tone?: "positive" | "neutral" | "negative" | "warning";
  icon?: ReactNode;
}

export function MetricTile({ label, value, detail, score, tone = "neutral", icon }: MetricTileProps) {
  const Icon = icon ?? toneIcon(tone);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</div>
          <div className="mt-1 truncate text-base font-semibold text-zinc-100">{value}</div>
        </div>
        <div className={cn("rounded-md border p-1.5", toneClass(tone))}>{Icon}</div>
      </div>
      {typeof score === "number" ? (
        <Progress value={score} className="mt-3" indicatorClassName={indicatorClass(tone)} />
      ) : null}
      {detail ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-500">{detail}</p> : null}
    </div>
  );
}

function toneIcon(tone: MetricTileProps["tone"]) {
  if (tone === "positive") return <ArrowUpRight className="h-4 w-4" />;
  if (tone === "negative") return <ArrowDownRight className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

function toneClass(tone: MetricTileProps["tone"]) {
  if (tone === "positive") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (tone === "negative") return "border-red-500/25 bg-red-500/10 text-red-300";
  if (tone === "warning") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-slate-500/20 bg-slate-500/10 text-slate-300";
}

function indicatorClass(tone: MetricTileProps["tone"]) {
  if (tone === "positive") return "bg-emerald-400";
  if (tone === "negative") return "bg-red-400";
  if (tone === "warning") return "bg-amber-400";
  return "bg-slate-300";
}
