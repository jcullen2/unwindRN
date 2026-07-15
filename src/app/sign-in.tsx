import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
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
        paddingTop: insets.top + space(20),
        paddingBottom: insets.bottom + space(8),
        paddingHorizontal: space(6),
      }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.brand}>unwindRN</Text>
        <Text style={styles.tagline}>Put the shift down.</Text>
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
  brand: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    ...type.heading,
    color: colors.amber,
    marginTop: space(3),
  },
  appleButton: {
    height: 50,
  },
  footnote: {
    ...type.caption,
    textAlign: 'center',
    marginTop: space(4),
  },
});
