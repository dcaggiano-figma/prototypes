import { createFileRoute } from '@tanstack/react-router';

function HomePage() {
  return (
    <div className="bg-bg min-h-screen flex items-center justify-center">
      <h1 className="text-text text-headingLg">Hello World</h1>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});
