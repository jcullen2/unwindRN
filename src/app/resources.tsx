import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameButton, Glass, QuietButton, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { NOT_THERAPY_COPY } from '@/lib/constants';
import { space } from '@/theme/tokens';

export default function ResourcesScreen() {
  const insets = useSafeAreaInsets();
  return (
    <Sky>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top > 0 ? insets.top : space(8),
          padding: space(6),
          gap: space(4),
        }}>
        <T v="greeting" style={{ fontSize: 24, lineHeight: 30 }}>
          Support resources
        </T>

        <Glass>
          <T v="body" style={{ fontWeight: '600' }}>
            988 Suicide &amp; Crisis Lifeline
          </T>
          <T v="secondary" style={{ marginTop: space(2) }}>
            Free, 24/7, confidential. Call or text 988 any time.
          </T>
          <View style={{ flexDirection: 'row', gap: space(3), marginTop: space(4) }}>
            <FlameButton title="Call 988" onPress={() => Linking.openURL('tel:988')} style={{ flex: 1 }} />
            <QuietButton title="Text 988" onPress={() => Linking.openURL('sms:988')} style={{ flex: 1 }} />
          </View>
        </Glass>

        <Glass>
          <T v="body" style={{ fontWeight: '600' }}>
            Crisis Text Line
          </T>
          <T v="secondary" style={{ marginTop: space(2) }}>
            Text HOME to 741741 to reach a trained crisis counselor.
          </T>
          <QuietButton
            title="Text HOME to 741741"
            onPress={() => Linking.openURL('sms:741741&body=HOME')}
            style={{ marginTop: space(4) }}
          />
        </Glass>

        <T v="whisper" style={{ textAlign: 'center', marginTop: space(2) }}>
          {NOT_THERAPY_COPY} If you're in crisis, reach out to the resources above.
        </T>
      </ScrollView>
    </Sky>
  );
}
