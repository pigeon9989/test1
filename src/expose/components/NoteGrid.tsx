import { EmptyState, Grid, Pagination, Skeleton, Stack } from '@mf-platform/ui';
import { NoteCard } from './NoteCard';
import type { Note } from '../data';

interface Props {
  visible: Note[];
  totalAfterFilter: number;
  totalAll: number;
  totalPages: number;
  page: number;
  onPageChange: (p: number) => void;

  hydrated: boolean;
  hasActiveFilter: boolean;

  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onTogglePin: (id: string) => void;
  onNewClick: () => void;
}

export function NoteGrid({
  visible, totalAfterFilter, totalAll, totalPages, page, onPageChange,
  hydrated, hasActiveFilter, selected, onToggleSelect, onOpenDetail, onTogglePin, onNewClick,
}: Props) {
  if (!hydrated) {
    // Skeleton with the same 12-card shape so the layout doesn't jump
    // when notes hydrate from the SDK.
    return (
      <div style={{ padding: '14px 18px' }}>
        <Grid min={240} gap={10}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height={150} />
          ))}
        </Grid>
      </div>
    );
  }

  if (totalAll === 0) {
    return (
      <div style={{ padding: '20px 18px' }}>
        <EmptyState
          title="아직 노트가 없어요"
          body="오른쪽 위의 '+ 새 노트'를 눌러 첫 메모를 만들어보세요. 색상 라벨과 태그로 분류할 수 있고, ⌘K 명령에서도 새 노트를 빠르게 만들 수 있어요."
          ctaLabel="새 노트 만들기"
          onCta={onNewClick}
        />
      </div>
    );
  }

  if (totalAfterFilter === 0) {
    return (
      <div style={{ padding: '20px 18px' }}>
        <EmptyState
          title="조건에 맞는 노트가 없어요"
          body="검색어 / 태그 / 기간 / 색상 필터를 조정해보세요. 위 '필터 초기화'로 한 번에 풀 수도 있어요."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 18px' }}>
      <Grid min={240} gap={10}>
        {visible.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            selected={selected.has(n.id)}
            onToggleSelect={() => onToggleSelect(n.id)}
            onOpenDetail={() => onOpenDetail(n.id)}
            onTogglePin={() => onTogglePin(n.id)}
          />
        ))}
      </Grid>
      {totalPages > 1 && (
        <Stack justify="center" style={{ marginTop: 16 }}>
          <Pagination page={page} pageCount={totalPages} onChange={onPageChange} />
        </Stack>
      )}
      {hasActiveFilter && totalAfterFilter < totalAll && (
        <Stack justify="center" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
            전체 {totalAll}개 중 {totalAfterFilter}개 표시
          </span>
        </Stack>
      )}
    </div>
  );
}
