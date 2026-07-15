import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { DebriefIcon, LogbookIcon } from '@/components/tab-icon';
import { colors, space } from '@/theme';

function SettingsButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={() => router.push('/settings')}
      hitSlop={12}
      style={{ paddingHorizontal: space(4) }}>
      <Text style={{ color: colors.secondary, fontSize: 20 }}>⚙︎</Text>
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerRight: () => <SettingsButton />,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Debrief',
          tabBarIcon: ({ color }) => <DebriefIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="logbook"
        options={{
          title: 'Logbook',
          tabBarIcon: ({ color }) => <LogbookIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
