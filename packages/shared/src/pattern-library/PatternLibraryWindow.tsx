import { useCallback, useState } from 'react';
import { Window } from '@figma/fpl-components';
import { RECIPE_REGISTRY } from './recipeRegistry';
import { PatternLibrarySidebar } from './PatternLibrarySidebar';
import { PatternLibraryDetail } from './PatternLibraryDetail';

interface PatternLibraryWindowProps {
  onClose: () => void;
}

export function PatternLibraryWindow({ onClose }: PatternLibraryWindowProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    RECIPE_REGISTRY[0]?.id ?? '',
  );

  const selectedRecipe = RECIPE_REGISTRY.find((r) => r.id === selectedRecipeId) ?? null;

  const handleSelect = useCallback((id: string) => {
    setSelectedRecipeId(id);
  }, []);

  return (
    <Window.ResizableRoot
      onClose={onClose}
      defaultPosition={{ x: 'center', y: 'center' }}
      defaultWidth={900}
      defaultHeight={650}
      constraints={{ minWidth: 700, minHeight: 450 }}
    >
      <Window.Contents>
        <Window.Header>
          <Window.Title>Pattern library</Window.Title>
        </Window.Header>
        <Window.Sidebar width={220} className="grid grid-rows-[auto_1fr]">
          <PatternLibrarySidebar
            recipes={RECIPE_REGISTRY}
            onSelect={handleSelect}
          />
        </Window.Sidebar>
        <Window.Body>
          <PatternLibraryDetail recipe={selectedRecipe} />
        </Window.Body>
      </Window.Contents>
    </Window.ResizableRoot>
  );
}
