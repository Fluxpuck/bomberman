// Sound manager for the game

// Cache for audio elements to avoid creating multiple instances
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Play a sound effect
 * @param soundName Name of the sound file without extension (e.g., 'explosion')
 * @param volume Volume level from 0 to 1
 * @param loop Whether the sound should loop
 * @returns The audio element
 */
export function playSound(
  soundName: string,
  volume: number = 1.0,
  loop: boolean = false
): HTMLAudioElement | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    // Check if we already have this sound cached
    let audio = audioCache[soundName];
    
    // Create a new audio element if not cached
    if (!audio) {
      audio = new Audio(`/${soundName}.mp3`);
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
      playPromise.catch(error => {
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
  
  Object.values(audioCache).forEach(audio => {
    audio.volume = normalizedVolume;
  });
}
