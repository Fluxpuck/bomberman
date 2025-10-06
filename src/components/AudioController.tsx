import { useEffect, useRef, useState } from "react";

interface AudioControllerProps {
  autoPlay?: boolean;
}

export function AudioController({ autoPlay = true }: AudioControllerProps) {
  const [volume, setVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/music.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = volume;

      if (autoPlay) {
        // Use a timeout to ensure browser allows autoplay after user interaction
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Auto-play was prevented
            console.log("Autoplay prevented, waiting for user interaction");
          });
        }
      }
    }

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [autoPlay]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-70 rounded-full px-4 py-2 flex items-center space-x-3 z-50">
      <button
        onClick={toggleMute}
        className="text-white hover:text-gray-300 focus:outline-none"
      >
        {isMuted ? (
          <span className="text-xl">🔇</span>
        ) : (
          <span className="text-xl">🔊</span>
        )}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={handleVolumeChange}
        className="w-24 accent-blue-500"
      />

      <span className="text-white text-xs">{Math.round(volume * 100)}%</span>
    </div>
  );
}
