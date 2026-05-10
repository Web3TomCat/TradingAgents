import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  actions?: ReactNode;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className,
  actions
}: CollapsibleSectionProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-lg border border-zinc-800 bg-black/40 shadow-terminal [&_summary::-webkit-details-marker]:hidden",
        className
      )}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200">{title}</h2>
        </div>
        {actions}
      </summary>
      <div className="border-t border-zinc-900 p-4">{children}</div>
    </details>
  );
}
