import { useState } from 'react';
import { AlertDialog, Button, Pill, Stack } from '@mf-platform/ui';
import { ColorSwatchRadio } from './ColorSwatchRadio';
import type { ColorLabel } from '../data';

interface Props {
  selectedCount: number;
  onClearSelection: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onColor: (c: ColorLabel) => void;
  onDelete: () => void;
}

/**
 * Floating bar that surfaces while one or more notes are checkbox-selected.
 * Positioned `fixed` at the bottom of the viewport, sized to content, so
 * it doesn't interfere with the grid scroll above.
 */
export function BulkActionBar({ selectedCount, onClearSelection, onPin, onUnpin, onColor, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (selectedCount === 0) return null;

  return (
    <>
      <div
        role="region"
        aria-label="일괄 작업"
        style={{
          position: 'sticky',
          bottom: 12,
          marginInline: 12,
          padding: '8px 12px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
        className="fade-in"
      >
        <Pill tone="accent" size="md">{selectedCount}개 선택됨</Pill>
        <Stack gap="xs" wrap>
          <Button size="sm" onClick={onPin}>📌 핀</Button>
          <Button size="sm" onClick={onUnpin}>핀 해제</Button>
        </Stack>
        <Stack gap="xs" align="center">
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>색상 일괄 변경:</span>
          <ColorSwatchRadio value="none" onChange={(c) => onColor(c)} size="sm" />
        </Stack>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="ghost" onClick={onClearSelection}>선택 해제</Button>
        <Button size="sm" variant="danger" onClick={() => setConfirmOpen(true)}>삭제…</Button>
      </div>

      <AlertDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        tone="danger"
        title={`${selectedCount}개 노트를 삭제할까요?`}
        confirmLabel="삭제"
        onConfirm={() => {
          onDelete();
        }}
      >
        이 동작은 되돌릴 수 없어요. 핀된 노트도 함께 삭제됩니다.
      </AlertDialog>
    </>
  );
}
