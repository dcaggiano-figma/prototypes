import { Button, ButtonPrimitive } from '@figma/fpl-components';
import { Icon24Text } from '@figma/fpl-icons';

const PLACEHOLDER_SQUARES = Array.from({ length: 4 });

export function TextPanel() {
  return (
    <div className="flex flex-col">
      <div className="px-3 pt-2.5 pb-3 border-b border-border flex flex-col gap-3">
        <span className="text-bodyLgStrong text-text h-4 flex items-center">Text</span>
        <Button variant="secondary" width='fill' iconPrefix={<Icon24Text />}>Add text box</Button>
      </div>
      <div className="grid grid-cols-1 gap-8px p-3">
        {PLACEHOLDER_SQUARES.map((_, i) => (
          <ButtonPrimitive
            key={i}
            className="rounded-md bg-bg-secondary text-bodyLg text-text hover:border-border border border-bg-secondary active:bg-bg-pressed"
            aria-label={`Text style ${i + 1}`}
          ><div className="px-3 py-2 h-full w-full flex items-center">Text</div></ButtonPrimitive>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-8px p-3">
        <span className="text-bodyMdStrong text-text-secondary col-span-2 py-1">Font combinations</span>
        {PLACEHOLDER_SQUARES.map((_, i) => (
          <ButtonPrimitive
            key={i}
            className="aspect-square rounded-md bg-bg-secondary text-bodyLg text-text hover:border-border hover:border active:bg-bg-pressed"
            aria-label={`Text style ${i + 1}`}
          ><div className="p-2 h-full w-full flex items-center justify-center">Text</div></ButtonPrimitive>
        ))}
      </div>
    </div>
  );
}
