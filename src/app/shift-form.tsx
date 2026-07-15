import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { space, type } from '@/theme';

export default function ShiftFormScreen() {
  return (
    <Screen style={{ padding: space(6) }}>
      <Text style={type.secondary}>Shift form lands here.</Text>
    </Screen>
  );
}
