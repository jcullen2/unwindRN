/**
 * TTS playback via the speak edge function (ElevenLabs flash, streamed).
 * Any failure is silent — the caption is already on screen and the debrief
 * never blocks on audio.
 */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { supabase } from '@/lib/supabase';

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

let audioModeReady = false;
let current: AudioPlayer | null = null;

export async function speak(text: string): Promise<void> {
  try {
    if (!audioModeReady) {
      await setAudioModeAsync({ playsInSilentMode: true });
      audioModeReady = true;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    stopSpeaking();
    const uri = `${FUNCTIONS_URL}/speak?text=${encodeURIComponent(text.slice(0, 1200))}`;
    const player = createAudioPlayer({
      uri,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
    });
    current = player;
    player.play();
  } catch {
    // text-only is fine
  }
}

export function stopSpeaking(): void {
  try {
    current?.pause();
    current?.remove();
  } catch {
    // already gone
  }
  current = null;
}
