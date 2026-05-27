import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, EmptyState as UiEmptyState, Input, Pill, Stack, Text,
} from '@mf-platform/ui';
import { platform } from '../platform';

/* ─── Types ─── */

type ColorLabel = 'none' | 'red' | 'amber' | 'green' | 'blue' | 'violet';

interface Note {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  color?: ColorLabel;
  tags?: string[];
}

const STORAGE_KEY = 'notes/items';

// OKLCH color labels — color tokens stay local because they're product
// taxonomy ("amber for ideas", "red for blockers"), not a generic palette.
const COLOR_TOKENS: Record<ColorLabel, { dot: string; soft: string }> = {
  none:   { dot: 'transparent',                 soft: 'transparent' },
  red:    { dot: 'oklch(67% 0.20 25)',          soft: 'oklch(67% 0.20 25 / 0.13)' },
  amber:  { dot: 'oklch(80% 0.14 80)',          soft: 'oklch(80% 0.14 80 / 0.13)' },
  green:  { dot: 'oklch(72% 0.14 145)',         soft: 'oklch(72% 0.14 145 / 0.13)' },
  blue:   { dot: 'oklch(70% 0.13 235)',         soft: 'oklch(70% 0.13 235 / 0.13)' },
  violet: { dot: 'oklch(72% 0.14 290)',         soft: 'oklch(72% 0.14 290 / 0.13)' },
};

// Module-local mobile detection — the module is deployed independently
// from the host and must stand alone without depending on host hooks.
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const fn = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return narrow;
}

/* ─── Component ─── */

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [activeColor, setActiveColor] = useState<ColorLabel>('none');
  const [hosted, setHosted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const narrow = useIsNarrow();

  useEffect(() => {
    setHosted(platform.connected);
    void platform.storage.get<Note[]>(STORAGE_KEY).then((arr) => {
      if (Array.isArray(arr)) setNotes(arr);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void platform.storage.set(STORAGE_KEY, notes);
  }, [notes, hydrated]);

  useEffect(() => {
    const offs: Array<() => void> = [];
    void platform.registerCommand(
      { id: 'new-note',  label: 'Notes: 새 노트',     hint: '입력창에 포커스' },
      () => document.getElementById('note-input')?.focus(),
    ).then((u) => offs.push(u));
    void platform.registerCommand(
      { id: 'clear-all', label: 'Notes: 모두 삭제',   hint: '저장된 메모를 모두 지웁니다' },
      () => clearAll(),
    ).then((u) => offs.push(u));
    return () => { offs.forEach((o) => o()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const now = Date.now();
    setNotes((prev) => [
      { id: crypto.randomUUID(), text, createdAt: now, updatedAt: now, color: activeColor },
      ...prev,
    ]);
    setDraft('');
    void platform.notify({ text: '메모 추가됨', tone: 'success', timeout: 1500 });
  };

  const remove = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));
  const togglePin = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n)));
  const setColor = (id: string, color: ColorLabel) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color, updatedAt: Date.now() } : n)));

  const clearAll = () => {
    if (confirm('모든 메모를 삭제할까요? 이 동작은 되돌릴 수 없어요.')) {
      setNotes([]);
      void platform.notify({ text: '모든 메모를 삭제했어요', tone: 'warn' });
    }
  };

  const exportMd = () => {
    if (notes.length === 0) {
      void platform.notify({ text: '내보낼 메모가 없어요', tone: 'info' });
      return;
    }
    const sorted = [...notes].sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return Number(b.pinned) - Number(a.pinned);
      return b.updatedAt - a.updatedAt;
    });
    const parts = sorted.map((n) => {
      const meta = [
        `updated: ${new Date(n.updatedAt).toISOString()}`,
        n.pinned ? 'pinned: true' : '',
        n.color && n.color !== 'none' ? `color: ${n.color}` : '',
      ].filter(Boolean).join(' · ');
      return `<!-- ${meta} -->\n\n${n.text}`;
    });
    const body = `# Notes export — ${new Date().toLocaleString('ko-KR')}\n\n${parts.join('\n\n---\n\n')}\n`;
    const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    void platform.notify({ text: `${notes.length}개 메모를 .md로 저장했어요`, tone: 'success' });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.text.toLowerCase().includes(q));
  }, [notes, search]);

  const pinned = filtered.filter((n) => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
  const regular = filtered.filter((n) => !n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <section
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        color: 'var(--text)',
        fontFamily: 'var(--font-sans, -apple-system, system-ui, sans-serif)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: narrow ? 'stretch' : 'center',
          flexDirection: narrow ? 'column' : 'row',
          gap: 10,
          padding: narrow ? '12px 14px' : '14px 18px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Stack align="center" gap="sm" style={{ flex: 1, minWidth: 0 }}>
          <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>📝</span>
          <Text weight="semibold" size="md">Notes</Text>
          <Pill tone="neutral" size="sm">{notes.length}</Pill>
          {hosted && !narrow && (
            <Pill tone="success" size="sm" style={{ letterSpacing: '0.04em' }}>SDK CONNECTED</Pill>
          )}
        </Stack>
        <div style={{ width: narrow ? '100%' : 200 }}>
          <Input
            type="search"
            size="sm"
            placeholder="검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leading={<span aria-hidden style={{ fontSize: 12 }}>🔎</span>}
          />
        </div>
      </header>

      {/* Compose */}
      <div style={{ padding: narrow ? '12px 14px' : '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexDirection: narrow ? 'column' : 'row',
            alignItems: narrow ? 'stretch' : 'center',
          }}
        >
          <Input
            id="note-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } }}
            placeholder="메모를 입력하고 Enter — Shift+Enter로 줄바꿈"
            wrapperStyle={{ flex: 1 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <ColorPicker value={activeColor} onChange={setActiveColor} />
            <Button
              variant="primary"
              size="md"
              onClick={add}
              disabled={!draft.trim()}
              style={narrow ? { flex: 1 } : undefined}
            >
              추가
            </Button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <Text size="xs" tone="dim">
            <kbd>Enter</kbd>로 빠르게 저장 · <kbd>⌘K</kbd>에서도 "새 노트" 검색 가능
          </Text>
          <Text size="xs" tone="dim" mono>{draft.length}자</Text>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px 4px' }}>
        {!hydrated ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Text tone="muted" size="sm">불러오는 중…</Text>
          </div>
        ) : filtered.length === 0 ? (
          <UiEmptyState
            title={search ? `"${search}" 검색 결과가 없어요` : '아직 메모가 없어요'}
            body={
              search
                ? '다른 키워드를 시도하거나 새로 메모를 작성해보세요.'
                : '위 입력창에 입력하고 Enter를 누르세요. 색상 라벨로 분류할 수 있어요.'
            }
          />
        ) : (
          <>
            {pinned.length > 0 && (
              <Section title="고정됨" count={pinned.length}>
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} onRemove={() => remove(n.id)} onPin={() => togglePin(n.id)} onColor={(c) => setColor(n.id, c)} />
                ))}
              </Section>
            )}
            <Section title={pinned.length > 0 ? '나머지' : '전체'} count={regular.length}>
              {regular.map((n) => (
                <NoteCard key={n.id} note={n} onRemove={() => remove(n.id)} onPin={() => togglePin(n.id)} onColor={(c) => setColor(n.id, c)} />
              ))}
            </Section>
          </>
        )}
      </div>

      {/* Footer */}
      {notes.length > 0 && (
        <footer
          style={{
            padding: narrow ? '10px 14px' : '10px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-rail, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Text size="xs" tone="muted">
            핀 <span className="tabular" style={{ color: 'var(--text-mid)' }}>{notes.filter((n) => n.pinned).length}</span>
            <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>·</span>
            총 <span className="tabular" style={{ color: 'var(--text-mid)' }}>{notes.length}</span>
          </Text>
          <Stack align="center" gap="sm">
            <Button variant="ghost" size="sm" onClick={exportMd} title="모든 메모를 markdown(.md) 파일로 저장">
              .md 내보내기
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} style={{ color: 'var(--danger)' }}>
              모두 삭제
            </Button>
          </Stack>
        </footer>
      )}
    </section>
  );
}

/* ─── Sub-components ─── */

// Section header — uses a Pill for the count so the visual matches the
// header `<Pill>` next to the title.
function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <Stack align="center" gap="sm" style={{ margin: '0 4px 6px' }}>
        <Text size="xs" weight="semibold" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </Text>
        <Text size="xs" tone="dim" mono>{count}</Text>
      </Stack>
      <div style={{ display: 'grid', gap: 6 }}>{children}</div>
    </section>
  );
}

// Color swatch picker — domain-specific UI; no equivalent in the design
// system. Keep inline.
function ColorPicker({ value, onChange }: { value: ColorLabel; onChange: (c: ColorLabel) => void }) {
  return (
    <div
      role="group"
      aria-label="색상 라벨"
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        padding: '0 8px',
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        height: 34,
      }}
    >
      {(['none', 'red', 'amber', 'green', 'blue', 'violet'] as ColorLabel[]).map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={c === value}
          onClick={() => onChange(c)}
          title={c}
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: c === 'none' ? 'transparent' : COLOR_TOKENS[c].dot,
            border: c === 'none'
              ? '1px dashed var(--border-strong)'
              : `1px solid color-mix(in oklab, ${COLOR_TOKENS[c].dot} 50%, var(--border-strong))`,
            boxShadow: c === value ? '0 0 0 2px var(--bg-panel), 0 0 0 3px var(--accent)' : 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  );
}

function NoteCard({
  note,
  onRemove,
  onPin,
  onColor,
}: {
  note: Note;
  onRemove: () => void;
  onPin: () => void;
  onColor: (c: ColorLabel) => void;
}) {
  const color = note.color ?? 'none';
  const tone = COLOR_TOKENS[color];
  return (
    <Card
      as="article"
      padding={0}
      className="fade-in"
      style={{
        background: color === 'none' ? 'var(--bg-elev)' : tone.soft,
        borderLeft: color === 'none' ? '1px solid var(--border)' : `3px solid ${tone.dot}`,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px' }}>
        {note.pinned && (
          <span aria-label="고정됨" title="고정됨" style={{ fontSize: 12, lineHeight: 1.4 }}>📌</span>
        )}
        <div style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          <Text size="sm">{note.text}</Text>
        </div>
        <Stack direction="column" align="end" gap="xs" style={{ flexShrink: 0 }}>
          <time
            dateTime={new Date(note.updatedAt).toISOString()}
            style={{ fontSize: 10.5, color: 'var(--text-dim)' }}
            className="tabular"
          >
            {fmtTime(note.updatedAt)}
          </time>
          <Stack gap="xs">
            <Button variant="ghost" size="sm" onClick={onPin}>{note.pinned ? '핀 해제' : '핀'}</Button>
            <Button variant="ghost" size="sm" onClick={onRemove} style={{ color: 'var(--danger)' }}>삭제</Button>
          </Stack>
        </Stack>
        <details style={{ position: 'relative' }}>
          <summary
            style={{
              listStyle: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 14,
              lineHeight: 1,
              userSelect: 'none',
            }}
            aria-label="색상 변경"
          >
            ⋯
          </summary>
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 24,
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              padding: 6,
              display: 'flex',
              gap: 4,
              zIndex: 5,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {(Object.keys(COLOR_TOKENS) as ColorLabel[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onColor(c)}
                title={c}
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: c === 'none' ? 'transparent' : COLOR_TOKENS[c].dot,
                  border: c === 'none' ? '1px dashed var(--border-strong)' : 'none',
                  padding: 0, cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </details>
      </div>
    </Card>
  );
}

function fmtTime(ms: number): string {
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
