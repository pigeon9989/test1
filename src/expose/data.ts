// Domain types + storage + derive helpers. Kept storage-shape compatible
// with the previous (simpler) Notes module so users carry their notes
// over without a migration.

export type ColorLabel = 'none' | 'red' | 'amber' | 'green' | 'blue' | 'violet';

export interface Note {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  color?: ColorLabel;
  tags?: string[];
}

export const STORAGE_KEY = 'notes/items';
export const WELCOME_SEEN_KEY = 'notes/welcomeSeen';

export const COLOR_LABELS: ColorLabel[] = ['none', 'red', 'amber', 'green', 'blue', 'violet'];

// Domain-specific palette — these aren't a generic accent set; they're
// product taxonomy ("amber = idea", "red = blocker"). So they live in
// the module, not in the design system.
export const COLOR_TOKENS: Record<ColorLabel, { dot: string; soft: string; label: string }> = {
  none:   { dot: 'transparent',         soft: 'transparent',                 label: '없음' },
  red:    { dot: 'oklch(67% 0.20 25)',  soft: 'oklch(67% 0.20 25 / 0.13)',   label: '빨강' },
  amber:  { dot: 'oklch(80% 0.14 80)',  soft: 'oklch(80% 0.14 80 / 0.13)',   label: '주황' },
  green:  { dot: 'oklch(72% 0.14 145)', soft: 'oklch(72% 0.14 145 / 0.13)',  label: '초록' },
  blue:   { dot: 'oklch(70% 0.13 235)', soft: 'oklch(70% 0.13 235 / 0.13)',  label: '파랑' },
  violet: { dot: 'oklch(72% 0.14 290)', soft: 'oklch(72% 0.14 290 / 0.13)',  label: '보라' },
};

/* ─── derives ─── */

/** Title = first non-empty line; body = remainder. Stored as a single
 *  `text` field for backward compat, derived for display. */
export function deriveTitle(text: string): string {
  const first = text.split('\n').find((l) => l.trim().length > 0) ?? '';
  return first.trim() || '(제목 없음)';
}

export function deriveSnippet(text: string, maxLen = 140): string {
  const lines = text.split('\n');
  const skipFirst = lines.length > 1 && lines[0]!.trim().length > 0;
  const body = (skipFirst ? lines.slice(1) : lines).join(' ').trim();
  if (body.length === 0) return '';
  return body.length > maxLen ? body.slice(0, maxLen).trimEnd() + '…' : body;
}

/** Sorted union of all tags across notes — used to populate the filter Combobox. */
export function allTags(notes: Note[]): string[] {
  const s = new Set<string>();
  for (const n of notes) for (const t of n.tags ?? []) s.add(t);
  return [...s].sort();
}

export function isSameDayOrAfter(ms: number, isoDay: string): boolean {
  const d = new Date(ms);
  const day = d.toISOString().slice(0, 10);
  return day >= isoDay;
}

export function isSameDayOrBefore(ms: number, isoDay: string): boolean {
  const d = new Date(ms);
  const day = d.toISOString().slice(0, 10);
  return day <= isoDay;
}

/** Time-since formatter ("방금", "12분 전", "3일 전", "2026-05-20"). */
export function fmtRelative(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(ms).toLocaleDateString('ko-KR');
}

/* ─── stats ─── */

export interface NoteStats {
  total: number;
  pinned: number;
  thisWeek: number;
  avgLength: number;
  byColor: Record<ColorLabel, number>;
}

export function computeStats(notes: Note[]): NoteStats {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const byColor: Record<ColorLabel, number> = {
    none: 0, red: 0, amber: 0, green: 0, blue: 0, violet: 0,
  };
  let thisWeek = 0;
  let totalLen = 0;
  let pinned = 0;
  for (const n of notes) {
    byColor[n.color ?? 'none']++;
    if (n.pinned) pinned++;
    if (now - n.createdAt <= weekMs) thisWeek++;
    totalLen += n.text.length;
  }
  return {
    total: notes.length,
    pinned,
    thisWeek,
    avgLength: notes.length === 0 ? 0 : Math.round(totalLen / notes.length),
    byColor,
  };
}
