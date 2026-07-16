/**
 * Insights — three modules from her real shifts, SQL/data only, describing
 * never diagnosing. Locked below 5 logged shifts; no fake data, ever.
 */
import {
  Canvas,
  Circle,
  LinearGradient as SkiaLinearGradient,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lamp } from '@/brand';
import { Glass, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { useAuth } from '@/lib/auth';
import { useShifts } from '@/lib/queries';
import { palette, space } from '@/theme/tokens';

const UNLOCK_AT = 5;
const CURVE_POINTS = 14;
const CURVE_H = 96;

/** Apricot area curve of recent load; violet marks on night shifts. */
function LoadTrend() {
  const { data: shifts } = useShifts();
  const [w, setW] = useState(0);
  const recent = useMemo(
    () =>
      [...(shifts ?? [])]
        .filter((s) => s.load != null)
        .slice(0, CURVE_POINTS)
        .reverse(),
    [shifts]
  );

  const { area, stroke, nights } = useMemo(() => {
    if (w === 0 || recent.length < 2) return { area: null, stroke: null, nights: [] };
    const stepX = w / (recent.length - 1);
    const y = (load: number) => CURVE_H - ((load - 1) / 4) * (CURVE_H - 14) - 7;
    const pts = recent.map((s, i) => ({ x: i * stepX, y: y(s.load!), night: !!s.is_night }));

    const strokePath = Skia.Path.Make();
    strokePath.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const mx = (prev.x + cur.x) / 2;
      strokePath.cubicTo(mx, prev.y, mx, cur.y, cur.x, cur.y);
    }
    const areaPath = strokePath.copy();
    areaPath.lineTo(pts[pts.length - 1].x, CURVE_H);
    areaPath.lineTo(0, CURVE_H);
    areaPath.close();

    return {
      area: areaPath,
      stroke: strokePath,
      nights: pts.filter((p) => p.night),
    };
  }, [w, recent]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (recent.length < 2) return null;
  const from = format(parseISO(recent[0].shift_date), 'MMM d');
  const to = format(parseISO(recent[recent.length - 1].shift_date), 'MMM d');

  return (
    <Glass>
      <T v="overline">Load, last {recent.length} shifts</T>
      <View onLayout={onLayout} style={{ height: CURVE_H, marginTop: space(3) }}>
        {w > 0 && area && stroke && (
          <Canvas style={{ width: w, height: CURVE_H }} pointerEvents="none">
            <Path path={area}>
              <SkiaLinearGradient
                start={vec(0, 0)}
                end={vec(0, CURVE_H)}
                colors={['rgba(255,173,114,.30)', 'rgba(255,173,114,0)']}
              />
            </Path>
            <Path path={stroke} style="stroke" strokeWidth={2} color={palette.apricot} />
            {nights.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={3} color={palette.violet} />
            ))}
          </Canvas>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space(1) }}>
        <T v="whisper">{from}</T>
        <T v="whisper">violet = nights</T>
        <T v="whisper">{to}</T>
      </View>
    </Glass>
  );
}

function HoursOverUsual() {
  const { profile } = useAuth();
  const { data: shifts } = useShifts();
  const usual = Number(profile?.usual_shift_hours ?? 12);
  const monthKey = format(new Date(), 'yyyy-MM');
  const over = (shifts ?? [])
    .filter((s) => s.shift_date.startsWith(monthKey))
    .reduce((sum, s) => sum + Math.max(Number(s.hours ?? 0) - usual, 0), 0);

  return (
    <Glass>
      <T v="overline">Hours over your usual · {format(new Date(), 'MMMM')}</T>
      <T v="totals" style={{ marginTop: space(2) }}>
        {over === 0 ? '0' : `+${Math.round(over * 10) / 10}`}
      </T>
      <T v="whisper" style={{ marginTop: space(1) }}>
        {over === 0
          ? `every shift landed at or under your ${usual}h`
          : `beyond ${usual}h shifts — described, not judged`}
      </T>
    </Glass>
  );
}

function TagFrequency() {
  const { data: shifts } = useShifts();
  const last10 = (shifts ?? []).slice(0, 10);
  const counts = new Map<string, number>();
  for (const s of last10) for (const t of s.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (top.length === 0) return null;

  return (
    <Glass>
      <T v="overline">What keeps showing up</T>
      {top.map(([tag, n]) => (
        <View
          key={tag}
          style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space(2.5) }}>
          <T v="body">{tag}</T>
          <T v="secondary" style={{ color: palette.apricot }}>
            {n} of last {last10.length}
          </T>
        </View>
      ))}
    </Glass>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { data: shifts } = useShifts();
  const logged = shifts?.length ?? 0;
  const toGo = Math.max(0, UNLOCK_AT - logged);

  if (toGo > 0) {
    return (
      <Sky>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: space(10),
            paddingTop: insets.top,
          }}>
          <Lamp size={44} />
          <T v="greeting" style={{ fontSize: 24, lineHeight: 32, textAlign: 'center', marginTop: space(6) }}>
            Insights unlock at shift {UNLOCK_AT}.
          </T>
          <T v="secondary" style={{ textAlign: 'center', marginTop: space(2) }}>
            {toGo} to go. No rush — the record keeps either way.
          </T>
        </View>
      </Sky>
    );
  }

  return (
    <Sky>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space(4),
          paddingHorizontal: space(5),
          paddingBottom: space(30),
          gap: space(4),
        }}>
        <T v="overline">Insights</T>
        <LoadTrend />
        <HoursOverUsual />
        <TagFrequency />
        <T v="whisper" style={{ textAlign: 'center', marginTop: space(2) }}>
          Patterns, described. Never a diagnosis.
        </T>
      </ScrollView>
    </Sky>
  );
}
