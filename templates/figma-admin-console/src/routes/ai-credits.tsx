import { createFileRoute } from '@tanstack/react-router';
import AiCreditsPage from '../pages/AiCreditsPage';

export const Route = createFileRoute('/ai-credits')({
  component: AiCreditsPage,
});
