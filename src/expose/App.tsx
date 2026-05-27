import { useEffect, useMemo, useState } from 'react';
import { AlertDialog } from '@mf-platform/ui';
import { platform } from '../platform';
import {
  INITIAL_FILTERS, useNotes, useFilteredNotes,
  type FilterState,
} from './hooks';
import { WELCOME_SEEN_KEY, computeStats, type ColorLabel } from './data';
import { Header, type HeaderTab } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { Stats } from './components/Stats';
import { NoteGrid } from './components/NoteGrid';
import { BulkActionBar } from './components/BulkActionBar';
import { NewNoteModal } from './components/NewNoteModal';
import { NoteDetailDrawer } from './components/NoteDetailDrawer';
import { WelcomeModal } from './components/WelcomeModal';

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

/**
 * Notes — showcase app for `@mf-platform/ui`. Composes ~30 components
 * from the design system (Modal, Drawer, AlertDialog, Popover, Menu,
 * Combobox, DatePicker, Segmented, Tag, Checkbox, ProgressRing,
 * StatCard, Pagination, Stepper, …).
 *
 * Storage stays compatible with the previous `notes/items` array, so
 * users keep their notes across the version bump.
 */
export default function App() {
  const narrow = useIsNarrow();
  const {
    notes, hydrated,
    add, remove, removeMany, togglePin, setColor, setText, setTags, clear,
  } = useNotes();

  /* ─── filter / sort / page state ─── */
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [tab, setTab] = useState<HeaderTab>('all');
  const [page, setPage] = useState(1);

  // The "pinned" tab is just a saved filter — wire it through to filters.pinned.
  const effectiveFilters = useMemo<FilterState>(() => ({
    ...filters,
    pinned: tab === 'pinned' ? 'pinned-only' : 'all',
  }), [filters, tab]);

  const { visible, totalAfterFilter, totalAll, totalPages, clampedPage, rangeInvalid } =
    useFilteredNotes(notes, effectiveFilters, page);

  // Reset page whenever filters / tab change so the user doesn't end up
  // on page 5 of a result set that's only 1 page long.
  useEffect(() => { setPage(1); }, [filters, tab]);

  /* ─── bulk select ─── */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  // Clear selection when filters/pagination change (the cards under the
  // user's mouse aren't the same any more).
  useEffect(() => { setSelected(new Set()); }, [filters, tab, page]);

  /* ─── overlays ─── */
  const [newOpen, setNewOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailNote = detailId ? notes.find((n) => n.id === detailId) ?? null : null;
  const [clearOpen, setClearOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  /* ─── SDK + first-run welcome ─── */
  const [hosted, setHosted] = useState(false);
  useEffect(() => {
    setHosted(platform.connected);
    try {
      const seen = window.localStorage.getItem(WELCOME_SEEN_KEY);
      if (!seen) setWelcomeOpen(true);
    } catch {
      // private mode or storage disabled — skip the welcome.
    }
  }, []);

  /* ─── SDK commands (registered once) ─── */
  useEffect(() => {
    const offs: Array<() => void> = [];
    void platform.registerCommand(
      { id: 'new-note', label: 'Notes: 새 노트', hint: '새 노트 다이얼로그 열기' },
      () => setNewOpen(true),
    ).then((u) => offs.push(u));
    void platform.registerCommand(
      { id: 'reset-filters', label: 'Notes: 필터 초기화', hint: '검색·태그·기간·색상 모두 해제' },
      () => { setFilters(INITIAL_FILTERS); setTab('all'); },
    ).then((u) => offs.push(u));
    void platform.registerCommand(
      { id: 'clear-all', label: 'Notes: 모두 삭제', hint: '저장된 메모를 모두 지웁니다' },
      () => setClearOpen(true),
    ).then((u) => offs.push(u));
    return () => { offs.forEach((o) => o()); };
  }, []);

  /* ─── export / import ─── */
  const exportMd = () => {
    if (notes.length === 0) {
      void platform.notify({ text: '내보낼 노트가 없어요', tone: 'info' });
      return;
    }
    const sorted = [...notes].sort((a, b) =>
      (Number(b.pinned) - Number(a.pinned)) || (b.updatedAt - a.updatedAt),
    );
    const parts = sorted.map((n) => {
      const meta = [
        `updated: ${new Date(n.updatedAt).toISOString()}`,
        n.pinned ? 'pinned: true' : '',
        n.color && n.color !== 'none' ? `color: ${n.color}` : '',
        (n.tags?.length ?? 0) > 0 ? `tags: ${(n.tags ?? []).join(', ')}` : '',
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
    void platform.notify({ text: `${notes.length}개 노트를 .md로 저장했어요`, tone: 'success' });
  };

  const importMd = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,text/markdown,text/plain';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      const text = await f.text();
      // Split on the `---` separator (the export format above). Each chunk
      // becomes one note. Strip the `<!-- meta -->` comment that export
      // adds; users won't want it as a body.
      const chunks = text
        .split(/\n---\n/)
        .map((c) => c.replace(/<!--[^>]*-->/g, '').trim())
        .filter((c) => c.length > 0 && !/^#\s+Notes export/.test(c));
      let count = 0;
      for (const chunk of chunks) {
        add({ text: chunk });
        count++;
      }
      void platform.notify({ text: `${count}개 노트를 가져왔어요`, tone: 'success' });
    };
    input.click();
  };

  /* ─── new-note flow ─── */
  const createNote = (input: { text: string; color: ColorLabel; tags: string[] }) => {
    add({ text: input.text, color: input.color, tags: input.tags });
    void platform.notify({ text: '메모 추가됨', tone: 'success', timeout: 1500 });
  };

  /* ─── bulk action helpers ─── */
  const bulkPin = (pinned: boolean) => {
    for (const id of selected) {
      const n = notes.find((x) => x.id === id);
      if (!n) continue;
      if (!!n.pinned !== pinned) togglePin(id);
    }
    void platform.notify({
      text: pinned ? `${selected.size}개 고정됨` : `${selected.size}개 핀 해제됨`,
      tone: 'success',
    });
  };
  const bulkColor = (color: ColorLabel) => {
    for (const id of selected) setColor(id, color);
    void platform.notify({ text: `${selected.size}개 색상 변경됨`, tone: 'success' });
  };
  const bulkDelete = () => {
    const n = selected.size;
    removeMany(selected);
    setSelected(new Set());
    void platform.notify({ text: `${n}개 삭제됨`, tone: 'warn' });
  };

  const stats = useMemo(() => computeStats(notes), [notes]);
  const pinnedCount = stats.pinned;

  const hasActiveFilter =
    filters.search !== '' ||
    filters.tag !== null ||
    filters.color !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

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
      <Header
        totalCount={stats.total}
        pinnedCount={pinnedCount}
        hosted={hosted}
        narrow={narrow}
        tab={tab}
        onTabChange={setTab}
        onNew={() => setNewOpen(true)}
        onExport={exportMd}
        onImport={importMd}
        onClear={() => setClearOpen(true)}
      />

      {tab === 'stats' ? (
        <Stats stats={stats} />
      ) : (
        <>
          <FilterBar
            notes={notes}
            filters={filters}
            onChange={setFilters}
            narrow={narrow}
            rangeInvalid={rangeInvalid}
          />
          <NoteGrid
            visible={visible}
            totalAfterFilter={totalAfterFilter}
            totalAll={totalAll}
            totalPages={totalPages}
            page={clampedPage}
            onPageChange={setPage}
            hydrated={hydrated}
            hasActiveFilter={hasActiveFilter}
            selected={selected}
            onToggleSelect={toggleSelect}
            onOpenDetail={setDetailId}
            onTogglePin={togglePin}
            onNewClick={() => setNewOpen(true)}
          />
        </>
      )}

      <BulkActionBar
        selectedCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        onPin={() => bulkPin(true)}
        onUnpin={() => bulkPin(false)}
        onColor={bulkColor}
        onDelete={bulkDelete}
      />

      <NewNoteModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={createNote}
      />

      <NoteDetailDrawer
        note={detailNote}
        onClose={() => setDetailId(null)}
        onSaveText={setText}
        onColor={setColor}
        onTags={setTags}
        onTogglePin={togglePin}
        onDelete={remove}
      />

      <WelcomeModal open={welcomeOpen} onClose={() => setWelcomeOpen(false)} />

      <AlertDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        tone="danger"
        title="모든 노트를 삭제할까요?"
        confirmLabel="모두 삭제"
        onConfirm={() => {
          clear();
          setSelected(new Set());
          void platform.notify({ text: '모든 노트를 삭제했어요', tone: 'warn' });
        }}
      >
        현재 {stats.total}개 노트가 있습니다. 이 동작은 되돌릴 수 없어요. 미리 .md로 내보내두는 걸 권장합니다.
      </AlertDialog>
    </section>
  );
}
