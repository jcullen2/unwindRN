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
// Two awaits sit between the call and playback. Without a generation counter,
// a second reply arriving first would leave both voices talking at once.
let generation = 0;

export async function speak(text: string): Promise<void> {
  stopSpeaking(); // bumps the generation, so claim ours after it
  const mine = generation;
  try {
    if (!audioModeReady) {
      await setAudioModeAsync({ playsInSilentMode: true });
      audioModeReady = true;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token || mine !== generation) return;

    const uri = `${FUNCTIONS_URL}/speak?text=${encodeURIComponent(text.slice(0, 1200))}`;
    const player = createAudioPlayer({
      uri,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
    });
    if (mine !== generation) {
      player.remove();
      return;
    }
    current = player;
    player.play();
  } catch {
    // text-only is fine
  }
}

export function stopSpeaking(): void {
  generation++;
  try {
    current?.pause();
    current?.remove();
  } catch {
    // already gone
  }
  current = null;
}
