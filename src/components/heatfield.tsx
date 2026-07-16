/**
 * The heatfield month — DESIGN.md §6. Cells ARE the data: heat scale by load,
 * violet 4px tick = night shift, today ringed apricot with a soft glow.
 * On open, worked days ignite in date order (90ms stagger, light haptic each);
 * drag scrubs with a readout following the finger.
 */
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { T } from '@/components/kit';
import { LOAD_LABELS } from '@/lib/constants';
import { localToday } from '@/lib/api';
import { Shift } from '@/lib/supabase';
import { glass, heat, ink, palette, space } from '@/theme/tokens';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  year: number;
  month: number; // 1-12
  shifts: Shift[];
  onOpenDay: (shift: Shift) => void;
};

export function Heatfield({ year, month, shifts, onOpenDay }: Props) {
  const reduced = useReducedMotion();
  const today = localToday();

  const byDate = useMemo(() => {
    const m = new Map<string, Shift>();
    for (const s of shifts) m.set(s.shift_date, s);
    return m;
  }, [shifts]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const cells: (string | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    ),
  ];
  const workedDates = useMemo(
    () => cells.filter((d): d is string => !!d && byDate.has(d)),
    [cells, byDate]
  );

  // Ignite replay
  const [lit, setLit] = useState(reduced ? workedDates.length : 0);
  useEffect(() => {
    if (reduced || workedDates.length === 0) {
      setLit(workedDates.length);
      return;
    }
    setLit(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setLit(i);
      if (i <= 12) Haptics.selectionAsync().catch(() => {});
      if (i >= workedDates.length) clearInterval(t);
    }, 90);
    return () => clearInterval(t);
    // Replay when the month (or its data) changes.
  }, [year, month, workedDates.length, reduced]);
  const litSet = useMemo(() => new Set(workedDates.slice(0, lit)), [workedDates, lit]);

  // Drag-to-scrub
  const [scrub, setScrub] = useState<string | null>(null);
  const gridSize = useRef({ w: 0, cell: 0 });
  const lastScrubbed = useRef<string | null>(null);

  const cellAt = (e: GestureResponderEvent): string | null => {
    const { locationX, locationY } = e.nativeEvent;
    const { cell } = gridSize.current;
    if (cell === 0) return null;
    const col = Math.floor(locationX / cell);
    const row = Math.floor(locationY / cell);
    const idx = row * 7 + col;
    return idx >= 0 && idx < cells.length ? cells[idx] : null;
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setScrub(cellAt(e)),
      onPanResponderMove: (e) => {
        const d = cellAt(e);
        setScrub(d);
        if (d && d !== lastScrubbed.current && byDate.has(d)) {
          lastScrubbed.current = d;
          Haptics.selectionAsync().catch(() => {});
        }
      },
      onPanResponderRelease: (e) => {
        const d = cellAt(e);
        setScrub(null);
        lastScrubbed.current = null;
        const s = d ? byDate.get(d) : undefined;
        if (s) onOpenDay(s);
      },
      onPanResponderTerminate: () => {
        setScrub(null);
        lastScrubbed.current = null;
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    gridSize.current = { w, cell: w / 7 };
  };

  const scrubShift = scrub ? byDate.get(scrub) : undefined;

  return (
    <View>
      <View style={styles.readout}>
        {scrub ? (
          scrubShift ? (
            <T v="secondary">
              {format(parseISO(scrub), 'EEE d')} · {Number(scrubShift.hours)}h
              {scrubShift.load ? ` · ${LOAD_LABELS[scrubShift.load - 1]}` : ''}
              {scrubShift.is_night ? ' · night' : ''}
            </T>
          ) : (
            <T v="whisper">{format(parseISO(scrub), 'EEE d')} — off</T>
          )
        ) : (
          <T v="whisper">Drag to scrub · tap a day to open it</T>
        )}
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((d, i) => (
          <T key={i} v="overline" style={styles.weekday}>
            {d}
          </T>
        ))}
      </View>

      <View onLayout={onLayout} {...pan.panHandlers} style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`pad-${i}`} style={styles.cell} />;
          const shift = byDate.get(date);
          const isToday = date === today;
          const on = shift && litSet.has(date);
          const step = shift?.load != null ? shift.load - 1 : 0;
          return (
            <View key={date} style={styles.cell}>
              <View
                accessible
                accessibilityLabel={
                  shift
                    ? `${format(parseISO(date), 'MMMM d')}, ${Number(shift.hours)} hours${shift.load ? `, ${LOAD_LABELS[shift.load - 1]}` : ''}`
                    : format(parseISO(date), 'MMMM d')
                }
                style={[
                  styles.cellInner,
                  { backgroundColor: on ? heat[step] : heat[0] },
                  isToday && styles.todayRing,
                ]}>
                {shift?.is_night && on && <View style={styles.nightTick} />}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    minHeight: 24,
    alignItems: 'center',
    marginBottom: space(2),
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: space(1),
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: ink.faint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 3,
  },
  cellInner: {
    flex: 1,
    borderRadius: 9,
    backgroundColor: glass.fill,
  },
  todayRing: {
    borderWidth: 1.5,
    borderColor: palette.apricot,
    shadowColor: palette.apricot,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  nightTick: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 1,
    backgroundColor: palette.violet,
  },
});
