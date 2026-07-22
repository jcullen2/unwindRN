/**
 * Insights (Deep Ward) — numbers first, described never judged. Locked below 5
 * logged shifts. Everything above the Career-signals divider is SQL over her own
 * shifts. Career signals (pay position, CCRN) are regional/market context — CCRN
 * hours are real; pay markers wear the ~ and only appear when she asks.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lantern } from '@/brand';
import { Lockup, PageTitle, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { useAuth } from '@/lib/auth';
import { useCareerTotals, useShifts } from '@/lib/queries';
import { glass, ink, palette, space } from '@/theme/tokens';

const UNLOCK_AT = 5;
const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 3000];
const SIGNALS_KEY = 'unwindrn_signals_on';

/** The milestone progress ring. */
function Ring({ frac, label, sub }: { frac: number; label: string; sub: string }) {
  const size = 76;
  const r = 30;
  const c = size / 2;
  const track = Skia.Path.Make();
  track.addCircle(c, c, r);
  const arc = Skia.Path.Make();
  const oval = Skia.XYWHRect(c - r, c - r, r * 2, r * 2);
  arc.addArc(oval, -90, Math.max(2, frac * 360));
  return (
    <View style={{ alignItems: 'center' }}>
      <Canvas style={{ width: size, height: size }}>
        <Path path={track} style="stroke" strokeWidth={6} color="rgba(255,182,92,.14)" />
        <Path path={arc} style="stroke" strokeWidth={6} strokeCap="round" color={palette.amber} />
      </Canvas>
      <View style={{ position: 'absolute', top: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontFamily: 'Bricolage-Bold', fontSize: 13, color: palette.ink }}>{label}</T>
        <T v="whisper" style={{ marginTop: 1 }}>
          {sub}
        </T>
      </View>
    </View>
  );
}

function Delta({ label, val, chip, tone }: { label: string; val: string; chip: string; tone: 'amber' | 'moon' | 'flat' }) {
  const color = tone === 'amber' ? palette.amber : tone === 'moon' ? palette.moon : palette.moss;
  const bg = tone === 'amber' ? 'rgba(255,182,92,.13)' : tone === 'moon' ? 'rgba(155,199,189,.12)' : 'rgba(234,241,236,.07)';
  return (
    <View style={styles.deltaRow}>
      <T v="caption" style={{ color: ink.text }}>
        {label}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1.5) }}>
        <T v="caption" style={{ color: ink.text }}>
          {val}
        </T>
        <View style={[styles.deltaChip, { backgroundColor: bg }]}>
          <T style={{ fontSize: 10, color }}>{chip}</T>
        </View>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { data: shifts } = useShifts();
  const totals = useCareerTotals();
  const logged = shifts?.length ?? 0;
  const usual = Number(profile?.usual_shift_hours ?? 12);

  const [signalsOn, setSignalsOn] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(SIGNALS_KEY).then((v) => setSignalsOn(v !== 'false')).catch(() => {});
  }, []);
  const toggleSignals = () => {
    setSignalsOn((v) => {
      const next = !v;
      AsyncStorage.setItem(SIGNALS_KEY, String(next)).catch(() => {});
      return next;
    });
  };

  const now = new Date();
  const year = now.getFullYear();
  const nights = (shifts ?? []).filter((s) => s.is_night).length;

  const yearShifts = (shifts ?? []).filter((s) => s.shift_date.startsWith(String(year)));
  const monthCounts = useMemo(() => {
    const c = Array(12).fill(0);
    for (const s of yearShifts) c[parseISO(s.shift_date).getMonth()]++;
    return c;
  }, [yearShifts]);
  const maxMonth = Math.max(1, ...monthCounts);

  // This month vs her monthly average.
  const monthKey = format(now, 'yyyy-MM');
  const mShifts = (shifts ?? []).filter((s) => s.shift_date.startsWith(monthKey));
  const monthHours = mShifts.reduce((s, r) => s + Number(r.hours ?? 0), 0);
  const monthNights = mShifts.filter((s) => s.is_night).length;
  const monthHeavy = mShifts.filter((s) => (s.load ?? 0) >= 4).length;
  const monthsActive = new Set((shifts ?? []).map((s) => s.shift_date.slice(0, 7))).size || 1;
  const avgHours = totals.loggedHours / monthsActive;
  const hoursDelta = avgHours > 0 ? Math.round(((monthHours - avgHours) / avgHours) * 100) : 0;

  // Next milestone ring.
  const career = totals.shifts;
  const nextM = MILESTONES.find((m) => m > career) ?? career + 500;
  const prevM = [...MILESTONES].reverse().find((m) => m <= career) ?? 0;
  const frac = Math.min(1, (career - prevM) / (nextM - prevM || 1));
  const toGo = nextM - career;

  // CCRN eligibility — real: hours toward 2,000.
  const ccrnFrac = Math.min(1, totals.hours / 2000);

  if (logged < UNLOCK_AT) {
    const remaining = UNLOCK_AT - logged;
    return (
      <Sky>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(10), paddingTop: insets.top }}>
          <Lantern size={44} />
          <T v="ask" style={{ textAlign: 'center', marginTop: space(6) }}>
            Insights open at shift {UNLOCK_AT}.
          </T>
          <T v="secondary" style={{ textAlign: 'center', marginTop: space(2) }}>
            {remaining} to go. No rush — the record keeps either way.
          </T>
        </View>
      </Sky>
    );
  }

  return (
    <Sky>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + space(3.5), paddingHorizontal: space(5), paddingBottom: space(28), gap: space(2.5) }}>
        <View style={styles.header}>
          <Lockup />
          <T v="caption" style={{ color: ink.dim }}>
            through {format(now, 'MMM d')}
          </T>
        </View>
        <PageTitle>Insights</PageTitle>

        {/* Hero — this year + month sparkline + career line */}
        <Pressable accessibilityRole="button" onPress={() => router.push('/logbook')} style={styles.hero}>
          <View style={styles.topLight} />
          <View style={{ flex: 1 }}>
            <T style={styles.heroNum}>{yearShifts.length}</T>
            <T v="overline" style={{ marginTop: space(1) }}>
              shifts · {year}
            </T>
            <T v="caption" style={{ color: palette.moss, marginTop: space(1.5) }}>
              {totals.shifts.toLocaleString()} career · {Math.round(totals.hours).toLocaleString()} hrs · {nights} nights
            </T>
          </View>
          <View style={styles.bars}>
            {monthCounts.map((n, i) => (
              <View
                key={i}
                style={{
                  width: 9,
                  borderRadius: 3,
                  height: Math.max(6, (n / maxMonth) * 54),
                  backgroundColor: i === now.getMonth() ? palette.amber : n ? 'rgba(255,182,92,.3)' : 'rgba(234,241,236,.08)',
                }}
              />
            ))}
          </View>
        </Pressable>

        {/* Milestone ring + deltas */}
        <View style={{ flexDirection: 'row', gap: space(2.25) }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/milestone')} style={styles.ringCard}>
            <Ring frac={frac} label={`#${nextM.toLocaleString()}`} sub={`${toGo} to go`} />
            <T v="overline" style={{ marginTop: space(1.5), textAlign: 'center' }}>
              Next milestone
            </T>
          </Pressable>
          <View style={[styles.card, { flex: 1.25 }]}>
            <View style={styles.topLight} />
            <T v="overline">This month vs your average</T>
            <Delta label="Hours" val={String(Math.round(monthHours))} chip={hoursDelta === 0 ? 'even' : `${hoursDelta > 0 ? '+' : ''}${hoursDelta}%`} tone={hoursDelta > 0 ? 'amber' : hoursDelta < 0 ? 'moon' : 'flat'} />
            <Delta label="Nights" val={String(monthNights)} chip={monthNights ? 'logged' : 'none'} tone={monthNights ? 'moon' : 'flat'} />
            <Delta label="Heavy (4–5)" val={String(monthHeavy)} chip={monthHeavy ? 'held' : 'none'} tone={monthHeavy ? 'amber' : 'flat'} />
            <Delta label="Shifts" val={String(mShifts.length)} chip={`${monthsActive}mo avg`} tone="flat" />
          </View>
        </View>

        {/* Career signals — market context, only when she asks */}
        <View style={styles.card}>
          <View style={styles.topLight} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T v="overline">Career signals · {profile?.specialty ?? 'your practice'}</T>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: signalsOn }} onPress={toggleSignals} style={[styles.pill, { backgroundColor: signalsOn ? 'rgba(155,199,189,.12)' : 'rgba(234,241,236,.07)' }]}>
              <T style={{ fontSize: 9.5, letterSpacing: 0.6, color: signalsOn ? palette.moon : ink.dim }}>
                {signalsOn ? 'ON · YOUR ASK' : 'OFF'}
              </T>
            </Pressable>
          </View>

          {signalsOn ? (
            <>
              <View style={styles.payBand}>
                <View style={styles.payTrack} />
                <View style={[styles.payMark, { left: '34%', backgroundColor: palette.ink }]} />
                <T style={[styles.payLabelTop, { left: '34%' }]}>You · ~$52</T>
                <View style={[styles.payMark, { left: '47%', backgroundColor: palette.amber }]} />
                <T style={[styles.payLabelBtm, { left: '47%', color: palette.amber }]}>+charge · ~$56</T>
                <View style={[styles.payMark, { left: '86%', backgroundColor: palette.amber, shadowColor: palette.amber, shadowOpacity: 0.7, shadowRadius: 8 }]} />
                <T style={[styles.payLabelTop, { left: '78%', color: palette.amber }]}>travel eq · ~$71</T>
                <T style={[styles.payTick, { left: '13%' }]}>~$46 · p25</T>
                <T style={[styles.payTick, { left: '66%' }]}>~$62 · p75</T>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space(2) }}>
                <T v="caption" style={{ color: ink.text }}>
                  CCRN eligibility{' '}
                  <T v="whisper">· {Math.round(totals.hours).toLocaleString()} of 2,000 hrs</T>
                </T>
                <T v="caption" style={{ color: palette.amber }}>
                  {ccrnFrac >= 1 ? 'eligible' : `${Math.round(ccrnFrac * 100)}%`}
                </T>
              </View>
              <View style={styles.ccrnTrack}>
                <View style={[styles.ccrnFill, { width: `${Math.round(ccrnFrac * 100)}%` }]} />
              </View>
              <T v="whisper" style={{ marginTop: space(2) }}>
                Pay markers are regional market context (~), not your data. Hours are yours.
              </T>
            </>
          ) : (
            <T v="secondary" style={{ color: ink.faint, marginTop: space(2) }}>
              Off. Pay context and eligibility signals only appear when you ask.
            </T>
          )}
        </View>

        <T v="whisper" style={{ textAlign: 'center', marginTop: space(1) }}>
          Numbers first. Described, never judged.
        </T>
      </ScrollView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: glass.fill, borderRadius: 18, padding: space(3.5), overflow: 'hidden' },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: glass.hi },
  hero: { backgroundColor: glass.fill, borderRadius: 20, padding: space(4), overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end', gap: space(3.5) },
  heroNum: { fontFamily: 'Bricolage-Bold', fontSize: 42, lineHeight: 42, letterSpacing: -1.5, color: palette.ink },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 54 },
  ringCard: { backgroundColor: glass.fill, borderRadius: 18, padding: space(3.25), overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flex: 1 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space(2) },
  deltaChip: { borderRadius: 8, paddingVertical: 2, paddingHorizontal: space(1.75) },
  pill: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: space(2.25) },
  payBand: { position: 'relative', height: 74, marginTop: space(1) },
  payTrack: { position: 'absolute', left: 0, right: 0, top: 34, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,182,92,.28)' },
  payMark: { position: 'absolute', top: 26, width: 2, height: 22, borderRadius: 1, shadowOffset: { width: 0, height: 0 } },
  payLabelTop: { position: 'absolute', top: 6, fontSize: 9.5, color: palette.ink, transform: [{ translateX: -20 }] },
  payLabelBtm: { position: 'absolute', top: 52, fontSize: 9.5, transform: [{ translateX: -24 }] },
  payTick: { position: 'absolute', top: 52, fontSize: 9, color: ink.faint, transform: [{ translateX: -18 }] },
  ccrnTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,182,92,.14)', overflow: 'hidden', marginTop: space(1.5) },
  ccrnFill: { height: '100%', backgroundColor: palette.amber },
});
