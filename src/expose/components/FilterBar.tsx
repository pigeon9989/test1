import { Button, Combobox, DatePicker, Field, Input, Segmented, Stack, Text } from '@mf-platform/ui';
import { ColorSwatchRadio } from './ColorSwatchRadio';
import { allTags, type ColorLabel } from '../data';
import type { FilterState, SortMode } from '../hooks';
import type { Note } from '../data';

interface Props {
  notes: Note[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
  narrow: boolean;
  rangeInvalid: boolean;
}

export function FilterBar({ notes, filters, onChange, narrow, rangeInvalid }: Props) {
  const tagOptions = [
    { value: '__all__', label: '모든 태그' },
    ...allTags(notes).map((t) => ({ value: t, label: `#${t}` })),
  ];
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });
  const reset = () => onChange({
    ...filters,
    search: '',
    tag: null,
    color: null,
    dateFrom: null,
    dateTo: null,
    pinned: 'all',
  });

  const anyActive =
    filters.search !== '' ||
    filters.tag !== null ||
    filters.color !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

  return (
    <div style={{ padding: narrow ? '10px 14px' : '12px 18px', borderBottom: '1px solid var(--border)' }}>
      {/* Row 1: search + tag + sort */}
      <Stack gap="sm" wrap style={{ alignItems: narrow ? 'stretch' : 'center' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Input
            type="search"
            placeholder="노트 검색…"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            leading={<span aria-hidden style={{ fontSize: 12 }}>🔎</span>}
          />
        </div>
        <div style={{ minWidth: 180, flex: narrow ? 1 : 0 }}>
          <Combobox
            value={filters.tag ?? '__all__'}
            onChange={(v) => set('tag', v === '__all__' || v === null ? null : v)}
            options={tagOptions}
            placeholder="태그…"
            aria-label="태그 필터"
          />
        </div>
        <Segmented<SortMode>
          size="sm"
          value={filters.sort}
          onChange={(v) => set('sort', v)}
          aria-label="정렬"
          options={[
            { value: 'newest', label: '최신' },
            { value: 'oldest', label: '오래된' },
            { value: 'title',  label: '제목' },
            { value: 'length', label: '길이' },
          ]}
        />
      </Stack>

      {/* Row 2: date range + color swatch + reset */}
      <Stack gap="sm" wrap style={{ marginTop: 10, alignItems: narrow ? 'stretch' : 'flex-end' }}>
        <Field label="기간 (작성일)">
          <Stack gap="xs" align="center" wrap>
            <div style={{ width: 150 }}>
              <DatePicker
                size="sm"
                value={filters.dateFrom}
                onChange={(v) => set('dateFrom', v)}
                placeholder="시작…"
                aria-label="시작 날짜"
              />
            </div>
            <span aria-hidden style={{ color: 'var(--text-muted)' }}>—</span>
            <div style={{ width: 150 }}>
              <DatePicker
                size="sm"
                value={filters.dateTo}
                onChange={(v) => set('dateTo', v)}
                placeholder="종료…"
                aria-label="종료 날짜"
              />
            </div>
          </Stack>
        </Field>
        <Field label="색상">
          <ColorSwatchRadio
            value={filters.color ?? 'none'}
            onChange={(c) => set('color', c === 'none' ? null : (c as ColorLabel))}
            size="sm"
          />
        </Field>
        <span style={{ flex: 1 }} />
        {anyActive && (
          <Button variant="ghost" size="sm" onClick={reset}>필터 초기화</Button>
        )}
      </Stack>

      {rangeInvalid && (
        <Text size="xs" tone="danger" style={{ marginTop: 6, display: 'block' }}>
          시작일이 종료일보다 늦습니다 — 기간 필터는 비활성화돼 있어요.
        </Text>
      )}
    </div>
  );
}
