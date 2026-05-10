"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { KeyLevel, ParsedReport, PricePoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const axis = {
  stroke: "#52525b",
  fontSize: 11,
  tickLine: false,
  axisLine: false
};

const grid = {
  stroke: "#27272a",
  strokeDasharray: "3 3",
  vertical: false
};

export function PriceStructureChart({ data }: { data: PricePoint[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="name" {...axis} />
          <YAxis {...axis} domain={["dataMin - 5", "dataMax + 5"]} tickFormatter={(value) => `$${value}`} />
          <Tooltip content={<TerminalTooltip formatter={(value) => formatCurrency(Number(value))} />} />
          <ReferenceLine y={data[0]?.support} stroke="#38bdf8" strokeDasharray="4 4" label="Support" />
          <ReferenceLine y={data[0]?.resistance} stroke="#f59e0b" strokeDasharray="4 4" label="Resistance" />
          <ReferenceLine y={data[0]?.entry} stroke="#34d399" strokeDasharray="4 4" label="Entry" />
          <ReferenceLine y={data[0]?.invalidation} stroke="#f87171" strokeDasharray="4 4" label="Invalidation" />
          <Line type="monotone" dataKey="price" stroke="#f4f4f5" strokeWidth={2.4} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KeyLevelsChart({ levels }: { levels: KeyLevel[] }) {
  const data = levels.map((level) => ({
    name: level.label.replace(/\s+\d+(?:\.\d+)?$/, ""),
    value: level.value,
    kind: level.kind
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 6, right: 12, left: 12, bottom: 6 }}>
          <CartesianGrid {...grid} />
          <XAxis type="number" {...axis} tickFormatter={(value) => `$${value}`} />
          <YAxis type="category" dataKey="name" {...axis} width={96} />
          <Tooltip content={<TerminalTooltip formatter={(value) => formatCurrency(Number(value))} />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name + entry.value} fill={levelColor(entry.kind)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EntryInvalidationRange({ levels }: { levels: KeyLevel[] }) {
  const entry = firstLevel(levels, "entry");
  const stop = firstLevel(levels, "stop") ?? firstLevel(levels, "invalidation");
  const support = firstLevel(levels, "support");
  const resistance = firstLevel(levels, "resistance");
  const floor = Math.min(...[stop, support, entry].filter(isNumber));
  const ceiling = Math.max(...[resistance, entry, support].filter(isNumber));
  const data = [
    {
      name: "Range",
      base: isNumber(floor) ? floor : 0,
      riskBand: isNumber(entry) && isNumber(stop) ? Math.max(0, entry - stop) : 0,
      entryBand: isNumber(resistance) && isNumber(entry) ? Math.max(0, resistance - entry) : 0
    }
  ];

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} layout="vertical" margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <XAxis
            type="number"
            {...axis}
            domain={isNumber(floor) && isNumber(ceiling) ? [Math.max(0, floor - 5), ceiling + 5] : undefined}
            tickFormatter={(value) => `$${value}`}
          />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip content={<TerminalTooltip formatter={(value) => formatCurrency(Number(value))} />} />
          <Bar dataKey="base" stackId="range" fill="transparent" />
          <Bar dataKey="riskBand" stackId="range" fill="#7f1d1d" radius={[4, 0, 0, 4]} />
          <Bar dataKey="entryBand" stackId="range" fill="#166534" radius={[0, 4, 4, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreGauge({ score, label }: { score: number; label: string }) {
  const safe = Math.max(0, Math.min(100, score));
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</span>
        <span className="font-mono text-zinc-100">{Math.round(safe)}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-zinc-900">
        <div className="h-full rounded-full bg-slate-200 transition-all duration-500" style={{ width: `${safe}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase text-zinc-600">
        <span>Bear</span>
        <span>Neutral</span>
        <span>Bull</span>
      </div>
    </div>
  );
}

export function TrendChart({ data, color = "#e4e4e7" }: { data: Array<{ period: string; value: number }>; color?: string }) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`trend-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...grid} />
          <XAxis dataKey="period" {...axis} />
          <YAxis {...axis} domain={[0, 100]} />
          <Tooltip content={<TerminalTooltip formatter={(value) => `${Math.round(Number(value))}`} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#trend-${color.replace("#", "")})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashDebtChart({ data }: { data: Array<{ name: string; cash: number; debt: number }> }) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="name" {...axis} />
          <YAxis {...axis} />
          <Tooltip content={<TerminalTooltip formatter={(value) => `$${Number(value).toFixed(1)}B`} />} />
          <Bar dataKey="cash" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="debt" fill="#71717a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskMatrixChart({ report }: { report: ParsedReport }) {
  const data = report.risk.matrix.map((risk) => ({
    name: risk.risk,
    x: risk.probability,
    y: risk.impact,
    z: Math.max(80, risk.probability * risk.impact * 0.08)
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis type="number" dataKey="x" name="Probability" domain={[0, 100]} {...axis} />
          <YAxis type="number" dataKey="y" name="Impact" domain={[0, 100]} {...axis} />
          <Tooltip content={<TerminalTooltip formatter={(value) => `${Math.round(Number(value))}`} />} />
          <Scatter name="Risk" data={data} fill="#e4e4e7">
            {data.map((entry) => (
              <Cell key={entry.name} fill={riskColor(entry.y)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TerminalTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | string; color?: string }>;
  label?: string;
  formatter?: (value: number | string) => string;
}

function TerminalTooltip({ active, payload, label, formatter }: TerminalTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-zinc-800 bg-black/95 px-3 py-2 text-xs shadow-xl">
      {label ? <div className="mb-1 font-medium text-zinc-300">{label}</div> : null}
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-zinc-400">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color ?? "#e4e4e7" }} />
          <span>{item.name}</span>
          <span className="font-mono text-zinc-100">{formatter ? formatter(item.value) : item.value}</span>
        </div>
      ))}
    </div>
  );
}

function firstLevel(levels: KeyLevel[], kind: KeyLevel["kind"]) {
  return levels.find((level) => level.kind === kind)?.value;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function levelColor(kind: string) {
  if (kind === "support") return "#38bdf8";
  if (kind === "resistance") return "#f59e0b";
  if (kind === "entry") return "#34d399";
  if (kind === "stop" || kind === "invalidation") return "#f87171";
  return "#a1a1aa";
}

function riskColor(score: number) {
  if (score > 72) return "#f87171";
  if (score > 56) return "#f59e0b";
  return "#94a3b8";
}
