import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Button,
  IconButton,
} from '@figma/fpl-components';
import { Card } from '@prototype/shared';
import {
  Icon24ArrowLeft,
  Icon24ArrowRight,
} from '@figma/fpl-icons';
import { type PromptSubmission } from '@prototype/shared';
import { PromptLanding } from '../../components/PromptLanding';

/* ------------------------------------------------------------------ */
/*  Card data                                                          */
/* ------------------------------------------------------------------ */

const CARDS = [
  {
    id: 'example-1',
    title: 'Example 1',
    subtitle: 'By Dylan Field',
  },
  {
    id: 'example-2',
    title: 'Example 2',
    subtitle: 'By Dylan Field',
  },
  {
    id: 'example-3',
    title: 'Example 3',
    subtitle: 'By Dylan Field',
  },
];

/* ------------------------------------------------------------------ */
/*  Home page (/)                                                       */
/* ------------------------------------------------------------------ */

function HomePage() {
  const navigate = useNavigate();
  const [promptValue, setPromptValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('default');

  const handlePromptSubmit = (submission: PromptSubmission) => {
    if (!submission.text.trim()) return;
    navigate({
      to: '/working',
      state: {
        prompt: submission.text.trim(),
        attachments: submission.attachments,
        inspectedElements: submission.inspectedElements,
      },
    });
    setPromptValue('');
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-24px pb-40px gap-24px">
      {/* Prompt box */}
      <div className="w-full max-w-[800px] flex flex-col gap-5 items-center">
        <div className="flex flex-col gap-5 py-5 items-center w-full max-w-[680px]">
          <h1 className="text-headingLg text-text text-center">What do you want to make?</h1>
          <PromptLanding
            value={promptValue}
            onChange={setPromptValue}
            onSubmit={handlePromptSubmit}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            autoFocus
          />
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-2 w-full">
          <div className="flex justify-between gap-2 px-2">
            <span className="text-bodyLg text-text">Start from examples</span>
            <div className="flex items-center gap-3">
              <Button variant="link" aria-label="See more"><span className="text-bodyLg">See more</span></Button>
              <div className="flex items-center gap-1">
                <IconButton aria-label="Backward"><Icon24ArrowLeft /></IconButton>
                <IconButton aria-label="Forward"><Icon24ArrowRight /></IconButton>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
            {CARDS.map((card) => (
              <Card
                key={card.id}
                size="lg"
                label={card.title}
                subtext={card.subtitle}
                onClick={() => console.log(card.id)}
              >
                <div className="overflow-hidden border border-border rounded-lg aspect-[16/9] bg-bg-secondary" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute('/_home/')({
  component: HomePage,
});
