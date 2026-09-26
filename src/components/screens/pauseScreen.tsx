import { Button, Heading, Hint, Panel, Screen } from "../ui";

interface PauseScreenProps {
  onReturnToMenu: () => void;
  onResume: () => void;
}

export function PauseScreen({ onReturnToMenu, onResume }: PauseScreenProps) {
  return (
    <Screen>
      <Panel width={460}>
        <Heading title="PAUSED" subtitle="Game is currently paused" tone="cyan" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button variant="green" size="lg" onClick={onResume}>
            Resume Game
          </Button>
          <Button variant="neutral" size="lg" onClick={onReturnToMenu}>
            Main Menu
          </Button>
        </div>

        <Hint className="mt-6">
          WASD to move · Space to place bombs · ESC to pause/resume
        </Hint>
      </Panel>
    </Screen>
  );
}
