import { useEffect, useRef, useState } from 'react';
import {
  AlertDialog, Button, DetailItem, Divider, Drawer, Field, Input, Popover,
  Stack, Tag, Text, Textarea, Tooltip,
} from '@mf-platform/ui';
import { ColorSwatchRadio } from './ColorSwatchRadio';
import { COLOR_TOKENS, deriveTitle, fmtRelative, type ColorLabel, type Note } from '../data';

interface Props {
  note: Note | null;
  onClose: () => void;
  onSaveText: (id: string, text: string) => void;
  onColor: (id: string, color: ColorLabel) => void;
  onTags: (id: string, tags: string[]) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Right-side Drawer with full editing surface for a single note. Uses a
 * Popover-based tag editor (inside the Drawer) and an AlertDialog for the
 * destructive delete path.
 *
 * The local `draft` state lets the user edit freely; we commit on blur
 * and on close — the design system's Drawer handles Esc / backdrop / focus
 * trap, so there's no risk of orphaning unsaved text.
 */
export function NoteDetailDrawer({
  note, onClose, onSaveText, onColor, onTags, onTogglePin, onDelete,
}: Props) {
  const [draft, setDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const flushedRef = useRef(true);

  // Reset draft each time the open note changes.
  useEffect(() => {
    if (note) {
      setDraft(note.text);
      setTagDraft('');
      flushedRef.current = true;
    }
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = () => {
    if (!note) return;
    if (flushedRef.current) return;
    if (draft !== note.text) onSaveText(note.id, draft);
    flushedRef.current = true;
  };

  const close = () => {
    flush();
    onClose();
  };

  const open = note !== null;
  const tagsHere = note?.tags ?? [];

  return (
    <>
      <Drawer open={open} onClose={close} side="right" size={460} aria-labelledby="detail-t">
        {note && (
          <>
            <Drawer.Header>
              <Stack align="center" gap="sm" style={{ flex: 1, minWidth: 0 }}>
                {note.color && note.color !== 'none' && (
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: COLOR_TOKENS[note.color].dot,
                      flexShrink: 0,
                    }}
                  />
                )}
                <h2
                  id="detail-t"
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {deriveTitle(note.text)}
                </h2>
              </Stack>
              <Stack gap="xs">
                <Tooltip content={note.pinned ? '핀 해제' : '고정'}>
                  <Button
                    size="sm"
                    variant={note.pinned ? 'primary' : 'secondary'}
                    onClick={() => onTogglePin(note.id)}
                    aria-label={note.pinned ? '핀 해제' : '고정'}
                  >
                    📌
                  </Button>
                </Tooltip>
                <Tooltip content="삭제">
                  <Button size="sm" variant="danger" onClick={() => setConfirmDel(true)}>
                    🗑
                  </Button>
                </Tooltip>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={close}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
                >×</button>
              </Stack>
            </Drawer.Header>

            <Drawer.Body>
              <Stack direction="column" gap="md">
                <Field label="내용" hint="포커스 잃을 때 자동 저장.">
                  <Textarea
                    autoResize
                    rows={6}
                    maxRows={24}
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); flushedRef.current = false; }}
                    onBlur={flush}
                  />
                </Field>

                <Field label="색상 라벨">
                  <ColorSwatchRadio
                    value={note.color ?? 'none'}
                    onChange={(c) => onColor(note.id, c)}
                  />
                </Field>

                <Field label="태그">
                  <Stack direction="column" gap="sm">
                    <Stack gap="xs" align="center" wrap>
                      {tagsHere.length === 0 ? (
                        <Text size="sm" tone="dim">(태그 없음)</Text>
                      ) : (
                        tagsHere.map((t) => (
                          <Tag
                            key={t}
                            tone="accent"
                            onRemove={() => onTags(note.id, tagsHere.filter((x) => x !== t))}
                          >
                            {t}
                          </Tag>
                        ))
                      )}
                      <Popover
                        trigger={<Button size="sm" variant="secondary">+ 태그</Button>}
                      >
                        <Stack direction="column" gap="sm" style={{ minWidth: 200 }}>
                          <Input
                            value={tagDraft}
                            onChange={(e) => setTagDraft(e.target.value)}
                            placeholder="새 태그…"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const t = tagDraft.trim().replace(/^#/, '');
                                if (!t || tagsHere.includes(t)) return;
                                onTags(note.id, [...tagsHere, t]);
                                setTagDraft('');
                              }
                            }}
                          />
                          <Text size="xs" tone="dim">Enter로 추가</Text>
                        </Stack>
                      </Popover>
                    </Stack>
                  </Stack>
                </Field>

                <Divider />

                <Stack direction="column" gap="xs">
                  <DetailItem label="작성" value={new Date(note.createdAt).toLocaleString('ko-KR')} />
                  <DetailItem label="수정" value={fmtRelative(note.updatedAt)} />
                  <DetailItem label="글자 수" value={`${note.text.length}자`} />
                  <DetailItem label="ID" value={<code style={{ fontSize: 11 }}>{note.id.slice(0, 8)}</code>} />
                </Stack>
              </Stack>
            </Drawer.Body>

            <Drawer.Footer>
              <Text size="xs" tone="dim" style={{ marginRight: 'auto' }}>
                <kbd>Esc</kbd>로 닫기
              </Text>
              <Button onClick={close}>닫기</Button>
            </Drawer.Footer>
          </>
        )}
      </Drawer>

      <AlertDialog
        open={confirmDel && note !== null}
        onClose={() => setConfirmDel(false)}
        tone="danger"
        title="이 노트를 삭제할까요?"
        confirmLabel="삭제"
        onConfirm={() => {
          if (!note) return;
          onDelete(note.id);
          onClose();
        }}
      >
        삭제된 노트는 복원할 수 없습니다.
      </AlertDialog>
    </>
  );
}
