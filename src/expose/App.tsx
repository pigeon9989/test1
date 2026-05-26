import { useEffect, useMemo, useState } from 'react';
import { platform } from '../platform';

// Mobile detection — module-local hook so we don't depend on the host's
// useIsMobile (modules are deployed independently and must stand alone).
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
const COLOR_TOKENS: Record<ColorLabel, { dot: string; soft: string }> = {
  none:   { dot: 'transparent',                 soft: 'transparent' },
  red:    { dot: 'oklch(67% 0.20 25)',          soft: 'oklch(67% 0.20 25 / 0.13)' },
  amber:  { dot: 'oklch(80% 0.14 80)',          soft: 'oklch(80% 0.14 80 / 0.13)' },
  green:  { dot: 'oklch(72% 0.14 145)',         soft: 'oklch(72% 0.14 145 / 0.13)' },
  blue:   { dot: 'oklch(70% 0.13 235)',         soft: 'oklch(70% 0.13 235 / 0.13)' },
  violet: { dot: 'oklch(72% 0.14 290)',         soft: 'oklch(72% 0.14 290 / 0.13)' },
};

/* ─── Component ─── */

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [activeColor, setActiveColor] = useState<ColorLabel>('none');
  const [hosted, setHosted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const narrow = useIsNarrow();

  /* Hydrate */
  useEffect(() => {
    setHosted(platform.connected);
    void platform.storage.get<Note[]>(STORAGE_KEY).then((arr) => {
      if (Array.isArray(arr)) setNotes(arr);
      setHydrated(true);
    });
  }, []);

  /* Persist */
  useEffect(() => {
    if (!hydrated) return;
    void platform.storage.set(STORAGE_KEY, notes);
  }, [notes, hydrated]);

  /* Host commands */
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

  const remove = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const togglePin = (id: string) => {
    setNotes((prev) => prev.map((n) =>
      n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n,
    ));
  };

  const setColor = (id: string, color: ColorLabel) => {
    setNotes((prev) => prev.map((n) =>
      n.id === id ? { ...n, color, updatedAt: Date.now() } : n,
    ));
  };

  const clearAll = () => {
    if (confirm('모든 메모를 삭제할까요? 이 동작은 되돌릴 수 없어요.')) {
      setNotes([]);
      void platform.notify({ text: '모든 메모를 삭제했어요', tone: 'warn' });
    }
  };

  // Export every note to a single markdown file. Pinned ones first, then
  // most-recent. Timestamps and color labels are preserved as front-matter-ish
  // metadata in HTML comments so they round-trip if someone re-imports later.
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

  /* ─── Render ─── */

  return (
    <section
      style={{
        background: 'var(--bg-panel, #fff)',
        border: '1px solid var(--border, #e2e2ea)',
        borderRadius: 14,
        color: 'var(--text, #1a1a1a)',
        fontFamily: 'var(--font-sans, -apple-system, system-ui, sans-serif)',
        overflow: 'hidden',
      }}
    >
      {/* Header — on narrow screens the search drops to its own row below
          the title so neither gets squeezed. */}
      <header
        style={{
          display: 'flex',
          alignItems: narrow ? 'stretch' : 'center',
          flexDirection: narrow ? 'column' : 'row',
          gap: narrow ? 10 : 10,
          padding: narrow ? '12px 14px' : '14px 18px',
          borderBottom: '1px solid var(--border, #ececf2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>📝</span>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em' }}>
            Notes
          </h3>
          <CountChip count={notes.length} />
          {hosted && !narrow && <SdkBadge />}
        </div>
        <SearchBox value={search} onChange={setSearch} fullWidth={narrow} />
      </header>

      {/* Compose — on narrow screens the color picker drops to its own row. */}
      <div style={{ padding: narrow ? '12px 14px' : '14px 18px', borderBottom: '1px solid var(--border, #ececf2)' }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexDirection: narrow ? 'column' : 'row',
            alignItems: narrow ? 'stretch' : 'center',
          }}
        >
          <input
            id="note-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } }}
            placeholder="메모를 입력하고 Enter — Shift+Enter로 줄바꿈"
            style={{ flex: 1, height: 36 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <ColorPicker value={activeColor} onChange={setActiveColor} />
            <button
              onClick={add}
              disabled={!draft.trim()}
              style={{ ...primaryBtn(!draft.trim()), flex: narrow ? 1 : 'initial' }}
            >
              추가
            </button>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontSize: 11,
            color: 'var(--text-dim, #888)',
          }}
        >
          <span><kbd>Enter</kbd>로 빠르게 저장 · <kbd>⌘K</kbd>에서도 "새 노트" 검색 가능</span>
          <span className="tabular">{draft.length}자</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px 4px' }}>
        {!hydrated ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted, #888)', fontSize: 13 }}>
            불러오는 중…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState search={search.trim()} />
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
            borderTop: '1px solid var(--border, #ececf2)',
            background: 'var(--bg-rail, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 11.5,
            color: 'var(--text-muted, #888)',
          }}
        >
          <span>
            핀 <span className="tabular" style={{ color: 'var(--text-mid)' }}>{notes.filter((n) => n.pinned).length}</span>
            <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>·</span>
            총 <span className="tabular" style={{ color: 'var(--text-mid)' }}>{notes.length}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={exportMd}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-mid, #555)',
                fontSize: 11.5,
                cursor: 'pointer',
                padding: 0,
              }}
              title="모든 메모를 markdown(.md) 파일로 저장"
            >
              .md 내보내기
            </button>
            <span aria-hidden style={{ color: 'var(--text-dim)' }}>·</span>
            <button
              onClick={clearAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--danger, #c0524a)',
                fontSize: 11.5,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              모두 삭제
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}

/* ─── Helpers / sub-components ─── */

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '0 14px',
    height: 36,
    background: 'var(--accent, #2553f2)',
    color: 'var(--accent-fg, #fff)',
    border: 'none',
    borderRadius: 6,
    fontWeight: 500,
    fontSize: 12.5,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    transition: 'background 100ms var(--ease)',
  };
}

function CountChip({ count }: { count: number }) {
  return (
    <span
      className="tabular"
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '1px 7px',
        background: 'var(--bg-elev, #f0f0f5)',
        color: 'var(--text-mid, #666)',
        borderRadius: 999,
        minWidth: 20,
        textAlign: 'center',
      }}
    >
      {count}
    </span>
  );
}

function SdkBadge() {
  return (
    <span
      title="플랫폼 SDK 연결됨 — 토스트/명령 팔레트가 동작합니다"
      style={{
        fontSize: 10.5,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'var(--success-soft, rgba(0,180,80,0.12))',
        color: 'var(--success, #0a8a52)',
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    >
      SDK CONNECTED
    </span>
  );
}

function SearchBox({ value, onChange, fullWidth = false }: { value: string; onChange: (v: string) => void; fullWidth?: boolean }) {
  return (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 200 }}>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted, #888)',
          fontSize: 12,
          pointerEvents: 'none',
        }}
      >🔎</span>
      <input
        type="search"
        placeholder="검색…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', height: 30, paddingLeft: 28, fontSize: 12 }}
      />
    </div>
  );
}

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
        background: 'var(--bg-elev, #f7f7fa)',
        border: '1px solid var(--border, #e2e2ea)',
        borderRadius: 6,
        height: 36,
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
              ? '1px dashed var(--border-strong, #ccc)'
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

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: 'var(--text-muted, #999)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: '0 4px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>{title}</span>
        <span className="tabular" style={{ color: 'var(--text-dim, #aaa)' }}>{count}</span>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>{children}</div>
    </section>
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
    <article
      className="fade-in"
      style={{
        padding: '10px 12px',
        background: color === 'none' ? 'var(--bg-elev, #fff)' : tone.soft,
        border: '1px solid var(--border, #ececf2)',
        borderLeft: color === 'none'
          ? '1px solid var(--border, #ececf2)'
          : `3px solid ${tone.dot}`,
        borderRadius: 8,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      {note.pinned && (
        <span aria-label="고정됨" title="고정됨" style={{ fontSize: 12, lineHeight: 1.4 }}>📌</span>
      )}
      <div style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, lineHeight: 1.55 }}>
        {note.text}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <time
          dateTime={new Date(note.updatedAt).toISOString()}
          style={{ fontSize: 10.5, color: 'var(--text-dim, #999)' }}
          className="tabular"
        >
          {fmtTime(note.updatedAt)}
        </time>
        <div style={{ display: 'flex', gap: 4 }}>
          <ActionButton label={note.pinned ? '핀 해제' : '핀'} onClick={onPin} />
          <ActionButton label="삭제" tone="danger" onClick={onRemove} />
        </div>
      </div>
      <details style={{ position: 'relative' }}>
        <summary
          style={{
            listStyle: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted, #888)',
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.16)',
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
    </article>
  );
}

function ActionButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: tone === 'danger' ? 'var(--danger, #c0524a)' : 'var(--text-muted, #666)',
        cursor: 'pointer',
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 4,
        transition: 'background 100ms var(--ease)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover, #f0f0f3)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        background: 'var(--bg-elev, #fafafd)',
        border: '1px dashed var(--border-strong, #d4d4dc)',
        borderRadius: 12,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'var(--bg-panel, #fff)',
          border: '1px solid var(--border, #ececf2)',
          display: 'grid', placeItems: 'center',
          margin: '0 auto 12px', fontSize: 22,
        }}
      >
        📝
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
        {search ? `"${search}" 검색 결과가 없어요` : '아직 메모가 없어요'}
      </div>
      <p style={{ margin: '4px auto 0', fontSize: 12.5, color: 'var(--text-muted, #888)', maxWidth: 320, lineHeight: 1.5 }}>
        {search
          ? '다른 키워드를 시도하거나 새로 메모를 작성해보세요.'
          : '위 입력창에 입력하고 Enter를 누르세요. 색상 라벨로 분류할 수 있어요.'}
      </p>
    </div>
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
