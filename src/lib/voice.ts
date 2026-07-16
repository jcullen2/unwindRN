/**
 * On-device STT (CLAUDE.md: audio NEVER leaves the phone — only transcript
 * text goes to the server). Wraps expo-speech-recognition with availability
 * detection so the debrief degrades to quiet-mode text wherever the native
 * module or on-device recognition isn't available.
 */
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';

const SILENCE_MS = 1200; // end-of-turn on ~1.2s silence

export function useVoiceTurn(onFinal: (text: string) => void) {
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const interimRef = useRef('');
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    try {
      // Sync in current versions; wrap so an async variant also works.
      Promise.resolve(ExpoSpeechRecognitionModule.isRecognitionAvailable()).then(
        (ok) => setAvailable(!!ok),
        () => setAvailable(false)
      );
    } catch {
      setAvailable(false);
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
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // already stopped
    }
    if (text) onFinalRef.current(text);
  }, []);

  const armSilenceTimer = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(finishTurn, SILENCE_MS);
  }, [finishTurn]);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript ?? '';
    interimRef.current = text;
    setInterim(text);
    armSilenceTimer();
  });
  useSpeechRecognitionEvent('end', () => {
    if (interimRef.current.trim()) finishTurn();
    else setListening(false);
  });
  useSpeechRecognitionEvent('error', () => {
    setListening(false);
    setInterim('');
    interimRef.current = '';
  });

  const start = useCallback(async () => {
    try {
      const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perms.granted) return false;
      ExpoSpeechRecognitionModule.start({
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
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // not running
      }
    },
    []
  );

  return { available, listening, interim, start, stop };
}
