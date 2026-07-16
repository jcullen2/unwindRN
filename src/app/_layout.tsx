import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth';
import { fonts, ink, palette } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync(palette.night);

const queryClient = new QueryClient();

const navTheme = {
  dark: true,
  colors: {
    primary: palette.flame,
    background: palette.night,
    card: palette.night,
    text: ink.text,
    border: 'transparent',
    notification: palette.flame,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

function RootNavigator() {
  const { ready: authReady, session, profile } = useAuth();
  const [fontsLoaded, fontsError] = useFonts({
    [fonts.serif500]: require('@/assets/fonts/Fraunces-Medium.ttf'),
    [fonts.serif600]: require('@/assets/fonts/Fraunces-SemiBold.ttf'),
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
        headerShown: false,
        contentStyle: { backgroundColor: palette.night },
      }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>

      {/* Sign-in first; the conversational onboarding writes the profile. */}
      <Stack.Protected guard={signedIn && !authed}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={authed}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="debrief"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="record" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="resources" options={{ presentation: 'modal' }} />
        <Stack.Screen name="shift/[id]" />
        <Stack.Screen
          name="milestone"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
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
