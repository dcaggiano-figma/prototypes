import { Badge, Link } from '@figma/fpl-components';
import type { Recipe } from './types';
import { CATEGORY_LABELS } from './types';
import { PatternLibraryCodeBlock } from './PatternLibraryCodeBlock';

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
      <div className="flex flex-col gap-1.5">
        <span className="text-text text-headingSm pb-2.5">Components used</span>
        <div className="flex flex-wrap gap-2">
          {recipe.components.map((comp) => (
            <span key={comp.name}>
              {comp.docsUrl ? (
                <Link href={comp.docsUrl} target="_blank">
                  <Badge variant={comp.source === 'fpl' ? 'componentOutline' : 'brandOutline'}>
                    {comp.name}
                  </Badge>
                </Link>
              ) : (
                <Badge variant={comp.source === 'fpl' ? 'componentOutline' : 'brandOutline'}>
                  {comp.name}
                </Badge>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Examples */}
      {recipe.examples.map((example) => (
        <div key={example.label} className="flex flex-col gap-2.5">
          <span className="text-text text-headingSm">Recipe: <span className="text-text-secondary">{example.label}</span></span>
          <div className="border border-border rounded-lg bg-bg">
            <div className="p-4">
              {example.render()}
            </div>
            <PatternLibraryCodeBlock code={example.code} />
          </div>
        </div>
      ))}
    </div>
  );
}
