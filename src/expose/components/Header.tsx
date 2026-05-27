import { Button, Menu, Pill, Stack, Tabs, Text, Tooltip } from '@mf-platform/ui';

export type HeaderTab = 'all' | 'pinned' | 'stats';

interface Props {
  totalCount: number;
  pinnedCount: number;
  hosted: boolean;
  narrow: boolean;
  tab: HeaderTab;
  onTabChange: (t: HeaderTab) => void;
  onNew: () => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}

export function Header({
  totalCount, pinnedCount, hosted, narrow, tab, onTabChange, onNew, onExport, onImport, onClear,
}: Props) {
  return (
    <header
      style={{
        padding: narrow ? '12px 14px 0' : '14px 18px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Stack align="center" gap="sm" style={{ flexWrap: 'wrap' }}>
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>📝</span>
        <Text weight="semibold" size="md">Notes</Text>
        <Pill tone="neutral" size="sm">{totalCount}</Pill>
        {hosted && !narrow && (
          <Pill tone="success" size="sm" style={{ letterSpacing: '0.04em' }}>SDK CONNECTED</Pill>
        )}
        <span style={{ flex: 1 }} />
        <Tooltip content="새 노트 (⌘K → Notes: 새 노트)">
          <Button variant="primary" size="sm" onClick={onNew}>+ 새 노트</Button>
        </Tooltip>
        <Menu placement="bottom-end">
          <Menu.Trigger>
            <Button size="sm" variant="secondary" aria-label="더보기">⋯</Button>
          </Menu.Trigger>
          <Menu.Items>
            <Menu.Item onSelect={onExport}>마크다운으로 내보내기</Menu.Item>
            <Menu.Item onSelect={onImport}>마크다운에서 가져오기</Menu.Item>
            <Menu.Separator />
            <Menu.Item tone="danger" onSelect={onClear}>모두 삭제…</Menu.Item>
          </Menu.Items>
        </Menu>
      </Stack>

      <Tabs<HeaderTab>
        value={tab}
        onChange={onTabChange}
        options={[
          { value: 'all',    label: '전체',  count: totalCount },
          { value: 'pinned', label: '고정',  count: pinnedCount },
          { value: 'stats',  label: '통계' },
        ]}
      />
    </header>
  );
}
