/**
 * The year dial — drag across a ruler of years, one haptic tick per year.
 *
 * A picker would have been fewer lines. This is a drag because the whole
 * screen is built on cause and effect: her thumb moves, the career grid grows
 * under it, the counters climb. That coupling is what makes the first ten
 * seconds feel like an instrument instead of a form.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

import { T } from '@/components/kit';
import { ink, palette, space } from '@/theme/tokens';

export const MAX_YEARS = 30;

type Props = {
  value: number;
  onChange: (years: number) => void;
  max?: number;
};

export function YearDial({ value, onChange, max = MAX_YEARS }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const pick = useCallback(
    (x: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const ratio = Math.min(1, Math.max(0, x / w));
      const next = Math.max(1, Math.min(max, Math.round(ratio * (max - 1)) + 1));
      if (next !== valueRef.current) {
        valueRef.current = next;
        Haptics.selectionAsync().catch(() => {});
        onChange(next);
      }
    },
    [max, onChange]
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
        onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
      }),
    [pick]
  );

  const frac = (value - 1) / (max - 1);

  return (
    <View>
      <View style={styles.readout}>
        <T style={styles.big}>{value}</T>
        <T v="overline" style={{ marginBottom: 9 }}>
          {value === 1 ? 'year' : 'years'}
          {value >= max ? '+' : ''}
        </T>
      </View>

      <View onLayout={onLayout} {...pan.panHandlers} style={styles.track} accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Years as a nurse: ${value}`}
        accessibilityValue={{ min: 1, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const d = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          onChange(Math.max(1, Math.min(max, value + d)));
        }}>
        {Array.from({ length: max }, (_, i) => {
          const on = i < value;
          // Every fifth year stands taller — a ruler you can read at a glance.
          const tall = (i + 1) % 5 === 0;
          return (
            <View
              key={i}
              style={[
                styles.tick,
                { height: tall ? 26 : 16, backgroundColor: on ? palette.amber : ink.hairline },
                on && tall && styles.tickGlow,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.scale} pointerEvents="none">
        <T v="whisper">1</T>
        <T v="whisper" style={{ color: frac > 0.42 && frac < 0.58 ? palette.amber : undefined }}>
          15
        </T>
        <T v="whisper">{max}+</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'flex-end', gap: space(2) },
  big: {
    fontFamily: 'Bricolage-Bold',
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -2.5,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 44, // a full-height target: her thumb never misses the ruler
    marginTop: space(3),
  },
  tick: { width: 3, borderRadius: 2 },
  tickGlow: {
    shadowColor: palette.amber,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space(1.5) },
});
