import { Button, Heading, Hint, Panel, Screen } from "../ui";

interface PauseScreenProps {
  onReturnToMenu: () => void;
  onResume: () => void;
}

export function PauseScreen({ onReturnToMenu, onResume }: PauseScreenProps) {
  return (
    <Screen>
      <Panel width={400}>
        <Heading title="PAUSED" subtitle="Game is currently paused" tone="cyan" />

        <div className="flex flex-col gap-4">
          <Button block variant="green" size="lg" onClick={onResume}>
            Resume Game
          </Button>
          <Button block variant="neutral" onClick={onReturnToMenu}>
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
