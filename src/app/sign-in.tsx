import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lantern } from '@/brand';
import { Glass, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { supabase } from '@/lib/supabase';
import { ink, palette, space } from '@/theme/tokens';

/** The lantern glows on a 5s idle pulse (§Motion). */
export function PulsingLantern({ size = 58 }: { size?: number }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [v, reduced]);
  const st = useAnimatedStyle(() => ({ shadowOpacity: 0.5 + v.value * 0.4, shadowRadius: 12 + v.value * 14 }));
  return (
    <Animated.View
      style={[{ shadowColor: palette.amber, shadowOffset: { width: 0, height: 0 } }, st]}>
      <Lantern size={size} />
    </Animated.View>
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
      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom + space(9) }]}>
        <PulsingLantern size={62} />
        <T style={styles.wm}>
          unwind<T style={styles.rn}>RN</T>
        </T>
        <T v="secondary" style={{ marginTop: space(2.5) }}>
          Put the shift down.
        </T>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={20}
          style={styles.apple}
          onPress={signIn}
        />
        <Glass style={styles.already}>
          <T v="secondary" style={{ color: ink.dim, textAlign: 'center' }}>
            I already have a record
          </T>
        </Glass>

        <T v="whisper" style={styles.footer}>
          Not therapy or medical care.{'\n'}In crisis, call or text 988.
        </T>
      </View>
    </Sky>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(9) },
  wm: { fontFamily: 'Bricolage-Medium', fontSize: 30, color: palette.ink, marginTop: space(5.5) },
  rn: { fontFamily: 'Bricolage-SemiBold', fontSize: 14, color: palette.amber, position: 'relative', top: -12 },
  apple: { height: 52, width: '100%', marginTop: space(12) },
  already: { width: '100%', paddingVertical: space(3.25), marginTop: space(2.5) },
  footer: { position: 'absolute', bottom: space(4), textAlign: 'center' },
});
