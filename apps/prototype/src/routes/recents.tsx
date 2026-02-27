import { createFileRoute } from '@tanstack/react-router';
import RecentsPage from '../pages/RecentsPage';

export const Route = createFileRoute('/recents')({
  component: RecentsPage,
});
