import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { space, type } from '@/theme';

export default function MilestoneScreen() {
  return (
    <Screen style={{ padding: space(6) }}>
      <Text style={type.secondary}>Milestone card lands here.</Text>
    </Screen>
  );
}
