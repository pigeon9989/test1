import { Grid, ProgressBar, ProgressRing, Stack, StatCard, Text } from '@mf-platform/ui';
import { COLOR_LABELS, COLOR_TOKENS, type NoteStats } from '../data';

interface Props {
  stats: NoteStats;
}

// Reasonable upper-bound for the "avg length" bar so the visual jitter
// stays bounded. Long technical notes can blow past this; we just clamp.
const AVG_TARGET = 500;

export function Stats({ stats }: Props) {
  const colorEntries = COLOR_LABELS
    .filter((c) => stats.byColor[c] > 0)
    .map((c) => ({ color: c, count: stats.byColor[c] }));
  const colored = colorEntries
    .filter((e) => e.color !== 'none')
    .reduce((a, b) => a + b.count, 0);
  const ringPct = stats.total === 0 ? 0 : colored / stats.total;

  return (
    <div style={{ padding: '14px 18px' }}>
      <Grid min={170} gap={10} as="div">
        <StatCard label="전체 노트" value={stats.total} />
        <StatCard label="이번 주" value={stats.thisWeek} delta={stats.thisWeek > 0 ? '+신규' : '없음'} tone={stats.thisWeek > 0 ? 'accent' : 'neutral'} />
        <StatCard label="고정됨" value={stats.pinned} tone="warn" />
        <StatCard label="평균 글자 수" value={stats.avgLength} />
      </Grid>

      {stats.total > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stack direction="column" align="center" gap="xs">
            <ProgressRing value={ringPct} size={88} thickness={10} tone="accent">
              <Stack direction="column" align="center" gap={0}>
                <Text size="md" weight="bold">{Math.round(ringPct * 100)}%</Text>
                <Text size="xs" tone="muted">색상 분류</Text>
              </Stack>
            </ProgressRing>
            <Text size="xs" tone="muted">{colored}/{stats.total}개 색 지정</Text>
          </Stack>

          <div style={{ flex: 1, minWidth: 240 }}>
            <Stack direction="column" gap="sm">
              <Text size="xs" weight="semibold" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                색상 분포
              </Text>
              {colorEntries.length === 0 ? (
                <Text size="sm" tone="dim">색상이 지정된 노트가 없습니다.</Text>
              ) : (
                <Stack direction="column" gap="xs">
                  {colorEntries.map(({ color, count }) => {
                    const pct = count / stats.total;
                    const tone = COLOR_TOKENS[color];
                    return (
                      <Stack key={color} align="center" gap="sm">
                        <span style={{ width: 90, fontSize: 12, color: 'var(--text-muted)' }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color === 'none' ? 'transparent' : tone.dot, border: color === 'none' ? '1px dashed var(--border-strong)' : 'none', marginRight: 6, verticalAlign: 'middle' }} />
                          {tone.label}
                        </span>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={pct} height={6} tone="accent" />
                        </div>
                        <span className="tabular" style={{ fontSize: 11.5, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
                          {count}
                        </span>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
              <ProgressBar
                label={`평균 글자 수 — ${stats.avgLength}자 / 목표 ${AVG_TARGET}자`}
                value={Math.min(1, stats.avgLength / AVG_TARGET)}
                tone={stats.avgLength > AVG_TARGET ? 'warn' : 'success'}
              />
            </Stack>
          </div>
        </div>
      )}
    </div>
  );
}
