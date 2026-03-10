import { createFileRoute } from '@tanstack/react-router';
import { WorkingPage } from '../pages/WorkingPage';

export const Route = createFileRoute('/working')({
  component: WorkingPage,
});
