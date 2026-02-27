import { createFileRoute } from '@tanstack/react-router';
import DraftsPage from '../pages/DraftsPage';

export const Route = createFileRoute('/drafts')({
  component: DraftsPage,
});
