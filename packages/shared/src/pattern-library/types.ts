import type { ReactNode } from 'react';

export type RecipeCategory = 'ai' | 'data-display' | 'feedback' | 'forms' | 'interactions' | 'layout' | 'navigation' | 'overlays' | 'progress' | 'property-panels' | 'toolbars';

export interface RecipeExample {
  label: string;
  render: () => ReactNode;
  code: string;
}

export interface ComponentRef {
  name: string;
  source: 'fpl' | 'shared';
  docsUrl?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  description: string;
  components: ComponentRef[];
  examples: RecipeExample[];
  tags: string[];
}

export const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  ai: 'AI',
  'data-display': 'Data Display',
  feedback: 'Feedback & messages',
  forms: 'Forms',
  interactions: 'Interactions',
  layout: 'Layout & content',
  navigation: 'Navigation',
  overlays: 'Overlays',
  progress: 'Progress',
  'property-panels': 'Property Panels',
  toolbars: 'Toolbars',
};
