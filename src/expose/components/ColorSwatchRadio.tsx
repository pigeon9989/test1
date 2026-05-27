import { COLOR_LABELS, COLOR_TOKENS, type ColorLabel } from '../data';

interface Props {
  value: ColorLabel;
  onChange: (c: ColorLabel) => void;
  size?: 'sm' | 'md';
}

/**
 * Custom color swatch radio. Built on real `<input type="radio">` for native
 * keyboard nav + group semantics, but the visible chip is a hand-drawn dot
 * because the design system's RadioGroup is text/circle and doesn't carry
 * the "this is a color label" affordance.
 */
export function ColorSwatchRadio({ value, onChange, size = 'md' }: Props) {
  const dotSize = size === 'sm' ? 14 : 18;
  return (
    <div
      role="radiogroup"
      aria-label="색상 라벨"
      style={{
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        padding: '4px 8px',
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 6,
      }}
    >
      {COLOR_LABELS.map((c) => {
        const tone = COLOR_TOKENS[c];
        const selected = c === value;
        return (
          <label
            key={c}
            title={tone.label}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="color-swatch"
              value={c}
              checked={selected}
              onChange={() => onChange(c)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            />
            <span
              aria-hidden
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                background: c === 'none' ? 'transparent' : tone.dot,
                border: c === 'none'
                  ? '1px dashed var(--border-strong)'
                  : `1px solid color-mix(in oklab, ${tone.dot} 50%, var(--border-strong))`,
                boxShadow: selected ? '0 0 0 2px var(--bg-elev), 0 0 0 3px var(--accent)' : 'none',
                transition: 'box-shadow 100ms var(--ease)',
              }}
            />
          </label>
        );
      })}
    </div>
  );
}
