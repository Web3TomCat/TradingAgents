"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownPanelProps {
  content: string;
  className?: string;
  compact?: boolean;
}

export function MarkdownPanel({ content, className, compact = false }: MarkdownPanelProps) {
  return (
    <div
      className={cn(
        "markdown-body prose prose-invert max-w-none prose-headings:mt-4 prose-headings:scroll-m-20 prose-p:leading-6 prose-a:text-sky-300 prose-strong:text-zinc-100 prose-li:marker:text-zinc-600 prose-pre:border prose-pre:border-zinc-800 prose-pre:bg-black",
        compact ? "prose-sm prose-p:my-2 prose-li:my-0.5" : "prose-sm md:prose-base",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content || "No report text available."}
      </ReactMarkdown>
    </div>
  );
}
