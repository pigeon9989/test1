import { useEffect, useRef, useState } from 'react';
import { Button, Field, Input, Modal, Stack, Tag, Text, Textarea } from '@mf-platform/ui';
import { ColorSwatchRadio } from './ColorSwatchRadio';
import type { ColorLabel } from '../data';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { text: string; color: ColorLabel; tags: string[] }) => void;
}

export function NewNoteModal({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<ColorLabel>('none');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const titleRef = useRef<HTMLInputElement | null>(null);

  // Reset form whenever the modal opens.
  useEffect(() => {
    if (open) {
      setTitle('');
      setBody('');
      setColor('none');
      setTags([]);
      setTagDraft('');
      // The focus trap in Modal will focus the first focusable element —
      // we want that to be the title input, which it already is by DOM order.
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  const addTagDraft = () => {
    const t = tagDraft.trim().replace(/^#/, '');
    if (!t) return;
    if (tags.includes(t)) { setTagDraft(''); return; }
    setTags([...tags, t]);
    setTagDraft('');
  };

  const submit = () => {
    const text = [title.trim(), body.trim()].filter(Boolean).join('\n');
    if (!text) return;
    onCreate({ text, color, tags });
    onClose();
  };

  const canSubmit = title.trim().length > 0 || body.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="newnote-t" width="md">
      <Modal.Header>
        <h2 id="newnote-t" style={{ margin: 0, fontSize: 16 }}>새 노트</h2>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
        >×</button>
      </Modal.Header>
      <Modal.Body>
        <Stack direction="column" gap="md">
          <Field label="제목" hint="첫 줄이 자동으로 제목이 됩니다.">
            <Input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="메모 제목을 입력하세요"
            />
          </Field>
          <Field label="본문">
            <Textarea
              autoResize
              rows={4}
              maxRows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="자유롭게 입력하세요. Shift+Enter로 줄바꿈."
              onKeyDown={(e) => {
                // ⌘/Ctrl + Enter = save.
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </Field>
          <Field label="태그" hint="Enter로 추가, x로 제거.">
            <Stack direction="column" gap="sm">
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                placeholder="태그 입력 후 Enter…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTagDraft(); }
                  else if (e.key === 'Backspace' && tagDraft === '' && tags.length > 0) {
                    e.preventDefault();
                    setTags(tags.slice(0, -1));
                  }
                }}
                onBlur={addTagDraft}
              />
              {tags.length > 0 && (
                <Stack gap="xs" wrap>
                  {tags.map((t) => (
                    <Tag key={t} tone="accent" size="md" onRemove={() => setTags(tags.filter((x) => x !== t))}>
                      {t}
                    </Tag>
                  ))}
                </Stack>
              )}
            </Stack>
          </Field>
          <Field label="색상 라벨">
            <ColorSwatchRadio value={color} onChange={setColor} />
          </Field>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Text size="xs" tone="dim" style={{ marginRight: 'auto' }}>
          <kbd>⌘</kbd>+<kbd>Enter</kbd> 저장 · <kbd>Esc</kbd> 취소
        </Text>
        <Button onClick={onClose}>취소</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={submit}>저장</Button>
      </Modal.Footer>
    </Modal>
  );
}
