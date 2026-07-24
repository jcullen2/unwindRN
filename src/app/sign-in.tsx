/**
 * Sign-in — explicit create-account / log-in split, passwordless.
 * Email OTP is the primary door: we send a six-digit code, she types it, done.
 * No password to invent at 7am after a night shift, and no browser round-trip
 * (the old confirmation-link flow dead-ended the app). Apple stays as the
 * secondary door; a __DEV__-only anonymous bypass keeps simulator work moving.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameButton, GlassField, QuietButton, T } from '@/components/kit';
import { PulsingLantern } from '@/components/lantern';
import { Sky } from '@/components/sky';
import { supabase } from '@/lib/supabase';
import { ink, palette, space, type } from '@/theme/tokens';

type Mode = 'create' | 'login';
type Stage = 'landing' | 'email' | 'code';

const RESEND_SECONDS = 60;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>('landing');
  const [mode, setMode] = useState<Mode>('create');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [noRecord, setNoRecord] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<TextInput>(null);

  // Resend cooldown tick.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const addr = email.trim().toLowerCase();

  const sendCode = async (asMode: Mode = mode) => {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(addr)) {
      Alert.alert('Almost', 'That email doesn’t look complete.');
      return;
    }
    setBusy(true);
    setNoRecord(false);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: addr,
        // The one behavioral difference between the two doors: logging in
        // never quietly creates an account under a typo'd email.
        options: { shouldCreateUser: asMode === 'create' },
      });
      if (error) {
        if (/signups not allowed|otp_disabled/i.test(error.message) || error.code === 'otp_disabled') {
          setNoRecord(true); // log-in path, no record under this email
          return;
        }
        if (error.status === 429 || /rate limit/i.test(error.message)) {
          Alert.alert('One moment', 'Codes can only be sent about once a minute. Give it a beat and try again.');
          return;
        }
        throw error;
      }
      setCode('');
      setStage('code');
      setCooldown(RESEND_SECONDS);
      setTimeout(() => codeRef.current?.focus(), 350);
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : 'Give it another try in a moment.';
      Alert.alert("Couldn't send the code", detail);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (token: string) => {
    if (busy || token.length !== 6) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: addr, token, type: 'email' });
      if (error) {
        // Her digits stay put. Clearing the field on a bad code is the single
        // most-hated behaviour on these screens: she has to re-read the email
        // and retype all six to fix one.
        setCodeError('That code didn’t match. Check the newest email — only the latest one works.');
        codeRef.current?.setSelection?.(0, token.length);
        return;
      }
      // Session lands via onAuthStateChange; the root guards route from here.
    } finally {
      setBusy(false);
    }
  };

  const apple = async () => {
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
      const code_ = (e as { code?: string }).code;
      if (code_ !== 'ERR_REQUEST_CANCELED') {
        Alert.alert("Couldn't sign you in", 'Give it another try in a moment.');
      }
    } finally {
      setBusy(false);
    }
  };

  // __DEV__ builds only (stripped from release): anonymous session so the
  // simulator can exercise the app without Apple/email plumbing.
  const devBypass = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) Alert.alert('Bypass failed', error.message);
  };

  const back = () => {
    setNoRecord(false);
    if (stage === 'code') setStage('email');
    else setStage('landing');
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

        {stage === 'landing' && (
          <View style={styles.paneWrap}>
            <FlameButton
              title="Start your record"
              onPress={() => {
                setMode('create');
                setStage('email');
              }}
              style={{ width: '100%' }}
            />
            <QuietButton
              title="I already have one"
              onPress={() => {
                setMode('login');
                setStage('email');
              }}
              style={{ width: '100%', marginTop: space(2.5) }}
            />
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={20}
              style={styles.apple}
              onPress={apple}
            />
          </View>
        )}

        {stage === 'email' && (
          <View style={styles.paneWrap}>
            <T v="ask" style={{ fontSize: 22, textAlign: 'center' }}>
              {mode === 'create' ? 'Start your record.' : 'Welcome back.'}
            </T>
            <T v="secondary" style={{ marginTop: space(2), textAlign: 'center' }}>
              We’ll email you a six-digit code.{'\n'}No password to remember.
            </T>
            <GlassField style={{ marginTop: space(5), width: '100%' }}>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setNoRecord(false);
                }}
                placeholder="Email"
                // The placeholder is otherwise the field's only accessible
                // name, and a placeholder disappears the moment she types.
                accessibilityLabel="Email address"
                placeholderTextColor={ink.faint}
                keyboardAppearance="dark"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
                style={styles.input}
                onSubmitEditing={() => sendCode()}
              />
            </GlassField>
            {noRecord ? (
              <View style={{ width: '100%' }}>
                <T v="whisper" style={{ marginTop: space(3), textAlign: 'center' }}>
                  No record under this email yet.
                </T>
                <FlameButton
                  title="Start one instead"
                  onPress={() => {
                    setMode('create');
                    sendCode('create');
                  }}
                  loading={busy}
                  style={{ marginTop: space(3), width: '100%' }}
                />
              </View>
            ) : (
              <FlameButton
                title="Send the code"
                onPress={() => sendCode()}
                loading={busy}
                style={{ marginTop: space(3.5), width: '100%' }}
              />
            )}
            <Pressable accessibilityRole="button" onPress={back} hitSlop={8} style={styles.quietLink}>
              <T v="caption" style={{ color: ink.dim, textAlign: 'center' }}>
                Back
              </T>
            </Pressable>
          </View>
        )}

        {stage === 'code' && (
          <View style={styles.paneWrap}>
            <T v="ask" style={{ fontSize: 22, textAlign: 'center' }}>
              Check your email.
            </T>
            <T v="secondary" style={{ marginTop: space(2), textAlign: 'center' }}>
              The code went to{'\n'}
              <T v="secondary" style={{ color: ink.text }}>{addr}</T>
            </T>
            <GlassField style={{ marginTop: space(5), width: '100%' }}>
              <TextInput
                ref={codeRef}
                value={code}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, '').slice(0, 6);
                  setCode(digits);
                  setCodeError(null);
                  if (digits.length === 6) verify(digits);
                }}
                placeholder="••••••"
                placeholderTextColor={ink.faint}
                keyboardAppearance="dark"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                // Deliberately longer than six: maxLength truncates BEFORE the
                // non-digit strip above, so pasting "123 456" from the email
                // would otherwise lose its last digit and silently fail.
                maxLength={12}
                accessibilityLabel={`Verification code, 6 digits, sent to ${addr}`}
                style={[styles.input, styles.codeInput]}
              />
            </GlassField>
            {codeError && (
              <T v="caption" style={{ color: palette.amber, marginTop: space(2), textAlign: 'center' }}>
                {codeError}
              </T>
            )}
            <FlameButton
              title="Open the record"
              onPress={() => verify(code)}
              loading={busy}
              disabled={code.length !== 6}
              style={{ marginTop: space(3.5), width: '100%' }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => sendCode()}
              disabled={cooldown > 0 || busy}
              hitSlop={8}
              style={styles.quietLink}>
              <T v="caption" style={{ color: cooldown > 0 ? ink.faint : ink.dim, textAlign: 'center' }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend the code'}
              </T>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={back} hitSlop={8} style={styles.quietLink}>
              <T v="caption" style={{ color: ink.dim, textAlign: 'center' }}>
                Different email
              </T>
            </Pressable>
          </View>
        )}

        {__DEV__ && stage === 'landing' && (
          <Pressable accessibilityRole="button" onPress={devBypass} disabled={busy} style={styles.quietLink} hitSlop={8}>
            <T v="caption" style={{ color: ink.dim, textAlign: 'center' }}>
              Dev bypass
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
  wm: { fontFamily: 'Bricolage-Medium', fontSize: 30, lineHeight: 40, color: palette.ink, marginTop: space(5.5) },
  rn: { fontFamily: 'Bricolage-SemiBold', fontSize: 14, color: palette.amber, position: 'relative', top: -12 },
  paneWrap: { width: '100%', marginTop: space(10), alignItems: 'center' },
  apple: { height: 52, width: '100%', marginTop: space(2.5) },
  input: { color: palette.ink, fontSize: type.body.fontSize, lineHeight: 22, padding: 0, minHeight: 24 },
  codeInput: {
    fontFamily: 'Bricolage-SemiBold',
    fontSize: 24,
    lineHeight: 30,
    minHeight: 32,
    letterSpacing: 10,
    textAlign: 'center',
  },
  quietLink: { paddingVertical: space(3), paddingHorizontal: space(4) },
  footer: { position: 'absolute', bottom: space(4), textAlign: 'center' },
});
