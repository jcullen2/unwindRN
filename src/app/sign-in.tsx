import { Canvas, ImageSVG, Skia } from '@shopify/react-native-skia';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LOGO_ASPECT, LOGO_PRIMARY_DARK_SVG } from '@/brand/logo';
import { T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { supabase } from '@/lib/supabase';
import { ink, space } from '@/theme/tokens';

/** The supplied primary-dark lockup — never rebuilt with live type. */
function Lockup({ width }: { width: number }) {
  const w = Math.max(140, width); // brand minimum
  const h = w / LOGO_ASPECT;
  const svg = useMemo(() => {
    const withSize = LOGO_PRIMARY_DARK_SVG.replace(
      '<svg ',
      `<svg width="${w}" height="${h}" `
    );
    return Skia.SVG.MakeFromString(withSize);
  }, [w, h]);
  if (!svg) return null;
  return (
    <Canvas style={{ width: w, height: h }} pointerEvents="none">
      <ImageSVG svg={svg} x={0} y={0} width={w} height={h} />
    </Canvas>
  );
}

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
      if (!credential.identityToken) throw new Error('No identity token');
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
    <Sky>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + space(8),
          paddingHorizontal: space(8),
        }}>
        <View style={styles.hero}>
          <Lockup width={210} />
          <T v="greeting" style={{ fontSize: 21, lineHeight: 28, marginTop: space(6), color: ink.text }}>
            Put the shift down.
          </T>
          <T v="secondary" style={{ marginTop: space(3), maxWidth: 320, lineHeight: 23 }}>
            Talk the shift down with a partner who gets it, and watch the record write
            itself — shifts, hours, wins, the weight, the lessons.
          </T>
        </View>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={14}
          style={{ height: 52 }}
          onPress={signIn}
        />
        <T v="whisper" style={{ textAlign: 'center', marginTop: space(4) }}>
          Your debriefs are yours. We never ask for patient details.
        </T>
      </View>
    </Sky>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
});
