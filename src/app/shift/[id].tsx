import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { space, type } from '@/theme';

export default function ShiftDetailScreen() {
  return (
    <Screen style={{ padding: space(6) }}>
      <Text style={type.secondary}>Shift detail lands here.</Text>
    </Screen>
  );
}
