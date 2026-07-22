/**
 * On-device STT (CLAUDE.md: audio NEVER leaves the phone — only transcript
 * text goes to the server). Wraps expo-speech-recognition with availability
 * detection so the debrief degrades to quiet-mode text wherever the native
 * module or on-device recognition isn't available.
 *
 * The native module is loaded DEFENSIVELY: expo-speech-recognition calls
 * requireNativeModule at import time, so on a binary that doesn't contain the
 * pod (Expo Go, a build made before pod install ran) a plain import crashes
 * the whole app at startup. Here that failure is caught and simply means
 * available=false — the debrief opens in quiet mode instead of red-screening.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechModule = typeof import('expo-speech-recognition');

let speech: SpeechModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  speech = require('expo-speech-recognition') as SpeechModule;
} catch {
  speech = null; // native module absent — quiet mode only
}

// Fixed at module load, so hook order is stable across renders.
const useSpeechEvent: SpeechModule['useSpeechRecognitionEvent'] = speech
  ? speech.useSpeechRecognitionEvent
  : ((() => {}) as SpeechModule['useSpeechRecognitionEvent']);

const SILENCE_MS = 1200; // end-of-turn on ~1.2s silence

export type MicPermission = 'undetermined' | 'granted' | 'denied';

export function useVoiceTurn(onFinal: (text: string) => void) {
  const [available, setAvailable] = useState(false);
  const [permission, setPermission] = useState<MicPermission>('undetermined');
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const interimRef = useRef('');
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    if (!speech) {
      setAvailable(false);
      return;
    }
    try {
      // Sync in current versions; wrap so an async variant also works.
      Promise.resolve(speech.ExpoSpeechRecognitionModule.isRecognitionAvailable()).then(
        (ok) => setAvailable(!!ok),
        () => setAvailable(false)
      );
    } catch {
      setAvailable(false);
    }
    // Permission state feeds the contextual priming card: the system dialog
    // must never fire cold — the debrief explains the on-device promise first.
    try {
      speech.ExpoSpeechRecognitionModule.getPermissionsAsync().then(
        (p) => setPermission(p.granted ? 'granted' : p.status === 'denied' ? 'denied' : 'undetermined'),
        () => setPermission('undetermined')
      );
    } catch {
      setPermission('undetermined');
    }
  }, []);

  /**
   * Fires the iOS mic + speech dialogs. Call ONLY from the priming card (or
   * after it) so the ask always lands in context. Returns whether we can talk.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!speech) return false;
    try {
      const perms = await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setPermission(perms.granted ? 'granted' : 'denied');
      return perms.granted;
    } catch {
      setPermission('denied');
      return false;
    }
  }, []);

  const finishTurn = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = null;
    const text = interimRef.current.trim();
    interimRef.current = '';
    setInterim('');
    setListening(false);
    try {
      speech?.ExpoSpeechRecognitionModule.stop();
    } catch {
      // already stopped
    }
    if (text) onFinalRef.current(text);
  }, []);

  const armSilenceTimer = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(finishTurn, SILENCE_MS);
  }, [finishTurn]);

  useSpeechEvent('result', (event) => {
    const text = event.results?.[0]?.transcript ?? '';
    interimRef.current = text;
    setInterim(text);
    armSilenceTimer();
  });
  useSpeechEvent('end', () => {
    if (interimRef.current.trim()) finishTurn();
    else setListening(false);
  });
  useSpeechEvent('error', () => {
    setListening(false);
    setInterim('');
    interimRef.current = '';
  });

  const start = useCallback(async () => {
    if (!speech) return false;
    try {
      // Belt-and-suspenders: resolves instantly when already granted. The
      // contextual card upstream is what keeps this from firing cold.
      const perms = await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setPermission(perms.granted ? 'granted' : 'denied');
      if (!perms.granted) return false;
      speech.ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: true, // the privacy promise
        addsPunctuation: true,
      });
      setListening(true);
      return true;
    } catch {
      setAvailable(false);
      return false;
    }
  }, []);

  /** Orb tap while listening = end the turn now. */
  const stop = finishTurn;

  useEffect(
    () => () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      try {
        speech?.ExpoSpeechRecognitionModule.abort();
      } catch {
        // not running
      }
    },
    []
  );

  return { available, permission, requestPermission, listening, interim, start, stop };
}
