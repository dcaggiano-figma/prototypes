import { createFileRoute } from '@tanstack/react-router';
import PeoplePage from '../pages/PeoplePage';

export const Route = createFileRoute('/people')({
  component: PeoplePage,
});
