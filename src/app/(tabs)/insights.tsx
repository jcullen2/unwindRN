import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lamp } from '@/brand';
import { T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { useShifts } from '@/lib/queries';
import { space } from '@/theme/tokens';

const UNLOCK_AT = 5;

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { data: shifts } = useShifts();
  const logged = shifts?.length ?? 0;
  const toGo = Math.max(0, UNLOCK_AT - logged);

  // Locked state until shift 5 — no fake data, ever. The three modules
  // (load trend, hours over usual, tag frequency) land in Session 4.
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
        {toGo > 0 ? (
          <>
            <T v="greeting" style={{ fontSize: 24, lineHeight: 32, textAlign: 'center', marginTop: space(6) }}>
              Insights unlock at shift {UNLOCK_AT}.
            </T>
            <T v="secondary" style={{ textAlign: 'center', marginTop: space(2) }}>
              {toGo} to go. No rush — the record keeps either way.
            </T>
          </>
        ) : (
          <>
            <T v="greeting" style={{ fontSize: 24, lineHeight: 32, textAlign: 'center', marginTop: space(6) }}>
              {logged} shifts on the record.
            </T>
            <T v="secondary" style={{ textAlign: 'center', marginTop: space(2) }}>
              Your patterns — load trend, hours over usual, what keeps showing up —
              light up here next.
            </T>
          </>
        )}
      </View>
    </Sky>
  );
}
