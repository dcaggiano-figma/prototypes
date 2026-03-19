import { Badge } from '@figma/fpl-components';
import type { Recipe, ComponentRef } from './types';
import { CATEGORY_LABELS } from './types';
import { PatternLibraryCodeBlock } from './PatternLibraryCodeBlock';
import { Text } from '../typography';

function ComponentBadgeList({ label, components, variant }: { label: string; components: ComponentRef[]; variant: 'componentOutline' | 'brandOutline' }) {
  if (components.length === 0) return null;
  return (
    <div className="flex gap-2">
      <div className="w-[48px]"><Text color="secondary">{label}:</Text></div>
      <div className="flex flex-wrap gap-2">
        {components.map((comp) => (
          <Badge key={comp.name} variant={variant}>
            {comp.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface PatternLibraryDetailProps {
  recipe: Recipe | null;
}

export function PatternLibraryDetail({ recipe }: PatternLibraryDetailProps) {
  if (!recipe) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-tertiary text-bodyMd">
        Select a recipe from the sidebar
      </div>
    );
  }

  const fplComponents = recipe.components.filter((c) => c.source === 'fpl');
  const sharedComponents = recipe.components.filter((c) => c.source === 'shared');

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h2 className="text-text text-headingLg">{recipe.name}</h2>
          <Badge variant="defaultOutline">{CATEGORY_LABELS[recipe.category]}</Badge>
        </div>

        {/* Description */}
        <p className="text-text-secondary text-bodyLg">{recipe.description}</p>
      </div>

      {/* Components used */}
      <div className="flex flex-col gap-2.5 pb-2">
        <span className="text-text text-headingSm">Components used</span>
        <ComponentBadgeList label="FPL" components={fplComponents} variant="componentOutline" />
        <ComponentBadgeList label="Shared" components={sharedComponents} variant="brandOutline" />
      </div>

      {/* Examples */}
      {recipe.examples.map((example) => (
        <div key={example.label} className="flex flex-col gap-2.5">
          <span className="text-text text-headingSm">Recipe: <span className="text-text-secondary">{example.label}</span></span>
          <div className="border border-border rounded-lg bg-bg">
            <div className="p-4 flex justify-center">
              {example.render()}
            </div>
            <PatternLibraryCodeBlock code={example.code} />
          </div>
        </div>
      ))}
    </div>
  );
}
