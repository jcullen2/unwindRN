import { Tabs } from 'expo-router';

import { NavPill } from '@/components/nav-pill';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <NavPill {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="logbook" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
