import { Tabs } from 'expo-router';

import { NavPill } from '@/components/nav-pill';
import { useLiveShiftData } from '@/lib/live';

export default function TabLayout() {
  // Realtime + offline-queue sync keep every tab's data live while signed in.
  useLiveShiftData();
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
