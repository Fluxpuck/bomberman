import { useState, useEffect, useRef, useCallback } from 'react';

// Local storage keys
const VOLUME_STORAGE_KEY = "bomberman-volume";
const MUTE_STORAGE_KEY = "bomberman-muted";

interface UseAudioOptions {
  audioSrc: string;
  autoPlay?: boolean;
  defaultVolume?: number;
  defaultMuted?: boolean;
  loop?: boolean;
}

interface UseAudioReturn {
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  play: () => Promise<void> | undefined;
  pause: () => void;
}

/**
 * Custom hook for audio playback with volume control and localStorage persistence
 */
export function useAudio({
  audioSrc,
  autoPlay = false,
  defaultVolume = 0.5,
  defaultMuted = false,
  loop = true
}: UseAudioOptions): UseAudioReturn {
  // Use default values initially to prevent hydration errors
  const [volume, setVolumeState] = useState<number>(defaultVolume);
  const [isMuted, setIsMuted] = useState<boolean>(defaultMuted);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Set isClient to true once component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load settings from localStorage only on client side after initial render
  useEffect(() => {
    if (!isClient) return;

    try {
      const storedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (storedVolume) {
        setVolumeState(parseFloat(storedVolume));
      }

      const storedMuted = localStorage.getItem(MUTE_STORAGE_KEY);
      if (storedMuted) {
        setIsMuted(storedMuted === "true");
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }
  }, [isClient]);

  // Initialize audio when component mounts and after client-side values are loaded
  useEffect(() => {
    if (!isClient) return;

    // Create audio element
    audioRef.current = new Audio(audioSrc);
    audioRef.current.loop = loop;
    audioRef.current.volume = isMuted ? 0 : volume;

    // Try to autoplay if requested
    if (autoPlay) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.log("Autoplay prevented, waiting for user interaction", error);
            setIsPlaying(false);
          });
      }
    }

    // Add event listeners
    const audio = audioRef.current;
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', () => setIsPlaying(false));

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audio.removeEventListener('play', () => setIsPlaying(true));
        audio.removeEventListener('pause', () => setIsPlaying(false));
        audio.removeEventListener('ended', () => setIsPlaying(false));
      }
    };
  }, [isClient, audioSrc, loop, autoPlay]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Set volume with localStorage persistence
  const setVolume = useCallback((newVolume: number) => {
    if (!isClient) return;
    
    setVolumeState(newVolume);
    
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, newVolume.toString());
    } catch (error) {
      console.error("Error saving volume to localStorage:", error);
    }
  }, [isClient]);

  // Toggle mute with localStorage persistence
  const toggleMute = useCallback(() => {
    if (!isClient) return;
    
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, newMuteState.toString());
    } catch (error) {
      console.error("Error saving mute state to localStorage:", error);
    }
  }, [isMuted, isClient]);

  // Play audio
  const play = useCallback(() => {
    if (!audioRef.current) return;
    return audioRef.current.play();
  }, []);

  // Pause audio
  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);

  return {
    volume,
    isMuted,
    isPlaying,
    toggleMute,
    setVolume,
    play,
    pause
  };
}
