import { useAudio } from "../hooks/useAudio";

// Path to background music
const BACKGROUND_MUSIC = "/music/lo-fi.mp3";

interface AudioControllerProps {
  autoPlay?: boolean;
}

export function AudioController({ autoPlay = true }: AudioControllerProps) {
  const { volume, isMuted, toggleMute, setVolume } = useAudio({
    audioSrc: BACKGROUND_MUSIC,
    autoPlay,
    loop: true,
    defaultVolume: 0.5,
    defaultMuted: false,
  });

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <div className="fixed top-2 sm:top-auto sm:bottom-4 left-1/2 transform -translate-x-1/2 portrait:top-auto portrait:bottom-2 portrait:left-auto portrait:right-2 portrait:-translate-x-0 bg-gray-800 bg-opacity-70 rounded-full px-4 py-2 flex items-center space-x-3 z-50">
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
        className="hidden sm:block w-24 accent-blue-500"
      />

      <span className="hidden sm:block text-white text-xs">{Math.round(volume * 100)}%</span>
    </div>
  );
}
