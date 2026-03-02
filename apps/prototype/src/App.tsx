import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

const hashHistory = createHashHistory();

const router = createRouter({ routeTree, history: hashHistory });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return <RouterProvider router={router} />;
}

export default App;
