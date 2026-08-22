/** Strip Markdown down to running text so it can be set as newspaper column copy. */
export function toColumnText(markdown: string, limit: number): string {
  const plain = markdown
    // structural blocks that do not read as prose
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s*#{1,6}\s+.*$/gm, '')
    .replace(/^\s*[-*+]\s+.*$/gm, '')
    .replace(/^\s*\d+\.\s+.*$/gm, '')
    .replace(/^\s*>\s?.*$/gm, '')
    .replace(/^\s*\|.*$/gm, '')
    .replace(/^\s*(-{3,}|\*{3,})\s*$/gm, '')
    // inline markup
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    // stub lines (bold labels, stray fragments) do not read as newspaper copy
    .filter((line) => line.length >= 10)
    .join('')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return plain.length > limit ? `${plain.slice(0, limit)}…` : plain;
}

/** 読了◯分 — Japanese copy reads at roughly 600 characters a minute. */
export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.round(markdown.length / 600));
}

/** 2026.05.25 */
export function dotDate(date: Date): string {
  return date
    .toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '.');
}
