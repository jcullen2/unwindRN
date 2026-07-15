import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { space, type } from '@/theme';

export default function LogbookScreen() {
  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center', padding: space(6) }}>
      <Text style={type.secondary}>The Logbook lands here.</Text>
    </Screen>
  );
}
