// Sound manager for the game

// Local storage key for the sound-effects mute preference
const SFX_MUTE_STORAGE_KEY = "bomb-blast-arena-sfx-muted";

// Cache for audio elements to avoid creating multiple instances
const audioCache: Record<string, HTMLAudioElement> = {};

// Cached mute flag for sound effects. Stays null until the first read so
// the persisted preference is loaded lazily on the client.
let soundMuted: boolean | null = null;

/**
 * Whether sound effects are muted. The preference is persisted in
 * localStorage and read lazily, so this is safe to call on the server.
 */
export function isSoundMuted(): boolean {
  if (soundMuted !== null) return soundMuted;
  if (typeof window === "undefined") return false;
  try {
    soundMuted = localStorage.getItem(SFX_MUTE_STORAGE_KEY) === "true";
  } catch {
    soundMuted = false;
  }
  return soundMuted;
}

/**
 * Mute or unmute all sound effects. Muting also pauses every cached sound
 * that is currently playing. The choice is persisted in localStorage.
 * @param muted Whether sound effects should be muted
 */
export function setSoundMuted(muted: boolean): void {
  soundMuted = muted;
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SFX_MUTE_STORAGE_KEY, muted.toString());
  } catch (error) {
    console.error("Error saving sound mute state to localStorage:", error);
  }

  if (muted) {
    Object.values(audioCache).forEach((audio) => audio.pause());
  }
}

/**
 * Play a sound effect
 * @param soundName Name of the sound file without extension (e.g., 'explosion')
 * @param volume Volume level from 0 to 1
 * @param loop Whether the sound should loop
 * @returns The audio element
 */
export function playSound(
  path: string,
  soundName: string,
  volume: number = 1.0,
  loop: boolean = false
): HTMLAudioElement | undefined {
  if (typeof window === "undefined") return undefined;
  if (isSoundMuted()) return undefined;

  try {
    // Check if we already have this sound cached
    let audio = audioCache[soundName];

    // Create a new audio element if not cached
    if (!audio) {
      audio = new Audio(`${path}/${soundName}.mp3`);
      audioCache[soundName] = audio;
    } else {
      // Reset the audio if it exists
      audio.currentTime = 0;
    }

    // Configure audio
    audio.volume = volume;
    audio.loop = loop;

    // Play the sound
    const playPromise = audio.play();

    // Handle autoplay restrictions
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log(`Error playing sound ${soundName}:`, error);
      });
    }

    return audio;
  } catch (error) {
    console.error(`Error playing sound ${soundName}:`, error);
    return undefined;
  }
}

/**
 * Stop a sound that's currently playing
 * @param soundName Name of the sound to stop
 */
export function stopSound(soundName: string): void {
  if (typeof window === "undefined") return;

  const audio = audioCache[soundName];
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

/**
 * Set the global volume for all sounds
 * @param volume Volume level from 0 to 1
 */
export function setGlobalVolume(volume: number): void {
  if (typeof window === "undefined") return;

  const normalizedVolume = Math.max(0, Math.min(1, volume));

  Object.values(audioCache).forEach((audio) => {
    audio.volume = normalizedVolume;
  });
}
