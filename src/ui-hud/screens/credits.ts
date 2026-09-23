// The credits screen, parsed from CREDITS.md tables. Never hand-edited here.
export interface CreditSection { title: string; rows: { work: string; author: string; licence: string }[] }

export function parseCredits(md: string): CreditSection[] {
  const out: CreditSection[] = [];
  let cur: CreditSection | null = null;
  for (const line of md.split('\n')) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) { cur = { title: h[1].trim(), rows: [] }; out.push(cur); continue; }
    if (!cur || !line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 3 || /^-+$/.test(cells[0]) || cells[0] === 'Work') continue;
    cur.rows.push({ work: cells[0], author: cells[1], licence: cells[2] });
  }
  return out.filter((s) => s.rows.length > 0);
}
