import { useCallback, useEffect, useMemo, useState } from 'react';
import { platform } from '../platform';
import {
  isSameDayOrAfter, isSameDayOrBefore, STORAGE_KEY,
  type ColorLabel, type Note,
} from './data';

/* ─── useNotes ───
 *
 * Loads notes via the platform SDK (host-relayed storage) and offers CRUD.
 * The setter functions are useCallback-stable so consumers can list them
 * in useEffect deps without re-firing each render.
 */
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void platform.storage.get<Note[]>(STORAGE_KEY).then((arr) => {
      if (cancelled) return;
      if (Array.isArray(arr)) setNotes(arr);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void platform.storage.set(STORAGE_KEY, notes);
  }, [notes, hydrated]);

  // All mutators take a transform function so they're free of captured state.
  const update = useCallback((id: string, transform: (n: Note) => Note) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? transform(n) : n)));
  }, []);

  const add = useCallback((partial: Pick<Note, 'text' | 'color' | 'tags'>) => {
    const now = Date.now();
    const next: Note = {
      id: crypto.randomUUID(),
      text: partial.text,
      color: partial.color,
      tags: partial.tags,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [next, ...prev]);
    return next.id;
  }, []);

  const remove = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const removeMany = useCallback((ids: Iterable<string>) => {
    const s = new Set(ids);
    setNotes((prev) => prev.filter((n) => !s.has(n.id)));
  }, []);

  const togglePin = useCallback((id: string) => {
    update(id, (n) => ({ ...n, pinned: !n.pinned, updatedAt: Date.now() }));
  }, [update]);

  const setColor = useCallback((id: string, color: ColorLabel) => {
    update(id, (n) => ({ ...n, color, updatedAt: Date.now() }));
  }, [update]);

  const setText = useCallback((id: string, text: string) => {
    update(id, (n) => ({ ...n, text, updatedAt: Date.now() }));
  }, [update]);

  const setTags = useCallback((id: string, tags: string[]) => {
    update(id, (n) => ({ ...n, tags, updatedAt: Date.now() }));
  }, [update]);

  const clear = useCallback(() => {
    setNotes([]);
  }, []);

  return { notes, hydrated, add, remove, removeMany, togglePin, setColor, setText, setTags, clear };
}

/* ─── useFilteredNotes ───
 *
 * Pure-derived view over the raw notes given the current filter & sort
 * state. Slices to a single page so the consumer doesn't have to.
 */

export type SortMode = 'newest' | 'oldest' | 'title' | 'length';
export type PinnedFilter = 'all' | 'pinned-only';

export interface FilterState {
  search: string;
  tag: string | null;       // single tag selected; null = all
  color: ColorLabel | null; // null = all
  dateFrom: string | null;  // ISO yyyy-MM-dd
  dateTo: string | null;    // ISO yyyy-MM-dd
  sort: SortMode;
  pinned: PinnedFilter;
}

export const INITIAL_FILTERS: FilterState = {
  search: '',
  tag: null,
  color: null,
  dateFrom: null,
  dateTo: null,
  sort: 'newest',
  pinned: 'all',
};

export const PAGE_SIZE = 12;

export function useFilteredNotes(notes: Note[], filters: FilterState, page: number) {
  return useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    // Range guard: if `from > to`, the filter is invalid — fall back to
    // matching everything for the date axis. UI shows a warning.
    const rangeInvalid =
      filters.dateFrom !== null && filters.dateTo !== null && filters.dateFrom > filters.dateTo;

    let filtered = notes.filter((n) => {
      if (q && !n.text.toLowerCase().includes(q)) return false;
      if (filters.tag !== null && !(n.tags ?? []).includes(filters.tag)) return false;
      if (filters.color !== null && (n.color ?? 'none') !== filters.color) return false;
      if (filters.pinned === 'pinned-only' && !n.pinned) return false;
      if (!rangeInvalid) {
        if (filters.dateFrom && !isSameDayOrAfter(n.createdAt, filters.dateFrom)) return false;
        if (filters.dateTo && !isSameDayOrBefore(n.createdAt, filters.dateTo)) return false;
      }
      return true;
    });

    // Pinned notes always bubble to the top within the chosen sort order —
    // matches the user expectation that "starred" stays visible.
    filtered = filtered.sort((a, b) => {
      const pa = a.pinned ? 1 : 0;
      const pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      switch (filters.sort) {
        case 'oldest': return a.createdAt - b.createdAt;
        case 'title':  return a.text.localeCompare(b.text);
        case 'length': return b.text.length - a.text.length;
        case 'newest':
        default:       return b.updatedAt - a.updatedAt;
      }
    });

    const totalAfterFilter = filtered.length;
    const totalAll = notes.length;
    const totalPages = Math.max(1, Math.ceil(totalAfterFilter / PAGE_SIZE));
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * PAGE_SIZE;
    const visible = filtered.slice(start, start + PAGE_SIZE);

    return { visible, totalAfterFilter, totalAll, totalPages, clampedPage, rangeInvalid };
  }, [notes, filters, page]);
}
