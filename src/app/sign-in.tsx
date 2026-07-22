import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
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
import { FlameButton, GlassField, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { supabase } from '@/lib/supabase';
import { ink, palette, space, type } from '@/theme/tokens';

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
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Email is the primary door: sign-in if the record exists, quiet sign-up if
  // it doesn't — one button, no separate "create account" ceremony.
  const emailIn = async () => {
    if (busy) return;
    const addr = email.trim().toLowerCase();
    if (!addr.includes('@')) {
      Alert.alert('Almost', 'That email doesn’t look complete.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Almost', 'Use a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const signIn = await supabase.auth.signInWithPassword({ email: addr, password });
      if (!signIn.error) return;
      if (!/invalid login credentials/i.test(signIn.error.message)) throw signIn.error;
      // No record under this email yet — start one with these credentials.
      const signUp = await supabase.auth.signUp({ email: addr, password });
      if (signUp.error) throw signUp.error;
      if (!signUp.data.session) {
        Alert.alert(
          'Check your email',
          `We sent a confirmation link to ${addr}. Tap it, then come back and sign in.`
        );
      }
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : 'Give it another try in a moment.';
      Alert.alert("Couldn't sign you in", detail);
    } finally {
      setBusy(false);
    }
  };

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

  // Dev-only demo entry: a REAL Supabase session (real rows, real RLS, real
  // AI pipeline) with no Apple ID — simulators can't do Apple auth reliably
  // (ASAuthorizationError 1000). Tries anonymous sign-in first; if that's not
  // enabled, falls back to the demo-login function, which mints a throwaway
  // demo user + one-time token with zero dashboard config. Dev builds only.
  const demoIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const anon = await supabase.auth.signInAnonymously();
      if (!anon.error) return;
      const { data, error } = await supabase.functions.invoke('demo-login', { body: {} });
      if (error || !data?.token_hash) throw error ?? new Error('demo-login unavailable');
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'email',
      });
      if (verifyError) throw verifyError;
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e);
      Alert.alert("Demo mode couldn't start", `The server said: "${detail}"`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sky>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom + space(9) }]}>
        <PulsingLantern size={62} />
        <T style={styles.wm}>
          unwind<T style={styles.rn}>RN</T>
        </T>
        <T v="secondary" style={{ marginTop: space(2.5) }}>
          Put the shift down.
        </T>

        {emailOpen ? (
          <View style={styles.emailWrap}>
            <GlassField>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={ink.faint}
                keyboardAppearance="dark"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                style={styles.input}
              />
            </GlassField>
            <GlassField style={{ marginTop: space(2) }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={ink.faint}
                keyboardAppearance="dark"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                style={styles.input}
                onSubmitEditing={emailIn}
              />
            </GlassField>
            <T v="whisper" style={{ marginTop: space(2.5), textAlign: 'center' }}>
              New here? The same button starts your record.
            </T>
            <FlameButton title="Continue" onPress={emailIn} loading={busy} style={{ marginTop: space(3.5) }} />
            <Pressable accessibilityRole="button" onPress={() => setEmailOpen(false)} hitSlop={8} style={styles.demo}>
              <T v="caption" style={{ color: ink.dim, textAlign: 'center' }}>
                Back
              </T>
            </Pressable>
          </View>
        ) : (
          <>
            <FlameButton title="Continue with email" onPress={() => setEmailOpen(true)} style={styles.emailCta} />
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={20}
              style={styles.apple}
              onPress={signIn}
            />
          </>
        )}
        {__DEV__ && (
          <Pressable accessibilityRole="button" onPress={demoIn} disabled={busy} style={styles.demo} hitSlop={8}>
            <T v="caption" style={{ color: palette.moss, textAlign: 'center' }}>
              Demo mode — explore without an account
            </T>
          </Pressable>
        )}

        <T v="whisper" style={styles.footer}>
          Not therapy or medical care.{'\n'}In crisis, call or text 988.
        </T>
      </View>
      </KeyboardAvoidingView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(9) },
  wm: { fontFamily: 'Bricolage-Medium', fontSize: 30, color: palette.ink, marginTop: space(5.5) },
  rn: { fontFamily: 'Bricolage-SemiBold', fontSize: 14, color: palette.amber, position: 'relative', top: -12 },
  emailCta: { width: '100%', marginTop: space(12) },
  apple: { height: 52, width: '100%', marginTop: space(2.5) },
  emailWrap: { width: '100%', marginTop: space(10) },
  input: { color: palette.ink, fontSize: type.body.fontSize, lineHeight: 22, padding: 0, minHeight: 24 },
  demo: { paddingVertical: space(3), paddingHorizontal: space(4) },
  footer: { position: 'absolute', bottom: space(4), textAlign: 'center' },
});
