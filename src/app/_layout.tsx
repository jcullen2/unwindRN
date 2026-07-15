import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth';
import { colors, navTheme, serif } from '@/theme';

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync(colors.bg);

const queryClient = new QueryClient();

function RootNavigator() {
  const { ready: authReady, session, profile, onboardingSeen } = useAuth();
  // Fraunces is only used for large numerals; if it fails to load we fall
  // back to the system font rather than blocking launch.
  const [fontsLoaded, fontsError] = useFonts({
    [serif]: require('@/assets/fonts/Fraunces-SemiBold.ttf'),
  });
  const ready = authReady && (fontsLoaded || !!fontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const signedIn = !!session;
  const authed = signedIn && !!profile;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Protected guard={!signedIn && !onboardingSeen}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn && onboardingSeen}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !authed}>
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={authed}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
        <Stack.Screen name="settings/profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="resources" options={{ title: 'Support resources' }} />
        <Stack.Screen name="shift/[id]" options={{ title: 'Shift' }} />
        <Stack.Screen
          name="shift-form"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="milestone"
          options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
