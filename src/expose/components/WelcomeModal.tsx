import { useState } from 'react';
import { Button, Checkbox, Modal, Stack, Stepper, Text } from '@mf-platform/ui';
import { WELCOME_SEEN_KEY } from '../data';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    label: '작성',
    description: '+ 새 노트 버튼이나 ⌘K 명령으로 메모를 빠르게 만듭니다.',
    body: '본문 첫 줄이 제목이 되고 그 아래는 본문으로 표시됩니다. 색상 라벨로 카테고리화할 수 있어요.',
  },
  {
    label: '정리',
    description: '태그로 묶고, 핀으로 고정하고, 색상으로 우선순위를 표시.',
    body: '필터 바에서 태그/색상/기간으로 좁히고, 정렬 모드를 바꿔보세요. 한 페이지에 12개씩 보이고 그 이상은 페이지네이션됩니다.',
  },
  {
    label: '검토',
    description: '통계 탭에서 색상 분포와 누적 글자 수를 확인.',
    body: '주간 활동 KPI와 색 분포 ProgressRing이 노트가 늘어남에 따라 채워집니다.',
  },
];

export function WelcomeModal({ open, onClose }: Props) {
  const [active, setActive] = useState(0);
  const [dontShow, setDontShow] = useState(true);
  const finish = () => {
    if (dontShow) {
      try { window.localStorage.setItem(WELCOME_SEEN_KEY, '1'); } catch {}
    }
    onClose();
  };
  const step = STEPS[active]!;

  return (
    <Modal open={open} onClose={finish} aria-labelledby="welcome-t" width="lg">
      <Modal.Header>
        <h2 id="welcome-t" style={{ margin: 0, fontSize: 16 }}>Notes에 오신 걸 환영해요</h2>
        <button
          type="button"
          aria-label="닫기"
          onClick={finish}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
        >×</button>
      </Modal.Header>
      <Modal.Body>
        <Stack direction="column" gap="lg">
          <Stepper steps={STEPS.map((s) => ({ label: s.label, description: s.description }))} active={active} onStepClick={setActive} />
          <div
            style={{
              padding: 14,
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            <Text size="md" weight="semibold" style={{ display: 'block', marginBottom: 6 }}>
              {step.label} — {step.description}
            </Text>
            <Text size="sm" tone="muted">{step.body}</Text>
          </div>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Checkbox
          label="다음에 보지 않기"
          checked={dontShow}
          onChange={(e) => setDontShow(e.target.checked)}
          wrapperStyle={{ marginRight: 'auto' }}
        />
        <Button onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0}>← 이전</Button>
        {active < STEPS.length - 1 ? (
          <Button variant="primary" onClick={() => setActive(active + 1)}>다음 →</Button>
        ) : (
          <Button variant="primary" onClick={finish}>시작하기</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
