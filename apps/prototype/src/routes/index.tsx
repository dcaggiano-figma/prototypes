import { createFileRoute } from '@tanstack/react-router';

function CanvasPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-text-tertiary text-bodySm select-none">
        {/* Canvas / Main content area */}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: CanvasPage,
});
