import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/theme';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('No identity token returned');
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert("Couldn't sign you in", 'Give it another try in a moment.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom + space(8),
        paddingHorizontal: space(8),
      }}>
      <View style={styles.hero}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.mark}
          accessibilityLabel="unwindRN mark"
        />
        <Text style={styles.brand}>unwindRN</Text>
        <Text style={styles.tagline}>Put the shift down.</Text>
        <Text style={styles.sub}>
          Debrief the day with a partner who gets it. Keep the record — shifts, hours,
          wins, losses, lessons.
        </Text>
      </View>

      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={12}
        style={styles.appleButton}
        onPress={signIn}
      />
      <Text style={styles.footnote}>
        Your debriefs are yours. We never ask for patient details.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  mark: {
    width: 64,
    height: 64,
    marginBottom: space(6),
  },
  brand: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 21,
    fontWeight: '600',
    lineHeight: 28,
    color: colors.amber,
    marginTop: space(2),
  },
  sub: {
    ...type.secondary,
    lineHeight: 24,
    marginTop: space(4),
    maxWidth: 320,
  },
  appleButton: {
    height: 52,
  },
  footnote: {
    ...type.caption,
    textAlign: 'center',
    marginTop: space(4),
  },
});
