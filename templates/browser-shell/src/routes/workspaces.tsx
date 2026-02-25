import { createFileRoute } from '@tanstack/react-router';
import WorkspacesPage from '../pages/WorkspacesPage';

export const Route = createFileRoute('/workspaces')({
  component: WorkspacesPage,
});
