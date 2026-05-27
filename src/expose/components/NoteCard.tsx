import { Button, Card, Checkbox, Stack, Tag, Text, Tooltip } from '@mf-platform/ui';
import { COLOR_TOKENS, deriveSnippet, deriveTitle, fmtRelative, type Note } from '../data';

interface Props {
  note: Note;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
  onTogglePin: () => void;
}

export function NoteCard({ note, selected, onToggleSelect, onOpenDetail, onTogglePin }: Props) {
  const color = note.color ?? 'none';
  const tone = COLOR_TOKENS[color];
  const title = deriveTitle(note.text);
  const snippet = deriveSnippet(note.text);

  return (
    <Card
      as="article"
      padding={0}
      hover
      style={{
        background: color === 'none' ? 'var(--bg-elev)' : tone.soft,
        borderLeft: color === 'none' ? '1px solid var(--border)' : `3px solid ${tone.dot}`,
        position: 'relative',
        outline: selected ? '2px solid var(--accent)' : 'none',
        outlineOffset: -1,
      }}
    >
      {/* Top row: checkbox + pin */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 4,
          zIndex: 1,
        }}
      >
        <Tooltip content={note.pinned ? '핀 해제' : '고정'}>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            aria-label={note.pinned ? '핀 해제' : '고정'}
            style={note.pinned ? { color: 'var(--warn)' } : undefined}
          >
            {note.pinned ? '📌' : '☆'}
          </Button>
        </Tooltip>
      </div>
      <div
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}
        // Stop the parent click from also opening the detail when the user
        // just wanted to toggle the bulk-select checkbox.
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onChange={onToggleSelect}
          aria-label="선택"
          size="sm"
        />
      </div>

      <div
        onClick={onOpenDetail}
        style={{ padding: '32px 14px 12px', cursor: 'pointer', minHeight: 110 }}
      >
        <Text size="md" weight="semibold" truncate style={{ display: 'block', maxWidth: '100%' }}>
          {title}
        </Text>
        {snippet && (
          <Text
            size="sm"
            tone="muted"
            style={{
              marginTop: 6,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {snippet}
          </Text>
        )}

        {(note.tags?.length ?? 0) > 0 && (
          <Stack gap="xs" wrap style={{ marginTop: 10 }}>
            {(note.tags ?? []).slice(0, 4).map((t) => (
              <Tag key={t} tone="accent" size="sm">{t}</Tag>
            ))}
            {(note.tags?.length ?? 0) > 4 && (
              <Tag tone="neutral" size="sm">+{(note.tags?.length ?? 0) - 4}</Tag>
            )}
          </Stack>
        )}
      </div>

      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-rail, transparent)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Text size="xs" tone="dim" mono>
          {fmtRelative(note.updatedAt)}
        </Text>
        <Text size="xs" tone="dim">{note.text.length}자</Text>
      </div>
    </Card>
  );
}
