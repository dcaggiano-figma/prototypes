import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router';
import type { Attachment, InspectedElement } from '@prototype/shared';
import { routeTree } from './routeTree.gen';

const hashHistory = createHashHistory();

const router = createRouter({ routeTree, history: hashHistory });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }

  interface HistoryState {
    section?: string;
    prompt?: string;
    attachments?: Attachment[];
    inspectedElements?: InspectedElement[];
  }
}

function App() {
  return <RouterProvider router={router} />;
}

export default App;
