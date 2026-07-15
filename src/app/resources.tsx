import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { NOT_THERAPY_COPY } from '@/lib/constants';
import { colors, space, type } from '@/theme';

export default function ResourcesScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(6), gap: space(4) }}>
        <Card>
          <Text style={type.heading}>988 Suicide & Crisis Lifeline</Text>
          <Text style={[type.secondary, { marginTop: space(2) }]}>
            Free, 24/7, confidential. Call or text 988 any time.
          </Text>
          <View style={styles.buttonRow}>
            <Button title="Call 988" onPress={() => Linking.openURL('tel:988')} style={{ flex: 1 }} />
            <Button
              title="Text 988"
              variant="secondary"
              onPress={() => Linking.openURL('sms:988')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        <Card>
          <Text style={type.heading}>Crisis Text Line</Text>
          <Text style={[type.secondary, { marginTop: space(2) }]}>
            Text HOME to 741741 to reach a trained crisis counselor.
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title="Text HOME to 741741"
              variant="secondary"
              onPress={() => Linking.openURL('sms:741741&body=HOME')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        <Text style={[type.caption, { textAlign: 'center', marginTop: space(2) }]}>
          {NOT_THERAPY_COPY} If you're in crisis, reach out to the resources above.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(4),
  },
});
