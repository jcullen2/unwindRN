import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { space, type } from '@/theme';

export default function DebriefScreen() {
  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center', padding: space(6) }}>
      <Text style={type.secondary}>The Debrief lands here.</Text>
    </Screen>
  );
}
