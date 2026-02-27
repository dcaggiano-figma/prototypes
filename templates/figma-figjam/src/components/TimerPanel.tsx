import { useState } from 'react';
import { Window, Slider, IconButton } from '@figma/fpl-components';
import { Icon24PlayLarge, Icon24SoundMid } from '@figma/fpl-icons';
import { Card } from '@prototype/shared';

const SECTIONS = [
  {
    id: 'timer',
    name: 'Timer',
    description: '5 minute countdown',
  },
  {
    id: 'music',
    name: 'Music',
    description: 'Acoustic ambient',
  },
  {
    id: 'voting',
    name: 'Voting',
    description: 'Create and share polls',
  },
];

interface TimerPanelProps {
  onClose: () => void;
}

export function TimerPanel({ onClose }: TimerPanelProps) {
  const [volume, setVolume] = useState(80)
  return (
    <Window.Root
      width={240}
      defaultPosition={{ right: 12, top: 72 }}
      onClose={onClose}
      draggable="header"
    >
      <Window.Contents>
        <Window.Header>
          <Window.Title>Timer, music, and voting</Window.Title>
        </Window.Header>

        <Window.Body>
          {/* Volume control */}
          <div className="flex items-center gap-1 pt-1 pb-3">
            <Icon24SoundMid className="text-icon shrink-0" />
            <Slider
              min={0}
              max={100}
              step={1}
              bigStep={10}
              value={volume}
              onChange={setVolume}
              aria-label="Range slider"
            />
          </div>

          <div className="border-t border-border -mx-4 mb-3" />

          {/* Cards */}
          <div className="flex flex-col gap-1 -mx-2">
            {SECTIONS.map((section) => (
              <Card
                key={section.id}
                label={section.name}
                subtext={section.description}
                onClick={() => console.log(`Section clicked: ${section.name}`)}
                trailing={
                  <IconButton aria-label="button" variant="primaryCircle" size="lg">
                    <Icon24PlayLarge />
                  </IconButton>
                }
              >
                <div className="overflow-hidden border border-border rounded-md aspect-[16/9] bg-bg-secondary flex items-center justify-center">
                  <span className="text-bodyMd text-text-tertiary">{section.name}</span>
                </div>
              </Card>
            ))}
          </div>
        </Window.Body>
      </Window.Contents>
    </Window.Root>
  );
}
