import type { MarkdownBlock } from "@/lib/types";

export function stripMarkdown(value = "") {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`>#|]/g, " ")
    .replace(/-{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMarkdownBlocks(markdown = ""): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let current: MarkdownBlock | null = null;

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      if (current) blocks.push(current);
      current = {
        level: match[1].length,
        title: match[2].replace(/[*_`]/g, "").trim(),
        content: ""
      };
      continue;
    }
    if (current) {
      current.content += `${line}\n`;
    }
  }

  if (current) blocks.push(current);
  return blocks.map((block) => ({ ...block, content: block.content.trim() }));
}

export function extractSection(markdown = "", titles: string | string[]) {
  const wanted = Array.isArray(titles) ? titles : [titles];
  const normalized = wanted.map(normalizeTitle);
  const blocks = parseMarkdownBlocks(markdown);
  const block = blocks.find((candidate) =>
    normalized.some((title) => normalizeTitle(candidate.title).includes(title))
  );
  return block?.content.trim() ?? "";
}

export function extractLabeledValue(text = "", labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?${escapeRegExp(label)}(?:\\*\\*)?\\s*[:：]\\s*([^\\n]+)`,
      "i"
    );
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].replace(/\*\*/g, "").trim();
  }
  return "";
}

export function firstMeaningfulSentence(text = "", fallback = "No structured summary available.") {
  const clean = stripMarkdown(text);
  if (!clean) return fallback;
  const sentences = clean.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [clean];
  const sentence = sentences.find((item) => item.trim().length > 40) ?? sentences[0];
  return sentence.trim();
}

export function extractBullets(text = "", maxItems = 6) {
  const bullets = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map((line) => stripMarkdown(line.replace(/^[-*]\s+|^\d+\.\s+/, "")))
    .filter(Boolean);

  if (bullets.length > 0) return bullets.slice(0, maxItems);

  const sentences = stripMarkdown(text).match(/[^.!?。！？]+[.!?。！？]?/g) ?? [];
  return sentences.map((line) => line.trim()).filter(Boolean).slice(0, maxItems);
}

export function keywordExcerpt(text = "", keywords: string[], fallback = "") {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const found = paragraphs.find((paragraph) =>
    keywords.some((keyword) => paragraph.toLowerCase().includes(keyword.toLowerCase()))
  );
  return found ? firstMeaningfulSentence(found, fallback) : fallback;
}

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
