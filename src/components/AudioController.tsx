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
    <div className="ui-panel ui-panel--glass fixed top-2 sm:top-auto sm:bottom-4 left-1/2 transform -translate-x-1/2 portrait:top-auto portrait:bottom-2 portrait:left-auto portrait:right-2 portrait:-translate-x-0 !rounded-full !px-4 !py-2 flex items-center gap-3 z-50">
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute music" : "Mute music"}
        className="text-xl rounded-full transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
      >
        {isMuted ? "🔇" : "🔊"}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={handleVolumeChange}
        aria-label="Music volume"
        className="ui-range hidden sm:block w-24"
      />

      <span className="hidden sm:block ui-label !tracking-normal w-9 text-right">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}
